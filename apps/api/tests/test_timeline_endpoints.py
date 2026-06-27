"""Tests for the Timeline HTTP endpoints.

These hit the real router via FastAPI's ``TestClient`` so the
dependency-injection wiring, error mapping, and JSON serialization
are all exercised end-to-end. The ``client`` fixture overrides
``get_db`` to a per-test SQLite session.
"""

from __future__ import annotations

import uuid

import pytest

from devcrew_api.models.project import Project
from devcrew_api.models.timeline import Timeline, TimelineStage, TimelineStatus


def _create_via_api(client, project_id, **overrides):
    """Helper: POST a timeline and return the JSON body + status code."""
    body = {}
    if "current_stage" in overrides:
        body["current_stage"] = overrides["current_stage"]
    if "status" in overrides:
        body["status"] = overrides["status"]
    return client.post(f"/api/v1/projects/{project_id}/timeline", json=body)


# ---------------------------------------------------------------------------
# POST /api/v1/projects/{project_id}/timeline
# ---------------------------------------------------------------------------

def test_create_timeline_returns_201_and_payload(client, make_project):
    """Happy path: 201 + the freshly-created timeline."""
    project = make_project()
    response = _create_via_api(
        client,
        project.id,
        current_stage="implementation",
        status="in_progress",
    )
    assert response.status_code == 201, response.text

    body = response.json()
    assert body["project_id"] == str(project.id)
    assert body["current_stage"] == "implementation"
    assert body["status"] == "in_progress"
    assert body["id"]  # server-generated UUID


def test_create_uses_defaults_when_body_omitted(client, make_project):
    """POSTing ``{}`` returns the model defaults."""
    project = make_project()
    response = _create_via_api(client, project.id)
    assert response.status_code == 201

    body = response.json()
    assert body["current_stage"] == "requirements"
    assert body["status"] == "not_started"


def test_create_returns_404_for_unknown_project(client):
    """A missing project surfaces as 404."""
    response = _create_via_api(client, uuid.uuid4())
    assert response.status_code == 404
    assert "project" in response.json()["detail"].lower()


def test_create_returns_409_for_duplicate_timeline(client, make_project):
    """The 1:1 rule surfaces as 409 Conflict."""
    project = make_project()
    first = _create_via_api(client, project.id)
    assert first.status_code == 201

    second = _create_via_api(client, project.id)
    assert second.status_code == 409
    assert "already exists" in second.json()["detail"].lower()


def test_create_rejects_unknown_enum_value(client, make_project):
    """A bogus stage value fails Pydantic's enum check (422)."""
    project = make_project()
    response = client.post(
        f"/api/v1/projects/{project.id}/timeline",
        json={"current_stage": "not_a_real_stage"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/v1/projects/{project_id}/timeline
# ---------------------------------------------------------------------------

def test_get_timeline_returns_existing(client, make_project):
    """Happy path: project has a timeline, we get it back."""
    project = make_project()
    created = _create_via_api(
        client,
        project.id,
        current_stage="testing",
        status="blocked",
    )
    assert created.status_code == 201

    response = client.get(f"/api/v1/projects/{project.id}/timeline")
    assert response.status_code == 200

    body = response.json()
    assert body["project_id"] == str(project.id)
    assert body["current_stage"] == "testing"
    assert body["status"] == "blocked"


def test_get_timeline_returns_404_when_missing(client, make_project):
    """A project with no timeline surfaces as 404."""
    project = make_project()
    response = client.get(f"/api/v1/projects/{project.id}/timeline")
    assert response.status_code == 404
    assert "timeline" in response.json()["detail"].lower()


def test_get_timeline_returns_404_for_unknown_project(client):
    """A missing project id surfaces as 404 with a precise message."""
    response = client.get(f"/api/v1/projects/{uuid.uuid4()}/timeline")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /api/v1/projects/{project_id}/timeline
# ---------------------------------------------------------------------------

def test_patch_timeline_updates_status(client, make_project):
    """PATCH only the status — stage stays the same."""
    project = make_project()
    _create_via_api(
        client, project.id, current_stage="implementation"
    )

    response = client.patch(
        f"/api/v1/projects/{project.id}/timeline",
        json={"status": "blocked"},
    )
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["current_stage"] == "implementation"
    assert body["status"] == "blocked"


def test_patch_timeline_updates_stage(client, make_project):
    """PATCH only the stage — status stays the same."""
    project = make_project()
    _create_via_api(client, project.id, status="in_progress")

    response = client.patch(
        f"/api/v1/projects/{project.id}/timeline",
        json={"current_stage": "testing"},
    )
    assert response.status_code == 200

    body = response.json()
    assert body["current_stage"] == "testing"
    assert body["status"] == "in_progress"


def test_patch_timeline_updates_both(client, make_project):
    """PATCH both fields at once."""
    project = make_project()
    _create_via_api(client, project.id)

    response = client.patch(
        f"/api/v1/projects/{project.id}/timeline",
        json={
            "current_stage": "deployment",
            "status": "in_progress",
        },
    )
    assert response.status_code == 200

    body = response.json()
    assert body["current_stage"] == "deployment"
    assert body["status"] == "in_progress"


def test_patch_timeline_empty_body_is_noop(client, make_project):
    """``PATCH {}`` returns 200 and leaves values unchanged."""
    project = make_project()
    created = _create_via_api(
        client, project.id, current_stage="architecture"
    )
    original_stage = created.json()["current_stage"]
    original_status = created.json()["status"]

    response = client.patch(
        f"/api/v1/projects/{project.id}/timeline", json={}
    )
    assert response.status_code == 200

    body = response.json()
    assert body["current_stage"] == original_stage
    assert body["status"] == original_status


def test_patch_timeline_returns_404_when_missing(client, make_project):
    """PATCH on a project with no timeline surfaces as 404."""
    project = make_project()
    response = client.patch(
        f"/api/v1/projects/{project.id}/timeline",
        json={"status": "in_progress"},
    )
    assert response.status_code == 404


def test_patch_timeline_returns_404_for_unknown_project(client):
    """PATCH on an unknown project id surfaces as 404."""
    response = client.patch(
        f"/api/v1/projects/{uuid.uuid4()}/timeline",
        json={"status": "in_progress"},
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# openapi / docs surface
# ---------------------------------------------------------------------------

def test_timeline_endpoints_appear_in_openapi(client):
    """The new endpoints show up in ``/openapi.json``."""
    response = client.get("/openapi.json")
    assert response.status_code == 200

    paths = response.json()["paths"]
    assert "/api/v1/projects/{project_id}/timeline" in paths

    operations = paths["/api/v1/projects/{project_id}/timeline"]
    assert "get" in operations
    assert "post" in operations
    assert "patch" in operations