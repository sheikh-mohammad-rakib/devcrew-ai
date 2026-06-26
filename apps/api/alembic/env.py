"""Alembic environment script.

This file is executed by every Alembic command. Its job is to:

1. Build a SQLAlchemy engine whose URL comes from the application's
   :class:`Settings` (i.e. ``DATABASE_URL`` in ``.env``) — NOT from
   ``alembic.ini``. The ``sqlalchemy.url`` key in ``alembic.ini`` is
   intentionally left blank so secrets never live in source control.
2. Expose :data:`target_metadata` — pointing at the project's
   :class:`Base.metadata` — so ``alembic revision --autogenerate``
   can diff model definitions against the live database.
3. Provide both ``run_migrations_offline`` and ``run_migrations_online``
   implementations that respect the project conventions.

Path manipulation:
We prepend ``apps/api/src`` to ``sys.path`` so ``from devcrew_api...``
imports work even when Alembic is invoked from the repository root.
"""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ---------------------------------------------------------------------------
# Path setup — make the ``src`` layout importable.
# ---------------------------------------------------------------------------
# ``alembic.ini`` lives at ``apps/api/alembic.ini``. Its ``prepend_sys_path``
# entry covers ``apps/api`` itself, but the package sources are under
# ``apps/api/src``, so we add it explicitly. Using an absolute path keeps
# this robust regardless of where Alembic is invoked from.
_API_DIR = Path(__file__).resolve().parent.parent
_SRC_DIR = _API_DIR / "src"
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

# Now safe to import the project's settings and declarative base.
from devcrew_api.core.config import get_settings  # noqa: E402
from devcrew_api.db.base import Base  # noqa: E402

# This is the Alembic Config object — provides access to alembic.ini values.
config = context.config

# Configure Python logging from alembic.ini's [loggers] section, if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Inject the runtime database URL into Alembic's config.
# ---------------------------------------------------------------------------
# We intentionally do NOT read ``sqlalchemy.url`` from alembic.ini — that
# value is a placeholder. The real URL comes from the application settings,
# which load ``DATABASE_URL`` from ``.env``. This keeps secrets in one place.
_settings = get_settings()
config.set_main_option("sqlalchemy.url", _settings.database_url)

# ---------------------------------------------------------------------------
# Metadata for autogenerate.
# ---------------------------------------------------------------------------
# ``Base.metadata`` aggregates every table defined on classes that inherit
# from ``Base`` (via the project's mixins). Importing model modules here
# ensures their tables are registered before autogenerate inspects the
# metadata. Right now there are no application models yet, but the import
# hook is in place so future modules only need to add a line below.
from devcrew_api.db.base import Base as _BaseForAutogen  # noqa: E402,F401

target_metadata = _BaseForAutogen.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Offline mode emits SQL to stdout without requiring a live DB
    connection. Useful for generating review-friendly migration scripts
    or running against read-only replicas. The URL is pulled from the
    Alembic config, which we populated above from ``Settings``.
    """
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not configured. Check your .env file."
        )

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Compare types so autogenerate detects column-type changes
        # (e.g. VARCHAR(255) -> TEXT).
        compare_type=True,
        # Compare server defaults so autogenerate detects changes to
        # ``server_default`` arguments.
        compare_server_default=True,
        # Include schemas in autogenerate output.
        include_schemas=False,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (the default).

    Creates a real engine bound to the configured URL and runs each
    migration inside a transaction on a checked-out connection.
    ``pool.NullPool`` prevents Alembic from holding idle connections —
    it opens one, runs the migration, and closes it.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=False,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
