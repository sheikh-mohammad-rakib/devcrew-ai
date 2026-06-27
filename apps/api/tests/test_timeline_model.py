"""Tests for the Timeline SQLAlchemy model.

Covers the model surface directly — defaults, enum round-trip, the
1:1 relationship on the parent side, and the cascade behaviour when
the parent Project is deleted.
"""

from __future__ import annotations

import uuid

import pytest

from devcrew_api.models.project import Project
from devcrew_api.models.timeline import Timeline, TimelineStage, TimelineStatus


def test_default_stage_and_status(db_session, make_project):
    """A freshly-created Timeline sits at (REQUIREMENTS, NOT_STARTED)."""
    project = make_project()
    timeline = Timeline(project_id=project.id)

    db_session.add(timeline)
    db_session.commit()
    db_session.refresh(timeline)

    assert timeline.current_stage is TimelineStage.REQUIREMENTS
    assert timeline.status is TimelineStatus.NOT_STARTED
    # Standard mixin columns are populated.
    assert timeline.id is not None
    assert isinstance(timeline.id, uuid.UUID)
    assert timeline.created_at is not None
    assert timeline.updated_at is not None


def test_enum_persists_as_value(db_session, make_project):
    """Setting the enum persists the ``.value`` string in the DB."""
    project = make_project()
    timeline = Timeline(
        project_id=project.id,
        current_stage=TimelineStage.IMPLEMENTATION,
        status=TimelineStatus.BLOCKED,
    )
    db_session.add(timeline)
    db_session.commit()

    # Re-fetch from a fresh query so we hit the DB, not the identity map.
    fetched = db_session.query(Timeline).one()
    assert fetched.current_stage is TimelineStage.IMPLEMENTATION
    assert fetched.status is TimelineStatus.BLOCKED


def test_one_to_one_via_project_relationship(db_session, make_project):
    """``Project.timeline`` resolves to the child Timeline."""
    from sqlalchemy.orm import selectinload

    project = make_project()
    timeline = Timeline(
        project_id=project.id,
        current_stage=TimelineStage.TESTING,
        status=TimelineStatus.IN_PROGRESS,
    )
    db_session.add(timeline)
    db_session.commit()

    # Re-fetch the project with the relationship eager-loaded. The
    # relationship is configured ``lazy="raise"`` so we have to opt
    # in to navigation via an explicit ``selectinload``.
    project = (
        db_session.query(Project)
        .options(selectinload(Project.timeline))
        .filter_by(id=project.id)
        .one()
    )

    assert project.timeline is not None
    assert project.timeline.id == timeline.id
    assert project.timeline.current_stage is TimelineStage.TESTING


def test_unique_constraint_on_project_id(db_session, make_project):
    """Two Timeline rows for the same Project are rejected at flush."""
    from sqlalchemy.exc import IntegrityError

    project = make_project()
    db_session.add(Timeline(project_id=project.id))
    db_session.commit()

    db_session.add(Timeline(project_id=project.id))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_cascade_delete_when_project_removed(db_session, make_workspace):
    """Deleting the parent Project drops its Timeline.

    We create a workspace -> project -> timeline chain explicitly so
    we can ``session.delete(project)`` and observe the cascade.
    """
    workspace = make_workspace(name="Cascade WS")
    project = Project(
        workspace_id=workspace.id,
        name="Cascade project",
        status="planned",  # use the underlying string to avoid enum drift
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    timeline = Timeline(project_id=project.id)
    db_session.add(timeline)
    db_session.commit()

    timeline_id = timeline.id
    project_id = project.id

    db_session.delete(project)
    db_session.commit()

    assert (
        db_session.query(Timeline).filter_by(id=timeline_id).one_or_none()
        is None
    )
    assert (
        db_session.query(Project).filter_by(id=project_id).one_or_none()
        is None
    )


def test_repr_does_not_explode(db_session, make_project):
    """The repr is for debug only, but it must not raise."""
    project = make_project()
    timeline = Timeline(project_id=project.id)
    db_session.add(timeline)
    db_session.commit()

    text = repr(timeline)
    assert "Timeline" in text
    assert str(project.id) in text