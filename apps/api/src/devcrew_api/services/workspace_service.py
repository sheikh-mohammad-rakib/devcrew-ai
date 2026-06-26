"""Workspace service layer.

The service layer sits between the HTTP route handlers and the
SQLAlchemy session. It owns **transaction boundaries** (``commit`` /
``rollback``) and translates ORM-level "row missing" into typed
exceptions the API layer can map to HTTP status codes.

Why a service layer at all?
* Route handlers stay small and declarative.
* Business rules are unit-testable without spinning up FastAPI.
* The same service can be reused by background jobs, CLI scripts, or
  other transports without duplicating logic.

Scope (Sprint 3)
----------------
This iteration exposes only the operations the new API needs:

* ``create(payload)`` — INSERT a new row.
* ``get(workspace_id)`` — SELECT by id (raises ``WorkspaceNotFoundError``).
* ``list(skip, limit)`` — offset-paginated SELECT, newest first.

Update and delete operations are intentionally NOT included; they will
land in a later sprint.

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

from devcrew_api.models.workspace import Workspace
from devcrew_api.schemas.workspace import WorkspaceCreate


class WorkspaceServiceError(Exception):
    """Base class for workspace-service exceptions."""


class WorkspaceNotFoundError(WorkspaceServiceError):
    """Raised when a workspace lookup by id fails."""

    def __init__(self, workspace_id: uuid.UUID) -> None:
        super().__init__(f"Workspace not found: {workspace_id}")
        self.workspace_id = workspace_id


class WorkspaceService:
    """CRUD operations for :class:`Workspace`.

    Stateless and instantiated per-request by the API layer (or
    directly in tests). All methods receive an explicit ``Session``;
    the service does **not** hold onto one.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    # ------------------------------------------------------------------ create
    def create(self, payload: WorkspaceCreate) -> Workspace:
        """Persist a new workspace.

        Returns the freshly-created ORM instance with ``id``,
        ``created_at`` and ``updated_at`` populated by the database.
        """
        workspace = Workspace(
            name=payload.name,
            description=payload.description,
        )
        self._db.add(workspace)
        self._db.commit()
        self._db.refresh(workspace)
        return workspace

    # --------------------------------------------------------------------- get
    def get(self, workspace_id: uuid.UUID) -> Workspace:
        """Fetch a single workspace by id.

        Raises
        ------
        WorkspaceNotFoundError
            If no workspace matches ``workspace_id``.
        """
        workspace = self._db.get(Workspace, workspace_id)
        if workspace is None:
            raise WorkspaceNotFoundError(workspace_id)
        return workspace

    # -------------------------------------------------------------------- list
    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[Workspace]:
        """List workspaces with offset pagination, newest first.

        Parameters
        ----------
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
            select(Workspace)
            .order_by(Workspace.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return self._db.execute(stmt).scalars().all()

    def count(self) -> int:
        """Total workspace count — useful for paginated UIs."""
        stmt = select(func.count()).select_from(Workspace)
        return int(self._db.execute(stmt).scalar_one())


__all__: list[str] = [
    "WorkspaceNotFoundError",
    "WorkspaceService",
    "WorkspaceServiceError",
]
