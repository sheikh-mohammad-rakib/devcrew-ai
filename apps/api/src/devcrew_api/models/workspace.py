"""SQLAlchemy ORM model for the ``Workspace`` aggregate.

This module defines the Workspace table and the parent-side of the
one-to-many relationship with :class:`Project`. The project-side
relationship is defined in :mod:`devcrew_api.models.project` and
references this class via ``back_populates``.

Design notes
------------
* Inherits :class:`UUIDPrimaryKeyMixin` so every row is identified by a
  globally-unique UUID v4. UUIDs are URL-safe (no integer-enumeration
  leaks) and safe to generate client-side if we ever need it.
* Inherits :class:`TimestampMixin` so every row carries ``created_at``
  and ``updated_at`` populated by the database (``func.now()``).
* ``name`` is required and capped at 100 characters — short enough to
  fit comfortably in UI lists and longer-than-typical email-style
  display names.
* ``description`` is optional (``nullable=True``) and unlimited-length
  ``Text`` so users can attach longer briefs.
* ``projects`` is the inverse side of the ``Workspace → Projects``
  one-to-many. ``cascade="all, delete-orphan"`` ensures removing a
  Project from the collection (e.g. via ``workspace.projects.remove(p)``
  or assigning a new list) deletes the orphan row.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from devcrew_api.db import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    # Imported only for type-checking to avoid a runtime cycle
    # (``project`` imports ``Workspace`` for ``back_populates``).
    from devcrew_api.models.project import Project


class Workspace(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A DevCrew workspace — the top-level engagement container."""

    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    # ----------------------------------------------------------- relationships
    # The inverse side of ``Project.workspace``. We use the collection
    # pattern (``List["Project"]``) so future helpers can iterate /
    # mutate the children in-process if needed.
    projects: Mapped[List["Project"]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        # ``lazy="raise"`` surfaces accidental lazy loads as errors
        # during development. Endpoints that need the children should
        # opt-in via an explicit ``selectinload`` in the service.
        lazy="raise",
        # Order the collection so callers iterating ``workspace.projects``
        # see a stable ordering without an explicit ``.order_by(...)``.
        order_by="Project.created_at.desc()",
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Workspace id={self.id} name={self.name!r}>"


__all__: list[str] = ["Workspace"]