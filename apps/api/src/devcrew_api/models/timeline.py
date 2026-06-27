"""SQLAlchemy ORM model for the ``Timeline`` aggregate.

A Timeline belongs to exactly one :class:`Project` and represents the
ordered sequence of stages the project moves through as it progresses:

    Workspace 1 ──── N Projects 1 ──── 1 Timeline

This module defines the Timeline table, the two ``str``-based enums it
uses (``TimelineStage``, ``TimelineStatus``), and the back-relationship
on :class:`Project`. There is no business logic here — that lives in
the service layer.

Design notes
------------
* Inherits :class:`UUIDPrimaryKeyMixin` so every row has a globally-
  unique UUID v4 identifier.
* Inherits :class:`TimestampMixin` so every row carries ``created_at``
  and ``updated_at`` populated by the database.
* ``project_id`` is a server-side ``ForeignKey`` to ``projects.id``
  with ``ondelete="CASCADE"``. We additionally declare
  ``unique=True`` to enforce the **one-to-one** cardinality at the
  database level — a single project can have at most one Timeline row.
* ``current_stage`` is a Python ``Enum`` persisted as a native
  PostgreSQL ``ENUM``. The lifecycle is *ordered* (``REQUIREMENTS``
  → ``ARCHITECTURE`` → … → ``COMPLETED``) but the model only persists
  the value; transition rules are a service-layer concern.
* ``status`` is a separate ``Enum`` modelling *parallel progress
  state* (whether the work in ``current_stage`` is in flight, blocked,
  or done). Decoupling these two concepts lets a Timeline sit in
  ``current_stage=TESTING`` while its ``status`` flips between
  ``IN_PROGRESS`` and ``BLOCKED`` without implying a stage change.
* The inverse relationship on :class:`Project` is exposed via
  :attr:`Project.timeline` (``uselist=False``). Cascade is handled at
  the database level (``ON DELETE CASCADE``); we don't add
  ``cascade="all, delete-orphan"`` on the SQLAlchemy side because
  one-to-one relationships don't have orphan-collection semantics the
  way one-to-many does.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from devcrew_api.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TimelineStage(str, enum.Enum):
    """Ordered stage a Timeline is currently in.

    Inheriting from ``str`` lets Pydantic v2 serialize the value as a
    plain JSON string (e.g. ``"implementation"``) while keeping Python
    enum semantics inside the service layer.

    Lifecycle (informal)
    --------------------
    ``requirements``   → gathering scope and user stories.
    ``architecture``   → designing the system / module layout.
    ``implementation`` → writing the code.
    ``testing``        → automated + manual QA.
    ``deployment``     → releasing to staging / production.
    ``completed``      → all stages done; the timeline is closed out.

    The model persists the value verbatim — it does NOT enforce that
    ``current_stage`` can only advance forward. Transition rules
    (e.g. blocking regression to an earlier stage) are a service-layer
    concern and may evolve independently of the schema.
    """

    REQUIREMENTS = "requirements"
    ARCHITECTURE = "architecture"
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    DEPLOYMENT = "deployment"
    COMPLETED = "completed"


class TimelineStatus(str, enum.Enum):
    """Parallel progress state for the work happening in ``current_stage``.

    Inheriting from ``str`` for the same wire-format reasons as
    :class:`TimelineStage`. This enum is independent of the stage — a
    Timeline can be ``IN_PROGRESS`` regardless of which stage it's on,
    and can be ``BLOCKED`` on any stage including ``COMPLETED`` (e.g.
    a regression after release).
    """

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"


class Timeline(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A Project's ordered lifecycle timeline.

    One Project has at most one Timeline (enforced by the ``UNIQUE``
    constraint on ``project_id``). The relationship is configured
    bidirectionally so service code can navigate either direction:

        project = await session.get(Project, project_id)
        stage = project.timeline.current_stage

        timeline = await session.get(Timeline, timeline_id)
        workspace = timeline.project.workspace
    """

    __tablename__ = "timelines"

    # ---------------------------------------------------------------- FK
    # ``unique=True`` enforces the 1:1 cardinality at the DB level.
    # ``ondelete="CASCADE"`` mirrors the ``projects → workspace`` rule:
    # removing a Project drops its Timeline so we never leave an
    # orphan row behind.
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # ---------------------------------------------------------------- stages
    # ``current_stage`` tracks where the work is *sequenced*. Default
    # to ``REQUIREMENTS`` so a freshly-created Timeline always sits at
    # the beginning of the pipeline. ``length=20`` matches the longest
    # value (``"implementation"`` is 14 chars; ``"requirements"`` 12;
    # we leave headroom for the enum name pattern).
    current_stage: Mapped[TimelineStage] = mapped_column(
        SAEnum(
            TimelineStage,
            name="timeline_stage",
            native_enum=True,
            length=20,
            values_callable=lambda enum_cls: [m.value for m in enum_cls],
        ),
        nullable=False,
        default=TimelineStage.REQUIREMENTS,
        server_default=TimelineStage.REQUIREMENTS.value,
    )

    # ``status`` tracks *whether* the work in the current stage is
    # moving, blocked, or done. Defaults to ``NOT_STARTED`` so the
    # combination ``(REQUIREMENTS, NOT_STARTED)`` is the well-defined
    # "fresh timeline" state.
    status: Mapped[TimelineStatus] = mapped_column(
        SAEnum(
            TimelineStatus,
            name="timeline_status",
            native_enum=True,
            length=20,
            values_callable=lambda enum_cls: [m.value for m in enum_cls],
        ),
        nullable=False,
        default=TimelineStatus.NOT_STARTED,
        server_default=TimelineStatus.NOT_STARTED.value,
    )

    # ---------------------------------------------------------------- relationship
    # The parent-side of the one-to-one: ``Project.timeline``. We use
    # ``back_populates`` (not ``backref``) so both sides declare their
    # intent explicitly and a typo on either side is caught at import
    # time. ``lazy="raise"`` keeps us honest about not lazily loading
    # the parent project from inside a Timeline-only query.
    #
    # ``passive_deletes=True`` tells SQLAlchemy to trust the database
    # to handle the cascade (``ON DELETE CASCADE`` on ``project_id``)
    # instead of issuing an UPDATE that nulls the FK before the
    # DELETE. Without it, deleting the parent ``Project`` raises a
    # ``NOT NULL`` violation when SQLAlchemy tries to set our FK to
    # ``None`` before the cascade fires.
    project: Mapped["Project"] = relationship(  # noqa: F821
        back_populates="timeline",
        lazy="raise",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return (
            f"<Timeline id={self.id} project_id={self.project_id} "
            f"stage={self.current_stage.value!r} "
            f"status={self.status.value!r}>"
        )


__all__: list[str] = [
    "Timeline",
    "TimelineStage",
    "TimelineStatus",
]
