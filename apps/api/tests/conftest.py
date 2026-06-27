"""Shared pytest fixtures for the backend test suite.

Strategy
--------
* Use an **SQLite in-memory** database per test session. SQLite keeps
  tests fast, hermetic, and dependency-free — no live PostgreSQL
  required. We pay one price: SQLAlchemy's native PostgreSQL-only
  types (e.g. ``UUID`` from ``sqlalchemy.dialects.postgresql``) need
  to be replaceable. SQLite stores UUID values as strings under the
  hood, which is fine for our model — we just don't get the strict
  UUID validation the production database would.
* Each test gets a fresh DB schema (``Base.metadata.create_all``)
  and a fresh session, so tests are fully isolated.
* FastAPI's ``dependency_overrides`` redirects ``get_db`` to the test
  session factory, so endpoint tests exercise the real router code
  path with the real dependency-injection machinery.

The fixtures exposed:

* ``db_engine`` (session scope) — one in-memory engine per test run.
* ``db_session`` (function scope) — a fresh session per test.
* ``client`` (function scope) — a FastAPI ``TestClient`` with the
  ``get_db`` override already wired.
* ``make_workspace`` / ``make_project`` — tiny factories that
  persist the parent entities so test setup stays one-liners.
"""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from devcrew_api.db import Base, get_db
from devcrew_api.main import app
from devcrew_api.models.project import Project, ProjectStatus
from devcrew_api.models.workspace import Workspace


# ---------------------------------------------------------------------------
# Engine + session fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def db_engine():
    """A single in-memory SQLite engine, shared across all tests.

    ``StaticPool`` keeps a single connection alive across calls so the
    in-memory database (which is per-connection) doesn't disappear
    between requests. ``check_same_thread=False`` lets the TestClient
    run requests on a different thread than the engine was created on.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    # SQLite doesn't enforce foreign-key constraints by default. Turn
    # them on so the ``ON DELETE CASCADE`` semantics on
    # ``projects.workspace_id`` and ``timelines.project_id`` are
    # exercised (otherwise removing a project would silently leave
    # its timeline rows behind).
    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _):  # pragma: no cover
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    # Create the schema once for the whole session. ``create_all`` is
    # idempotent within a single metadata set.
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(db_engine) -> Generator[Session, None, None]:
    """A fresh session per test, with a SAVEPOINT for rollback isolation.

    We use a nested-transaction pattern: open a SAVEPOINT on connect,
    each test runs inside it, and we roll back at teardown. This is
    faster than ``drop_all`` + ``create_all`` per test and keeps the
    schema (and any expensive setup) intact.
    """
    connection = db_engine.connect()
    trans = connection.begin()
    SessionLocal = sessionmaker(
        bind=connection, autoflush=False, autocommit=False, future=True
    )
    session = SessionLocal()

    yield session

    session.close()
    trans.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# FastAPI client fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def client(db_session) -> Generator[TestClient, None, None]:
    """A FastAPI ``TestClient`` wired to the test session.

    ``dependency_overrides[get_db]`` redirects the FastAPI dependency
    to a function that yields our test session, so every endpoint hit
    operates on the same DB state the test sees.
    """

    def _override_get_db():
        try:
            yield db_session
        finally:
            # Don't close ``db_session`` here — the ``db_session``
            # fixture owns its lifecycle.
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Entity factories
# ---------------------------------------------------------------------------

@pytest.fixture()
def make_workspace(db_session):
    """Factory: ``make_workspace(name=..., description=...)`` -> Workspace."""

    def _factory(
        *, name: str = "Test Workspace", description: str | None = None
    ) -> Workspace:
        ws = Workspace(name=name, description=description)
        db_session.add(ws)
        db_session.commit()
        db_session.refresh(ws)
        return ws

    return _factory


@pytest.fixture()
def make_project(db_session, make_workspace):
    """Factory: ``make_project(name=..., status=..., workspace=...)`` -> Project.

    ``workspace`` defaults to a fresh workspace created by
    ``make_workspace`` so the simplest call works out of the box.
    """

    def _factory(
        *,
        name: str = "Test Project",
        description: str | None = None,
        status: ProjectStatus = ProjectStatus.PLANNED,
        workspace: Workspace | None = None,
    ) -> Project:
        ws = workspace or make_workspace()
        project = Project(
            workspace_id=ws.id,
            name=name,
            description=description,
            status=status,
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        return project

    return _factory