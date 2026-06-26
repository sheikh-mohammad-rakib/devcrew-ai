"""Reusable SQLAlchemy 2.x declarative base and column mixins.

This module is the single source of truth for:

* The project's declarative :class:`Base` class, which every ORM model
  must inherit from so that Alembic's autogenerate can discover them.
* Reusable column mixins that codify project-wide conventions:
    - :class:`UUIDPrimaryKeyMixin` — UUID v4 primary key column.
    - :class:`TimestampMixin`       — ``created_at`` / ``updated_at`` columns
      that are populated automatically by SQLAlchemy events.

Why mixins?
-----------
SQLAlchemy 2.x recommends composing columns through mixins to keep
models DRY and to enforce consistent semantics (e.g. every table has
``id`` as a UUID and every row has creation/update timestamps).

The mixins below use ``Mapped[...]`` / ``mapped_column(...)`` syntax —
the modern, type-safe style — so editor tooling and mypy can reason
about column types correctly.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all DevCrew AI ORM models.

    Every model MUST inherit from this class so that all metadata is
    collected into ``Base.metadata``. Alembic is configured to point at
    this metadata object for autogeneration.

    Using ``DeclarativeBase`` (the SQLAlchemy 2.x style) instead of the
    legacy ``declarative_base()`` function gives us first-class support
    for ``Mapped[...]`` annotations and the new typing model.
    """


class UUIDPrimaryKeyMixin:
    """Mixin that adds a UUID v4 primary key column named ``id``.

    Implementation notes:

    * ``default=uuid.uuid4`` generates the value in Python on INSERT —
      this works across all databases without requiring server-side
      extensions like ``uuid-ossp`` or ``pgcrypto``.
    * ``primary_key=True`` already implies uniqueness and
      ``nullable=False``; declaring them again would only confuse
      Alembic's autogenerate (it would emit a redundant
      ``UniqueConstraint``), so we leave them implicit.
    * The column is typed as native PostgreSQL ``UUID`` on PostgreSQL
      and falls back to a portable string-like representation on other
      dialects thanks to SQLAlchemy's dialect-aware type resolution.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


class TimestampMixin:
    """Mixin that adds ``created_at`` and ``updated_at`` timestamp columns.

    Both columns:

    * Are timezone-aware (``DateTime(timezone=True)``).
    * Default to the database's ``CURRENT_TIMESTAMP`` via
      ``func.now()`` so the value is set by the DB even when the row is
      inserted through raw SQL.
    * Are populated server-side, which is the most reliable approach
      for multi-process / multi-instance deployments.

    Notes on ``updated_at``:

    * ``onupdate=func.now()`` tells SQLAlchemy to issue an UPDATE that
      sets this column to ``CURRENT_TIMESTAMP`` whenever the row is
      updated through the ORM.
    * We intentionally do NOT rely on a database-level trigger so that
      schema stays portable and easy to reason about.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


__all__: list[str] = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
]
