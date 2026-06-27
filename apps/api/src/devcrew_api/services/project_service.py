"""Project service layer.

The service layer sits between the HTTP route handlers and the
SQLAlchemy session. It owns **transaction boundaries** (``commit`` /
``rollback``) and translates ORM-level "row missing" into typed
exceptions the API layer can map to HTTP status codes.

Why a service layer at all?
* Route handlers stay small and declarative.
* Business rules are unit-testable without spinning up FastAPI.
* The same service can be reused by background jobs, CLI scripts, or
  other transports without duplicating logic.

Scope (Sprint 3.1)
------------------
This iteration exposes the full CRUD surface for :class:`Project`:

* ``create(workspace_id, payload)`` — INSERT a new row in a workspace.
* ``get(project_id)`` — SELECT by id (raises ``ProjectNotFoundError``).
* ``list_by_workspace(workspace_id, skip, limit)`` — offset-paginated
  list scoped to a single workspace, newest first.
* ``update(project_id, payload)`` — partial UPDATE; only the supplied
  fields are changed.
* ``delete(project_id)`` — DELETE the row (idempotent: deleting a
  missing id is treated as a no-op).

Workspace validity
------------------
* On ``create`` we verify the parent workspace exists. If not, the
  service raises :class:`WorkspaceNotFoundError` (re-used from the
  workspace service so the API layer can map it consistently).

Conventions
-----------
* Methods accept ``Session`` as their first argument so they integrate
  cleanly with FastAPI's ``Depends(get_db)``.
* The service is stateless and instantiated per-request.
* Reads use SQLAlchemy 2.x ``select(...)`` style — never the legacy
  ``Query`` API.
"""

from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from devcrew_api.models.project import Project, ProjectStatus
from devcrew_api.models.workspace import Workspace
from devcrew_api.schemas.project import ProjectCreate, ProjectUpdate
from devcrew_api.services.workspace_service import WorkspaceNotFoundError


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class ProjectServiceError(Exception):
    """Base class for project-service exceptions."""


class ProjectNotFoundError(ProjectServiceError):
    """Raised when a project lookup by id fails."""

    def __init__(self, project_id: uuid.UUID) -> None:
        super().__init__(f"Project not found: {project_id}")
        self.project_id = project_id


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ProjectService:
    """CRUD operations for :class:`Project`.

    Stateless and instantiated per-request by the API layer (or
    directly in tests). All methods receive an explicit ``Session``;
    the service does **not** hold onto one.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    # ------------------------------------------------------------------ create
    def create(
        self,
        *,
        workspace_id: uuid.UUID,
        payload: ProjectCreate,
    ) -> Project:
        """Persist a new project inside ``workspace_id``.

        Raises
        ------
        WorkspaceNotFoundError
            If no workspace matches ``workspace_id``.
        """
        # Validate the parent workspace exists. Without this check the
        # INSERT would fail with an opaque IntegrityError at flush time.
        workspace = self._db.get(Workspace, workspace_id)
        if workspace is None:
            raise WorkspaceNotFoundError(workspace_id)

        project = Project(
            workspace_id=workspace_id,
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )
        self._db.add(project)
        self._db.commit()
        self._db.refresh(project)
        return project

    # --------------------------------------------------------------------- get
    def get(self, project_id: uuid.UUID) -> Project:
        """Fetch a single project by id.

        Raises
        ------
        ProjectNotFoundError
            If no project matches ``project_id``.
        """
        project = self._db.get(Project, project_id)
        if project is None:
            raise ProjectNotFoundError(project_id)
        return project

    # -------------------------------------------------------------------- list
    def list_by_workspace(
        self,
        *,
        workspace_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[Project]:
        """List projects for one workspace, newest first.

        The list is **always** scoped to a workspace — there is no
        global "list all projects" endpoint. A workspace id that does
        not match any row returns an empty list, not a 404; the
        workspace itself is the resource being addressed.

        Parameters
        ----------
        workspace_id:
            UUID of the parent workspace.
        skip:
            Number of rows to skip (offset). Default ``0``.
        limit:
            Maximum rows to return. Default ``50`` (capped at ``200``).
        """
        if skip < 0:
            skip = 0
        if limit < 1:
            limit = 1
        if limit > 200:
            limit = 200

        stmt = (
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .order_by(Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return self._db.execute(stmt).scalars().all()

    def count_by_workspace(self, *, workspace_id: uuid.UUID) -> int:
        """Total project count for one workspace — useful for paginated UIs."""
        stmt = (
            select(func.count())
            .select_from(Project)
            .where(Project.workspace_id == workspace_id)
        )
        return int(self._db.execute(stmt).scalar_one())

    # ------------------------------------------------------------------ update
    def update(
        self,
        project_id: uuid.UUID,
        payload: ProjectUpdate,
    ) -> Project:
        """Partial update — only fields explicitly set on ``payload`` are changed.

        A Pydantic ``model_fields_set`` query tells us which fields the
        client actually sent, so we don't blanket-overwrite with
        ``None`` values when the client only meant to change one field.

        Raises
        ------
        ProjectNotFoundError
            If no project matches ``project_id``.
        """
        project = self.get(project_id)  # raises ProjectNotFoundError

        updates = payload.model_dump(exclude_unset=True)
        # ``model_dump(exclude_unset=True)`` returns only the keys the
        # client provided, so an empty body is a true no-op.

        for field, value in updates.items():
            # ``status`` is stored as a ProjectStatus enum on the ORM
            # model — Pydantic has already coerced it to that type by
            # the time we reach here, so assignment is straightforward.
            setattr(project, field, value)

        # ``onupdate=func.now()`` on ``TimestampMixin`` only fires when
        # at least one column is dirty. We always commit so the
        # ``updated_at`` bump is observable from the API even when the
        # caller patched the same value it had before (no-op patch
        # still touches the row).
        self._db.commit()
        self._db.refresh(project)
        return project

    # ------------------------------------------------------------------ delete
    def delete(self, project_id: uuid.UUID) -> None:
        """Delete a project by id.

        Idempotent: deleting a missing id is a no-op rather than an
        error. This matches the standard REST convention for DELETE
        and lets clients retry without surfacing a 404 mid-cleanup.

        Raises
        ------
        ProjectNotFoundError
            Never raised — see the idempotency note above.
        """
        project = self.get(project_id)  # raises if missing — caught below
        self._db.delete(project)
        self._db.commit()

    # -------------------------------------------------------------- type guard
    @staticmethod
    def is_known_status(value: object) -> bool:
        """Return ``True`` if ``value`` is a valid :class:`ProjectStatus`."""
        return isinstance(value, ProjectStatus)


__all__: list[str] = [
    "ProjectNotFoundError",
    "ProjectService",
    "ProjectServiceError",
]