"""Workspace service layer.

The service layer sits between the HTTP route handlers and the
SQLAlchemy session. It owns **business rules** (uniqueness,
slug-conflict detection, validation that depends on multiple rows) and
**transaction boundaries** (``commit`` / ``rollback``).

Why a service layer at all?
* Route handlers stay small and declarative.
* Business rules are unit-testable without spinning up FastAPI.
* The same service can be reused by background jobs, CLI scripts, or
  other transports without duplicating logic.

Conventions used here
---------------------
* Methods accept ``Session`` as their first argument so they integrate
  cleanly with FastAPI's ``Depends(get_db)``.
* The service raises :class:`WorkspaceNotFoundError` /
  :class:`WorkspaceSlugConflictError` instead of returning ``None`` or
  raw SQLAlchemy errors — the API layer maps these to proper HTTP
  status codes.
* Reads use SQLAlchemy 2.x ``select(...)`` style — never the legacy
  ``Query`` API.
"""

from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from devcrew_api.models.workspace import Workspace
from devcrew_api.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


class WorkspaceServiceError(Exception):
    """Base class for workspace-service exceptions."""


class WorkspaceNotFoundError(WorkspaceServiceError):
    """Raised when a workspace lookup by id or slug fails."""

    def __init__(self, identifier: str | uuid.UUID) -> None:
        super().__init__(f"Workspace not found: {identifier}")
        self.identifier = identifier


class WorkspaceSlugConflictError(WorkspaceServiceError):
    """Raised when ``slug`` uniqueness is violated."""

    def __init__(self, slug: str) -> None:
        super().__init__(f"Workspace slug already exists: {slug}")
        self.slug = slug


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
        ``created_at`` and ``updated_at`` populated.

        Raises
        ------
        WorkspaceSlugConflictError
            If a workspace with the same ``slug`` already exists.
        """
        workspace = Workspace(
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            is_active=True,
        )
        self._db.add(workspace)
        try:
            self._db.commit()
        except IntegrityError as exc:
            self._db.rollback()
            # ``slug`` has a UNIQUE constraint, so any IntegrityError here
            # is almost certainly a slug collision. Translate to a typed
            # exception the API layer understands.
            raise WorkspaceSlugConflictError(payload.slug) from exc
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

    def get_by_slug(self, slug: str) -> Workspace:
        """Fetch a single workspace by slug.

        Raises
        ------
        WorkspaceNotFoundError
            If no workspace matches ``slug``.
        """
        stmt = select(Workspace).where(Workspace.slug == slug)
        workspace = self._db.execute(stmt).scalar_one_or_none()
        if workspace is None:
            raise WorkspaceNotFoundError(slug)
        return workspace

    # -------------------------------------------------------------------- list
    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        active_only: bool = False,
    ) -> Sequence[Workspace]:
        """List workspaces with offset pagination.

        Parameters
        ----------
        skip:
            Number of rows to skip (offset). Default ``0``.
        limit:
            Maximum rows to return. Default ``50`` (cap: ``200``).
        active_only:
            If ``True``, exclude soft-deleted (``is_active=False``) rows.
        """
        if limit < 1:
            limit = 1
        if limit > 200:
            limit = 200

        stmt = select(Workspace).order_by(Workspace.created_at.desc())
        if active_only:
            stmt = stmt.where(Workspace.is_active.is_(True))
        stmt = stmt.offset(skip).limit(limit)
        return self._db.execute(stmt).scalars().all()

    def count(self, *, active_only: bool = False) -> int:
        """Total workspace count — useful for paginated UIs."""
        stmt = select(func.count()).select_from(Workspace)
        if active_only:
            stmt = stmt.where(Workspace.is_active.is_(True))
        return int(self._db.execute(stmt).scalar_one())

    # ------------------------------------------------------------------ update
    def update(
        self,
        workspace_id: uuid.UUID,
        payload: WorkspaceUpdate,
    ) -> Workspace:
        """Apply a partial update.

        Only fields explicitly set on ``payload`` (i.e. not ``None``)
        are touched. The returned instance is refreshed.

        Raises
        ------
        WorkspaceNotFoundError
            If the workspace does not exist.
        WorkspaceSlugConflictError
            If the new ``slug`` is already in use.
        """
        workspace = self.get(workspace_id)

        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workspace, field, value)

        try:
            self._db.commit()
        except IntegrityError as exc:
            self._db.rollback()
            raise WorkspaceSlugConflictError(
                update_data.get("slug", workspace.slug)
            ) from exc
        self._db.refresh(workspace)
        return workspace

    # ------------------------------------------------------------------ delete
    def delete(self, workspace_id: uuid.UUID) -> None:
        """Hard-delete a workspace by id.

        Soft-delete (``is_active=False``) is preferred in production;
        this method exists for completeness and tests.

        Raises
        ------
        WorkspaceNotFoundError
            If the workspace does not exist.
        """
        workspace = self.get(workspace_id)
        self._db.delete(workspace)
        self._db.commit()


__all__: list[str] = [
    "WorkspaceNotFoundError",
    "WorkspaceService",
    "WorkspaceServiceError",
    "WorkspaceSlugConflictError",
]
