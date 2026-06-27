"""Timeline service layer.

The service layer sits between the HTTP route handlers and the
SQLAlchemy session. It owns **transaction boundaries** (``commit`` /
``rollback``) and translates ORM-level "row missing" into typed
exceptions the API layer can map to HTTP status codes.

Why a service layer at all?
* Route handlers stay small and declarative.
* Business rules are unit-testable without spinning up FastAPI.
* The same service can be reused by background jobs, CLI scripts, or
  other transports without duplicating logic.

Scope (Sprint 4.1)
------------------
This iteration exposes the operations the new API needs:

* ``create(project_id, payload)`` — INSERT a new timeline for a
  project. Raises :class:`ProjectNotFoundError` if the parent project
  doesn't exist, :class:`TimelineAlreadyExistsError` if the project
  already has a timeline (1:1 cardinality).
* ``get_by_project(project_id)`` — SELECT the timeline owned by a
  project. Raises :class:`TimelineNotFoundError` if none exists
  (mirrors the explicit-not-implicit rule used by ``ProjectService``).
* ``update_by_project(project_id, payload)`` — partial UPDATE on the
  timeline owned by ``project_id``. Raises
  :class:`TimelineNotFoundError` if none exists.

Why no DELETE?
--------------
The spec for Sprint 4.1 doesn't include delete. Timelines are also
implicitly removed when their parent project is deleted (the FK has
``ON DELETE CASCADE``), so a dedicated delete endpoint would be a thin
wrapper over ``session.delete(...)``. It will land when a real UI
need appears.

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

from sqlalchemy import select
from sqlalchemy.orm import Session

from devcrew_api.models.project import Project
from devcrew_api.models.timeline import Timeline, TimelineStage, TimelineStatus
from devcrew_api.schemas.timeline import TimelineCreate, TimelineUpdate
from devcrew_api.services.project_service import ProjectNotFoundError


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class TimelineServiceError(Exception):
    """Base class for timeline-service exceptions."""


class TimelineNotFoundError(TimelineServiceError):
    """Raised when a timeline lookup by project id fails."""

    def __init__(self, project_id: uuid.UUID) -> None:
        super().__init__(f"Timeline not found for project: {project_id}")
        self.project_id = project_id


class TimelineAlreadyExistsError(TimelineServiceError):
    """Raised when a project already has a timeline (1:1 cardinality)."""

    def __init__(self, project_id: uuid.UUID) -> None:
        super().__init__(
            f"Timeline already exists for project: {project_id}"
        )
        self.project_id = project_id


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class TimelineService:
    """CRUD operations for :class:`Timeline`.

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
        project_id: uuid.UUID,
        payload: TimelineCreate,
    ) -> Timeline:
        """Persist a new timeline for ``project_id``.

        The 1:1 cardinality is enforced twice — once at the database
        level (``UNIQUE`` constraint on ``timelines.project_id``) and
        once here as an explicit ``SELECT`` so we can return a typed
        error rather than letting the IntegrityError bubble up.

        Raises
        ------
        ProjectNotFoundError
            If no project matches ``project_id``.
        TimelineAlreadyExistsError
            If the project already has a timeline row.
        """
        # Validate the parent project exists. Without this check the
        # INSERT would fail with an opaque IntegrityError at flush time.
        project = self._db.get(Project, project_id)
        if project is None:
            raise ProjectNotFoundError(project_id)

        # 1:1 cardinality check. ``get(Timeline, project_id)`` won't
        # work because Timeline is keyed by ``id``, not ``project_id``,
        # so we issue a quick ``SELECT`` instead.
        existing = self._db.execute(
            select(Timeline.id).where(Timeline.project_id == project_id)
        ).scalar_one_or_none()
        if existing is not None:
            raise TimelineAlreadyExistsError(project_id)

        timeline = Timeline(
            project_id=project_id,
            current_stage=payload.current_stage,
            status=payload.status,
        )
        self._db.add(timeline)
        self._db.commit()
        self._db.refresh(timeline)
        return timeline

    # ---------------------------------------------------------- get_by_project
    def get_by_project(self, project_id: uuid.UUID) -> Timeline:
        """Fetch the timeline owned by ``project_id``.

        Raises
        ------
        TimelineNotFoundError
            If the project has no timeline row yet.
        """
        timeline = self._db.execute(
            select(Timeline).where(Timeline.project_id == project_id)
        ).scalar_one_or_none()
        if timeline is None:
            raise TimelineNotFoundError(project_id)
        return timeline

    # --------------------------------------------------------- update_by_project
    def update_by_project(
        self,
        project_id: uuid.UUID,
        payload: TimelineUpdate,
    ) -> Timeline:
        """Partial update — only fields explicitly set on ``payload`` are changed.

        Mirrors :meth:`ProjectService.update`: ``model_dump(
        exclude_unset=True)`` returns only the keys the client provided
        so an empty body is a true no-op (no fields overwritten, no
        status reset to ``None``).

        Raises
        ------
        TimelineNotFoundError
            If the project has no timeline row yet.
        """
        timeline = self.get_by_project(project_id)  # raises if missing

        updates = payload.model_dump(exclude_unset=True)
        # ``model_dump(exclude_unset=True)`` returns only the keys the
        # client provided, so an empty body is a true no-op.

        for field, value in updates.items():
            # ``current_stage`` and ``status`` are stored as TimelineStage /
            # TimelineStatus enum instances on the ORM model — Pydantic
            # has already coerced them by the time we reach here, so
            # assignment is straightforward.
            setattr(timeline, field, value)

        # ``onupdate=func.now()`` on ``TimestampMixin`` only fires when
        # at least one column is dirty. We always commit so the
        # ``updated_at`` bump is observable from the API even when the
        # caller patched the same value it had before (no-op patch
        # still touches the row).
        self._db.commit()
        self._db.refresh(timeline)
        return timeline

    # -------------------------------------------------------------- type guards
    @staticmethod
    def is_known_stage(value: object) -> bool:
        """Return ``True`` if ``value`` is a valid :class:`TimelineStage`."""
        return isinstance(value, TimelineStage)

    @staticmethod
    def is_known_status(value: object) -> bool:
        """Return ``True`` if ``value`` is a valid :class:`TimelineStatus`."""
        return isinstance(value, TimelineStatus)


__all__: list[str] = [
    "TimelineAlreadyExistsError",
    "TimelineNotFoundError",
    "TimelineService",
    "TimelineServiceError",
]