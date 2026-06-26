"""SQLAlchemy ORM model for the ``Workspace`` aggregate.

This module defines ONLY the Workspace table. It intentionally has no
relationships and no service-layer glue — those concerns live in their
own modules.

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
"""

from __future__ import annotations

import uuid

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from devcrew_api.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


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

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Workspace id={self.id} name={self.name!r}>"


__all__: list[str] = ["Workspace"]