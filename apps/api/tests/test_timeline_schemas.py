"""Tests for the Timeline Pydantic schemas.

These tests cover the wire-format layer: validation, defaults, and
the ``model_validate(orm_instance)`` round-trip used by the API layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from devcrew_api.models.timeline import Timeline, TimelineStage, TimelineStatus
from devcrew_api.schemas.timeline import (
    TimelineCreate,
    TimelineRead,
    TimelineUpdate,
)


def test_create_defaults_to_requirements_and_not_started():
    """Omitting both fields yields the model-level defaults."""
    payload = TimelineCreate()
    assert payload.current_stage is TimelineStage.REQUIREMENTS
    assert payload.status is TimelineStatus.NOT_STARTED


def test_create_accepts_explicit_values():
    """Explicit values are preserved verbatim."""
    payload = TimelineCreate(
        current_stage=TimelineStage.DEPLOYMENT,
        status=TimelineStatus.IN_PROGRESS,
    )
    assert payload.current_stage is TimelineStage.DEPLOYMENT
    assert payload.status is TimelineStatus.IN_PROGRESS


def test_create_rejects_unknown_stage():
    """An unknown stage value fails Pydantic validation."""
    with pytest.raises(ValidationError):
        TimelineCreate(current_stage="not_a_real_stage")


def test_create_rejects_unknown_status():
    """An unknown status value fails Pydantic validation."""
    with pytest.raises(ValidationError):
        TimelineCreate(status="frozen")


def test_update_defaults_to_none_for_both_fields():
    """An empty patch payload is well-formed and means "no change"."""
    payload = TimelineUpdate()
    assert payload.current_stage is None
    assert payload.status is None


def test_update_partial_only_marks_set_fields():
    """``model_dump(exclude_unset=True)`` only includes sent keys."""
    payload = TimelineUpdate(status=TimelineStatus.BLOCKED)
    dumped = payload.model_dump(exclude_unset=True)
    assert dumped == {"status": TimelineStatus.BLOCKED}
    assert "current_stage" not in dumped


def test_update_empty_payload_exclude_unset_is_empty():
    """Empty update → empty dict under ``exclude_unset``."""
    payload = TimelineUpdate()
    assert payload.model_dump(exclude_unset=True) == {}


def test_read_round_trip_from_orm_instance():
    """``TimelineRead.model_validate(timeline)`` populates every field."""
    project_id = uuid.uuid4()
    timeline = Timeline(
        id=uuid.uuid4(),
        project_id=project_id,
        current_stage=TimelineStage.ARCHITECTURE,
        status=TimelineStatus.IN_PROGRESS,
    )
    # Pydantic's ``from_attributes`` path reads attributes off the ORM
    # instance. ``created_at`` / ``updated_at`` come from the DB; we
    # set them explicitly so the test doesn't need a session flush.
    now = datetime.now(timezone.utc)
    timeline.created_at = now
    timeline.updated_at = now

    read = TimelineRead.model_validate(timeline)
    assert read.id == timeline.id
    assert read.project_id == project_id
    assert read.current_stage is TimelineStage.ARCHITECTURE
    assert read.status is TimelineStatus.IN_PROGRESS
    assert read.created_at == now
    assert read.updated_at == now


def test_read_requires_all_fields():
    """Building a TimelineRead manually requires every field."""
    with pytest.raises(ValidationError):
        TimelineRead.model_validate({})  # type: ignore[arg-type]