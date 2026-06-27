"""SQLAlchemy ORM model for the ``Project`` aggregate.

A Project belongs to exactly one :class:`Workspace` and represents a
bounded piece of work inside that workspace (e.g. "Refactor billing
service", "Q3 mobile release"). Projects are the second-tier container
in the DevCrew hierarchy:

    Workspace 1 ──── N Projects

This module defines ONLY the Project table and its relationship back
to :class:`Workspace`. There are no service-layer glue, no business
logic — those concerns live in their own modules.

Design notes
------------
* Inherits :class:`UUIDPrimaryKeyMixin` so every project has a
  globally-unique UUID v4 identifier (URL-safe, no integer-enumeration
  leaks).
* Inherits :class:`TimestampMixin` so every row carries ``created_at``
  and ``updated_at`` populated by the database.
* ``workspace_id`` is a server-side ``ForeignKey`` to ``workspaces.id``
  with ``ON DELETE CASCADE`` — deleting a workspace drops its
  projects. We treat a Project as part of its Workspace's data; we
  don't expect to keep orphan projects around.
* ``name`` is required and capped at 100 characters, matching the
  Workspace convention so cross-feature UI lists align.
* ``description`` is optional, unlimited-length ``Text``.
* ``status`` is a Python :class:`~enum.Enum` backed by a native
  PostgreSQL ``ENUM`` (so the database enforces the allowed values).
  See :class:`ProjectStatus`.
* The inverse relationship on :class:`Workspace` is exposed via
  ``Workspace.projects`` and uses ``cascade="all, delete-orphan"`` so
  removing a project from a workspace's collection deletes the row.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from devcrew_api.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProjectStatus(str, enum.Enum):
    """Lifecycle state of a Project.

    Inheriting from ``str`` lets Pydantic v2 serialize the value as a
    plain JSON string (e.g. ``"active"``) while keeping the Python
    enum semantics inside the service layer.

    Lifecycle (informal)
    --------------------
    ``planned``     → not started, on the roadmap.
    ``active``      → currently being worked on.
    ``paused``      → temporarily on hold.
    ``completed``   → work finished, kept for reference.
    ``archived``    → no longer relevant; soft-removed from active views.

    The exact transitions are a business-logic concern handled by
    the service layer; the model only persists the value.
    """

    PLANNED = "planned"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A Project — a bounded piece of work inside a Workspace."""

    __tablename__ = "projects"

    # ---------------------------------------------------------------- FK + indexed
    # ForeignKey is created with ``ondelete="CASCADE"`` so removing a
    # Workspace also drops its Projects — we don't expect to keep
    # orphan projects around. The column itself is indexed because
    # the list endpoint filters by workspace_id on every call.
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ------------------------------------------------------------------ scalars
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    status: Mapped[ProjectStatus] = mapped_column(
        # ``native_enum=True`` makes PostgreSQL create a real
        # ``CREATE TYPE projects_status AS ENUM (...)`` column.
        # ``length=20`` matches the longest value (``"completed"``).
        SAEnum(
            ProjectStatus,
            name="project_status",
            native_enum=True,
            length=20,
            values_callable=lambda enum_cls: [m.value for m in enum_cls],
        ),
        nullable=False,
        # Default to ``PLANNED`` so a newly-created project always
        # has an explicit lifecycle state.
        default=ProjectStatus.PLANNED,
        server_default=ProjectStatus.PLANNED.value,
    )

    # ------------------------------------------------------------------ relationships
    # ``back_populates`` keeps the inverse side on :class:`Workspace`
    # in sync. We do NOT eagerly load the workspace by default — the
    # workspace is rarely needed by the projects list endpoints.
    workspace: Mapped["Workspace"] = relationship(  # noqa: F821
        back_populates="projects",
        lazy="raise",
    )

    # The parent-side of the one-to-one ``Project → Timeline`` defined
    # in :mod:`devcrew_api.models.timeline`. ``uselist=False`` is what
    # tells SQLAlchemy this is a one-to-one (and not a collection).
    #
    # ``passive_deletes=True`` tells SQLAlchemy to trust the database
    # to handle the cascade (``ON DELETE CASCADE`` on
    # ``timelines.project_id``) instead of issuing an UPDATE that
    # nulls the child's FK before the DELETE. Without this, deleting
    # the parent ``Project`` raises a ``NOT NULL`` violation when
    # SQLAlchemy tries to set the child's ``project_id`` to ``None``
    # before the cascade fires.
    timeline: Mapped["Timeline | None"] = relationship(  # noqa: F821
        back_populates="project",
        uselist=False,
        lazy="raise",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return (
            f"<Project id={self.id} workspace_id={self.workspace_id} "
            f"name={self.name!r} status={self.status.value!r}>"
        )


__all__: list[str] = ["Project", "ProjectStatus"]