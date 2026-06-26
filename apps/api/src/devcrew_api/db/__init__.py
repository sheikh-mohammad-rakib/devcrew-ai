"""Database package for DevCrew AI.

This package is the public entrypoint for everything database-related:

* :class:`Base` — the SQLAlchemy declarative base every model inherits from.
* :class:`UUIDPrimaryKeyMixin`, :class:`TimestampMixin` — reusable
  column mixins that codify project conventions.
* :data:`engine`, :data:`SessionLocal` — the application-wide engine and
  session factory.
* :func:`get_db` — FastAPI dependency that yields a per-request session.

Importing from this package (rather than reaching into ``session.py``
or ``base.py``) keeps call sites resilient to internal refactors.
"""

from devcrew_api.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from devcrew_api.db.session import SessionLocal, engine, get_db

__all__ = [
    "Base",
    "SessionLocal",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "engine",
    "get_db",
]
