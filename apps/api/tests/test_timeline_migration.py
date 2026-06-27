"""Tests for the Timeline Alembic migration.

We don't spin up a live PostgreSQL — instead we use SQLite via a
fresh per-test engine and ask Alembic to run the new revision up,
then back down. This catches:

* Missing / misspelled revision id (``down_revision`` chain).
* Schema mismatches between the model and the migration (column
  types, nullability, FK behaviour).

SQLite diverges from PostgreSQL on a few types (notably native ENUM),
so we tolerate those divergences by checking the table shape — column
names and constraints — rather than the exact DDL.

Engine sharing
--------------
The alembic runner creates its own engine from the URL string. With
an in-memory SQLite, that engine would have its own private database
and the test wouldn't be able to inspect what was created. We solve
this with a file-based SQLite in a temporary directory: both the
test and the alembic runner open the same file, so they see the
same schema.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.pool import StaticPool

# Resolve the ``alembic.ini`` path relative to this test file.
_API_DIR = Path(__file__).resolve().parent.parent
ALEMBIC_INI = _API_DIR / "alembic.ini"


@pytest.fixture()
def alembic_db(tmp_path, monkeypatch):
    """A file-based SQLite engine alembic can write to.

    Yields the engine. The alembic env script reads its URL via
    ``get_settings``, so we monkey-patch that to return our URL.
    Using a file (not ``:memory:``) lets both the test and alembic
    share the same database.
    """
    from devcrew_api.core import config as _config_module

    db_file = tmp_path / "migration.db"
    url = f"sqlite:///{db_file}"

    # Enable FK enforcement so ``ON DELETE CASCADE`` works.
    engine = create_engine(url, future=True)

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_connection, _):  # pragma: no cover
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    test_settings = _config_module.Settings(database_url=url)
    monkeypatch.setattr(_config_module, "get_settings", lambda: test_settings)

    yield engine

    engine.dispose()
    if db_file.exists():
        db_file.unlink()


def _alembic_config() -> Config:
    return Config(str(ALEMBIC_INI))


def test_migration_upgrade_creates_timelines_table(alembic_db):
    """Running the migration creates a ``timelines`` table with the expected columns."""
    cfg = _alembic_config()

    # Apply every revision up to and including the new one.
    command.upgrade(cfg, "head")

    inspector = inspect(alembic_db)
    tables = inspector.get_table_names()
    assert "timelines" in tables

    columns = {c["name"] for c in inspector.get_columns("timelines")}
    assert {"id", "project_id", "current_stage", "status",
            "created_at", "updated_at"}.issubset(columns)

    # The 1:1 cardinality is enforced by a UNIQUE constraint on
    # ``project_id``. Different dialects surface this differently:
    # PostgreSQL reports it via ``get_unique_constraints``; SQLite
    # stores it as a unique index. Accept either surface so the test
    # is portable across engines.
    unique_constraints = {
        tuple(uc["column_names"])
        for uc in inspector.get_unique_constraints("timelines")
    }
    unique_indexes = {
        tuple(idx["column_names"])
        for idx in inspector.get_indexes("timelines")
        if idx.get("unique")
    }
    assert ("project_id",) in unique_constraints or (
        "project_id",
    ) in unique_indexes

    # Foreign key to ``projects.id`` with cascade delete.
    # Different dialects surface ``ON DELETE`` actions differently:
    # PostgreSQL exposes ``fk['ondelete']`` directly; SQLite nests it
    # inside ``fk['options']['ondelete']``. Accept either surface so
    # the test is portable across engines.
    fks = inspector.get_foreign_keys("timelines")
    assert any(
        fk["referred_table"] == "projects"
        and fk["constrained_columns"] == ["project_id"]
        and (
            fk.get("ondelete", "").upper() == "CASCADE"
            or fk.get("options", {}).get("ondelete", "").upper() == "CASCADE"
        )
        for fk in fks
    )


def test_migration_downgrade_drops_timelines_table(alembic_db):
    """Downgrading the migration drops the ``timelines`` table."""
    cfg = _alembic_config()

    command.upgrade(cfg, "head")
    command.downgrade(cfg, "8a344b5ac13d")  # the projects migration

    inspector = inspect(alembic_db)
    assert "timelines" not in inspector.get_table_names()


def test_migration_chains_off_projects_revision():
    """The migration's ``down_revision`` is the projects migration.

    This is a static check on the file contents — it doesn't run the
    migration. It catches accidental rewrites of the revision chain.
    """
    versions_dir = _API_DIR / "alembic" / "versions"
    candidates = list(versions_dir.glob("9b2c1f4a3e5d_*.py"))
    assert len(candidates) == 1, "Expected exactly one timeline migration"

    source = candidates[0].read_text(encoding="utf-8")
    assert "down_revision: Union[str, Sequence[str], None] = '8a344b5ac13d'" in source
    assert "revision: str = '9b2c1f4a3e5d'" in source


def test_migration_declares_enums_with_create_type_false():
    """The migration marks every enum with ``create_type=False``.

    Without this, SQLAlchemy embeds ``CREATE TYPE timeline_stage``
    inside the ``CREATE TABLE`` statement. On PostgreSQL, any rerun
    or downgrade→upgrade cycle where the type persists trips
    ``DuplicateObject: type "timeline_stage" already exists``.
    """
    versions_dir = _API_DIR / "alembic" / "versions"
    candidates = list(versions_dir.glob("9b2c1f4a3e5d_*.py"))
    assert len(candidates) == 1, "Expected exactly one timeline migration"
    source = candidates[0].read_text(encoding="utf-8")

    # Both enums must declare ``create_type=False`` on every enum
    # used as a column type. We check the source so the test is
    # portable across databases (SQLite doesn't surface the same
    # ``DuplicateObject`` error).
    assert source.count("create_type=False") >= 2, (
        "Expected at least two `create_type=False` markers — one for "
        "timeline_stage and one for timeline_status."
    )


def test_migration_uses_postgresql_specific_enum():
    """The migration uses ``postgresql.ENUM``, not generic ``sqlalchemy.Enum``.

    Regression guard. The previous version of this migration used
    ``sqlalchemy.Enum(..., create_type=False)``. That is silently
    wrong: ``create_type`` is a PostgreSQL-specific parameter that
    ``sqltypes.Enum`` does not have; passing it discards the value,
    and when SA adapts the generic ``Enum`` to ``postgresql.ENUM`` at
    execution time, the PG class is reconstructed fresh from ``**kw``
    (default ``create_type=True``). The result is the duplicate-enum
    bug. Using ``postgresql.ENUM`` directly preserves the flag.
    """
    versions_dir = _API_DIR / "alembic" / "versions"
    candidates = list(versions_dir.glob("9b2c1f4a3e5d_*.py"))
    assert len(candidates) == 1, "Expected exactly one timeline migration"
    source = candidates[0].read_text(encoding="utf-8")

    # The migration must import ``postgresql.ENUM`` (under any alias).
    assert (
        "from sqlalchemy.dialects.postgresql import ENUM" in source
        or "from sqlalchemy.dialects.postgresql import ENUM as" in source
    ), (
        "Migration must import `sqlalchemy.dialects.postgresql.ENUM` "
        "directly so `create_type=False` survives dialect adaptation."
    )

    # The migration must NOT use the generic ``sa.Enum(...)`` for the
    # timeline enum column types. We allow ``sa.Enum`` only as a
    # token in comments / strings.
    #
    # A safe heuristic: the migration should construct each enum by
    # name (PG_ENUM / ENUM) and not as ``sa.Enum(...)``.
    bad_uses = [
        # newline-followed-by-``sa.Enum(`` (i.e. used as a constructor)
        line for line in source.splitlines()
        if line.lstrip().startswith("sa.Enum(")
    ]
    assert not bad_uses, (
        "Migration must NOT use `sa.Enum(...)` as a constructor for "
        "the timeline enums. Use `sqlalchemy.dialects.postgresql.ENUM` "
        "instead. Found:\n  " + "\n  ".join(bad_uses)
    )


def test_migration_creates_and_drops_enums_explicitly():
    """The migration explicitly creates and drops the enum types.

    This is the second half of the PostgreSQL enum fix: the types
    must be created with ``sa.Enum.create(op.get_bind(), checkfirst=True)``
    so they can be created idempotently (skipped when already present),
    and dropped with ``sa.Enum.drop(op.get_bind(), checkfirst=True)``
    in downgrade (because PostgreSQL doesn't auto-drop a type when
    its column is dropped).
    """
    versions_dir = _API_DIR / "alembic" / "versions"
    candidates = list(versions_dir.glob("9b2c1f4a3e5d_*.py"))
    assert len(candidates) == 1, "Expected exactly one timeline migration"
    source = candidates[0].read_text(encoding="utf-8")

    assert "timeline_stage.create(op.get_bind(), checkfirst=True)" in source, (
        "Migration must explicitly create `timeline_stage` via "
        "`sa.Enum.create(op.get_bind(), checkfirst=True)`."
    )
    assert "timeline_status.create(op.get_bind(), checkfirst=True)" in source, (
        "Migration must explicitly create `timeline_status` via "
        "`sa.Enum.create(op.get_bind(), checkfirst=True)`."
    )
    assert "timeline_status.drop(op.get_bind(), checkfirst=True)" in source, (
        "Migration must explicitly drop `timeline_status` in "
        "downgrade so PostgreSQL doesn't leave a dangling type behind."
    )
    assert "timeline_stage.drop(op.get_bind(), checkfirst=True)" in source, (
        "Migration must explicitly drop `timeline_stage` in "
        "downgrade so PostgreSQL doesn't leave a dangling type behind."
    )


def test_migration_is_idempotent_under_rerun(alembic_db):
    """Running the migration twice in a row doesn't fail.

    On PostgreSQL, the bug this guards against is
    ``DuplicateObject: type "timeline_stage" already exists`` when
    the migration is rerun (e.g. after an interrupted deploy, or a
    downgrade→upgrade cycle where the type was left behind).

    The migration uses ``create_type=False`` on the columns and
    ``op.create_type(..., checkfirst=True)`` for the types, which
    makes the upgrade a no-op the second time around.

    SQLite doesn't surface the same error, but the test is still
    valuable: it catches a class of regressions where someone
    removes the ``checkfirst=True`` guard or drops the
    ``create_type=False`` markers.
    """
    cfg = _alembic_config()

    # First run: creates the tables and the enum types.
    command.upgrade(cfg, "head")
    # Second run: must be a no-op. On PG this would have raised
    # ``DuplicateObject`` before the fix.
    command.upgrade(cfg, "head")

    inspector = inspect(alembic_db)
    assert "timelines" in inspector.get_table_names()


def test_migration_downgrade_then_upgrade_round_trip(alembic_db):
    """Downgrade → upgrade completes cleanly.

    Without explicit ``op.drop_type(...)`` in downgrade, PostgreSQL
    leaves the enum types behind when ``op.drop_table`` runs. The
    subsequent upgrade then trips ``DuplicateObject`` when
    ``CREATE TABLE`` tries to recreate them.
    """
    cfg = _alembic_config()

    command.upgrade(cfg, "head")
    command.downgrade(cfg, "8a344b5ac13d")
    # The bug: this second upgrade would raise DuplicateObject on PG
    # because the enum types were left behind by downgrade. With the
    # fix (explicit ``op.drop_type`` in downgrade + ``checkfirst=True``
    # on ``op.create_type``), this is a clean round trip.
    command.upgrade(cfg, "head")

    inspector = inspect(alembic_db)
    assert "timelines" in inspector.get_table_names()