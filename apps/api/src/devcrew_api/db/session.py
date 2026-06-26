"""SQLAlchemy engine, session factory, and FastAPI dependency.

This module is intentionally thin: it wires the :class:`Base` declared
in :mod:`devcrew_api.db.base` to a real engine connected to Neon
PostgreSQL and exposes a ``SessionLocal`` factory + a small ``get_db``
helper for FastAPI dependency injection.

The split between ``base.py`` (declarative class + mixins) and
``session.py`` (engine + session lifecycle) follows the standard
SQLAlchemy 2.x project layout:

* ``base.py`` is safe to import from Alembic (it has no engine
  side-effects beyond declaring ``Base.metadata``).
* ``session.py`` creates the engine and is the place to put
  connection-pool tuning and runtime concerns.
"""

from __future__ import annotations

from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from devcrew_api.core.config import get_settings
from devcrew_api.db.base import Base

# ``get_settings`` is ``lru_cache``-decorated, so calling it at module
# import time is cheap and ensures the engine is built with the
# resolved ``DATABASE_URL`` from ``.env``.
settings = get_settings()


def _build_engine(url: str) -> Engine:
    """Create the SQLAlchemy engine with production-friendly defaults.

    Notes on the chosen options:

    * ``pool_pre_ping=True`` — issues a cheap ``SELECT 1`` before
      reusing a connection from the pool. Critical for Neon, which can
      close idle connections between requests.
    * ``pool_recycle=1800`` — recycle connections every 30 minutes,
      which is comfortably below Neon's typical idle-disconnect window
      and keeps the pool healthy.
    * ``future=True`` — opt into the SQLAlchemy 2.x execution style.
      This is the default in 2.x but stated explicitly for clarity.
    * ``echo`` is read from the environment via settings (so it can be
      toggled through ``.env`` without code changes).
    """
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=1800,
        echo=getattr(settings, "sqlalchemy_echo", False),
        future=True,
    )


# The single, application-wide engine. Importing modules should depend
# on this symbol rather than creating their own engines.
engine: Engine = _build_engine(settings.database_url)

# ``SessionLocal`` is a configured, but not yet created, session
# factory. ``autoflush=False`` avoids implicit flushes during query
# evaluation, which can mask transaction bugs. ``autocommit=False`` is
# the SQLAlchemy default but stated explicitly to make the contract
# clear: callers manage transactions explicitly.
SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
)


def get_db() -> Generator[Session, Any, None]:
    """FastAPI dependency that yields a SQLAlchemy session.

    Usage::

        @router.get("/things")
        def list_things(db: Session = Depends(get_db)):
            ...

    The session is closed automatically when the request finishes —
    even if the handler raises — thanks to the ``try/finally`` block.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Re-export ``Base`` so existing imports like
# ``from devcrew_api.db.session import Base`` keep working.
__all__: list[str] = [
    "Base",
    "SessionLocal",
    "engine",
    "get_db",
]
