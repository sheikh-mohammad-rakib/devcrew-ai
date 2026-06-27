"""Tests for the Timeline service layer.

The service owns transaction boundaries and translates "row missing"
into typed exceptions. These tests exercise the service directly
(bypassing the HTTP layer) so the rules around 1:1 cardinality,
partial updates, and missing-project handling stay focused.
"""

from __future__ import annotations

import uuid

import pytest

from devcrew_api.models.project import Project
from devcrew_api.models.timeline import Timeline, TimelineStage, TimelineStatus
from devcrew_api.schemas.timeline import TimelineCreate, TimelineUpdate
from devcrew_api.services.project_service import ProjectNotFoundError
from devcrew_api.services.timeline_service import (
    TimelineAlreadyExistsError,
    TimelineNotFoundError,
    TimelineService,
)


def _service(db_session) -> TimelineService:
    return TimelineService(db_session)


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

def test_create_persists_with_explicit_values(db_session, make_project):
    """``create`` writes a row using the payload's stage + status."""
    project = make_project()
    payload = TimelineCreate(
        current_stage=TimelineStage.ARCHITECTURE,
        status=TimelineStatus.IN_PROGRESS,
    )

    timeline = _service(db_session).create(
        project_id=project.id, payload=payload
    )

    assert timeline.id is not None
    assert timeline.project_id == project.id
    assert timeline.current_stage is TimelineStage.ARCHITECTURE
    assert timeline.status is TimelineStatus.IN_PROGRESS


def test_create_uses_payload_defaults_when_omitted(
    db_session, make_project
):
    """``TimelineCreate()`` carries the model's defaults through."""
    project = make_project()
    timeline = _service(db_session).create(
        project_id=project.id, payload=TimelineCreate()
    )
    assert timeline.current_stage is TimelineStage.REQUIREMENTS
    assert timeline.status is TimelineStatus.NOT_STARTED


def test_create_rejects_unknown_project(db_session):
    """A UUID that doesn't match any Project raises ``ProjectNotFoundError``."""
    payload = TimelineCreate()
    with pytest.raises(ProjectNotFoundError):
        _service(db_session).create(
            project_id=uuid.uuid4(), payload=payload
        )


def test_create_rejects_duplicate_timeline(db_session, make_project):
    """A second timeline for the same project raises ``TimelineAlreadyExistsError``."""
    project = make_project()
    service = _service(db_session)
    service.create(project_id=project.id, payload=TimelineCreate())

    with pytest.raises(TimelineAlreadyExistsError):
        service.create(project_id=project.id, payload=TimelineCreate())


# ---------------------------------------------------------------------------
# get_by_project
# ---------------------------------------------------------------------------

def test_get_by_project_returns_existing_timeline(db_session, make_project):
    """Happy path: project has a timeline, we get it back."""
    project = make_project()
    created = _service(db_session).create(
        project_id=project.id, payload=TimelineCreate()
    )

    fetched = _service(db_session).get_by_project(project.id)
    assert fetched.id == created.id


def test_get_by_project_raises_when_missing(db_session, make_project):
    """A project with no timeline raises ``TimelineNotFoundError``."""
    project = make_project()
    with pytest.raises(TimelineNotFoundError):
        _service(db_session).get_by_project(project.id)


def test_get_by_project_raises_for_unknown_project(db_session):
    """Looking up by an unknown project id also raises ``TimelineNotFoundError``.

    This collapses two cases (``Project missing`` vs ``Project exists
    but has no timeline``) into one error type, which the API layer
    surfaces as 404 with a precise message.
    """
    with pytest.raises(TimelineNotFoundError):
        _service(db_session).get_by_project(uuid.uuid4())


# ---------------------------------------------------------------------------
# update_by_project
# ---------------------------------------------------------------------------

def test_update_changes_only_provided_fields(db_session, make_project):
    """PATCH semantics: only the keys in ``exclude_unset`` are written."""
    project = make_project()
    service = _service(db_session)
    service.create(
        project_id=project.id,
        payload=TimelineCreate(
            current_stage=TimelineStage.ARCHITECTURE,
            status=TimelineStatus.IN_PROGRESS,
        ),
    )

    # Patch only the status.
    updated = service.update_by_project(
        project_id=project.id,
        payload=TimelineUpdate(status=TimelineStatus.BLOCKED),
    )

    assert updated.current_stage is TimelineStage.ARCHITECTURE
    assert updated.status is TimelineStatus.BLOCKED


def test_update_can_change_both_fields(db_session, make_project):
    """Updating both fields at once works."""
    project = make_project()
    service = _service(db_session)
    service.create(project_id=project.id, payload=TimelineCreate())

    updated = service.update_by_project(
        project_id=project.id,
        payload=TimelineUpdate(
            current_stage=TimelineStage.TESTING,
            status=TimelineStatus.IN_PROGRESS,
        ),
    )

    assert updated.current_stage is TimelineStage.TESTING
    assert updated.status is TimelineStatus.IN_PROGRESS


def test_update_empty_payload_is_a_no_op(db_session, make_project):
    """``TimelineUpdate()`` writes nothing — values stay the same."""
    project = make_project()
    service = _service(db_session)
    original = service.create(
        project_id=project.id,
        payload=TimelineCreate(
            current_stage=TimelineStage.IMPLEMENTATION,
            status=TimelineStatus.IN_PROGRESS,
        ),
    )
    original_stage = original.current_stage
    original_status = original.status

    updated = service.update_by_project(
        project_id=project.id, payload=TimelineUpdate()
    )
    assert updated.current_stage is original_stage
    assert updated.status is original_status


def test_update_raises_when_no_timeline(db_session, make_project):
    """``update_by_project`` on a project with no timeline errors."""
    project = make_project()
    with pytest.raises(TimelineNotFoundError):
        _service(db_session).update_by_project(
            project_id=project.id,
            payload=TimelineUpdate(status=TimelineStatus.IN_PROGRESS),
        )


# ---------------------------------------------------------------------------
# type guards
# ---------------------------------------------------------------------------

def test_is_known_stage_accepts_enum_and_rejects_string():
    assert TimelineService.is_known_stage(TimelineStage.DEPLOYMENT) is True
    assert TimelineService.is_known_stage("deployment") is False
    assert TimelineService.is_known_stage(None) is False


def test_is_known_status_accepts_enum_and_rejects_string():
    assert TimelineService.is_known_status(TimelineStatus.BLOCKED) is True
    assert TimelineService.is_known_status("blocked") is False
    assert TimelineService.is_known_status(None) is False