"""add timelines table

Introduces the ``timelines`` table — the 1:1 child of :class:`Project`
that tracks a project's ordered lifecycle stages and parallel progress
state.

Schema
------
* ``id``              UUID v4 primary key (from ``UUIDPrimaryKeyMixin``)
* ``project_id``      UUID, FK → ``projects.id`` (cascade delete),
                      UNIQUE — enforces the 1:1 cardinality.
* ``current_stage``   ENUM('requirements', 'architecture',
                      'implementation', 'testing', 'deployment',
                      'completed'), NOT NULL,
                      server_default='requirements'
* ``status``          ENUM('not_started', 'in_progress', 'blocked',
                      'completed'), NOT NULL,
                      server_default='not_started'
* ``created_at``      TIMESTAMPTZ, NOT NULL, server_default=now()
* ``updated_at``      TIMESTAMPTZ, NOT NULL, server_default=now()

Indexes
-------
* ``uq_timelines_project_id`` — the UNIQUE constraint also serves as
  the lookup index for ``get_by_project``. We intentionally do not
  add a separate non-unique ``ix_timelines_project_id`` because the
  UNIQUE constraint already backs the lookup.
* ``ix_timelines_created_at`` — kept for parity with the ``projects``
  and ``workspaces`` tables (default list ordering).

Enum handling
-------------
PostgreSQL's native ENUM types live as standalone database objects
(``CREATE TYPE timeline_stage AS ENUM (...)``). They are **not**
auto-dropped when the column that uses them is dropped. Any rerun of
this migration, any downgrade→upgrade cycle, or any pre-existing type
in the catalog would trip the implicit ``CREATE TYPE`` that SQLAlchemy
embeds in ``CREATE TABLE`` and raise
``DuplicateObject: type "timeline_stage" already exists``.

We avoid that with the canonical SQLAlchemy / Alembic pattern for
PostgreSQL native enums:

1. **Use** ``sqlalchemy.dialects.postgresql.ENUM`` **instead of the
   generic** ``sqlalchemy.Enum``. ``create_type`` is a PostgreSQL-only
   parameter; the generic ``sqltypes.Enum`` does not have it and
   silently discards it. When ``sqltypes.Enum`` is adapted to PG at
   execution time (``dialect_impl`` → ``NativeForEmulated.
   adapt_emulated_to_native``), the PG class is constructed fresh
   from ``**kw`` (see ``sqlalchemy/sql/type_api.py``, line ~1518:
   ``return cls(**kw)``), losing every attribute set on the source
   instance. ``create_type=True`` becomes the adapted default —
   exactly the opposite of what we want. Using
   ``postgresql.ENUM`` directly preserves ``create_type=False``
   through adaptation.
2. Mark each enum with ``create_type=False`` so the column-level
   enums do NOT emit ``CREATE TYPE`` inside ``CREATE TABLE``. The
   type is referenced by name only — the column DDL becomes
   ``stage timeline_stage`` rather than embedding the enum
   definition.
3. Create the types explicitly with
   ``enum_instance.create(op.get_bind(), checkfirst=True)`` before
   ``op.create_table`` runs. ``checkfirst=True`` delegates to the PG
   ``NamedTypeGenerator._can_create_type`` which queries the
   ``pg_type`` catalog via ``dialect.has_type(...)`` and is a no-op
   when the type already exists.
4. Drop the types explicitly with
   ``enum_instance.drop(op.get_bind(), checkfirst=True)`` in
   ``downgrade`` **after** ``op.drop_table`` — PostgreSQL refuses to
   drop a type that's still in use, and ``checkfirst=True`` makes
   the drop a no-op if the type is somehow already absent.

This keeps the upgrade idempotent across reruns, downgrade→upgrade
cycles, and "existing DB" scenarios where the type may already exist
(e.g. a previous partial run, or a DB created via ``Base.metadata
.create_all``).

Revision ID: 9b2c1f4a3e5d
Revises: 8a344b5ac13d
Create Date: 2026-06-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


# revision identifiers, used by Alembic.
revision: str = '9b2c1f4a3e5d'
down_revision: Union[str, Sequence[str], None] = '8a344b5ac13d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Enum type definitions — declared at module scope so both ``upgrade`` and
# ``downgrade`` reference the same instances.
#
# These are intentionally ``sqlalchemy.dialects.postgresql.ENUM`` rather
# than the generic ``sqlalchemy.Enum``. ``create_type`` is a PostgreSQL-
# specific parameter that the generic ``sqltypes.Enum`` does not have:
# passing it to ``sa.Enum(...)`` silently discards it, and the value is
# then lost when SQLAlchemy adapts to the PG-specific class at execution
# time (the PG class is reconstructed fresh via ``cls(**kw)``, with the
# default ``create_type=True``). Using ``postgresql.ENUM`` directly
# preserves ``create_type=False`` through dialect adaptation, which is
# what stops the embedded ``CREATE TYPE`` from appearing inside
# ``CREATE TABLE``.
# ---------------------------------------------------------------------------
# ``length=20`` matches the longest enum value name across both enums
# (the longest label is 14 chars: ``"implementation"`` /
# ``"not_started"``; we leave headroom).
timeline_stage = PG_ENUM(
    'requirements',
    'architecture',
    'implementation',
    'testing',
    'deployment',
    'completed',
    name='timeline_stage',
    length=20,
    create_type=False,
)
timeline_status = PG_ENUM(
    'not_started',
    'in_progress',
    'blocked',
    'completed',
    name='timeline_status',
    length=20,
    create_type=False,
)


def upgrade() -> None:
    """Upgrade schema."""
    # ---------------------------------------------------------------- enums
    # Create the types explicitly. ``checkfirst=True`` probes the
    # database (via ``dialect.has_type(...)`` against ``pg_type``) and
    # skips creation when the type already exists. This is what makes
    # the migration safe to re-run, safe after an interrupted deploy,
    # and safe on a database where the type was created out-of-band
    # (e.g. ``Base.metadata.create_all`` during development, or a
    # previous downgrade that left the type behind).
    #
    # Note: ``op.create_type`` is **not** part of Alembic's public ops
    # API. The canonical SQLAlchemy / Alembic pattern is to call
    # ``enum_instance.create(op.get_bind(), checkfirst=True)`` directly.
    timeline_stage.create(op.get_bind(), checkfirst=True)
    timeline_status.create(op.get_bind(), checkfirst=True)

    # ---------------------------------------------------------------- table
    # ``unique=True`` on ``project_id`` enforces the 1:1 cardinality
    # at the database level. ``ondelete="CASCADE"`` mirrors the
    # ``projects → workspace`` rule: removing a Project drops its
    # Timeline so we never leave an orphan row behind.
    op.create_table(
        'timelines',
        sa.Column('project_id', sa.UUID(), nullable=False),
        # ``create_type=False`` on the column-level enums ensures that
        # ``op.create_table`` does NOT emit ``CREATE TYPE`` statements
        # alongside the ``CREATE TABLE``. The types already exist
        # (created above) and the columns simply reference them by
        # name. On PostgreSQL the compiled column DDL is therefore
        # ``current_stage timeline_stage`` rather than the full enum
        # definition being inlined.
        sa.Column(
            'current_stage',
            timeline_stage,
            server_default='requirements',
            nullable=False,
        ),
        sa.Column(
            'status',
            timeline_status,
            server_default='not_started',
            nullable=False,
        ),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['project_id'], ['projects.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', name='uq_timelines_project_id'),
    )
    # Index on ``created_at`` for default list ordering. The UNIQUE
    # constraint on ``project_id`` already backs the lookup for
    # ``get_by_project``, so a separate non-unique index there would
    # be redundant.
    op.create_index(
        op.f('ix_timelines_created_at'),
        'timelines',
        ['created_at'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_timelines_created_at'), table_name='timelines')
    op.drop_table('timelines')

    # Drop the enum types **after** the table is gone — PostgreSQL
    # refuses to drop a type that's still referenced by a column.
    # ``checkfirst=True`` is defensive: if the type is somehow already
    # absent, downgrade is a no-op rather than an error.
    #
    # Same pattern as the upgrade: ``op.drop_type`` is not part of
    # Alembic's public ops API; use ``enum_instance.drop(op.get_bind(), ...)``.
    timeline_status.drop(op.get_bind(), checkfirst=True)
    timeline_stage.drop(op.get_bind(), checkfirst=True)
