"""HTTP routes for the Timeline feature.

Endpoints
---------
All three endpoints are nested under the owning project — the URL
self-describes the parent:

* ``GET    /api/v1/projects/{project_id}/timeline`` — fetch the
  project's timeline (200 / 404).
* ``POST   /api/v1/projects/{project_id}/timeline`` — create a new
  timeline for the project (201 / 404 / 409).
* ``PATCH  /api/v1/projects/{project_id}/timeline`` — partial update
  on the existing timeline (200 / 404).

Why the nested URL shape?
------------------------
The Timeline is a 1:1 child of Project — there's exactly one per
project. Nesting the URL under the project makes the relationship
self-describing and lets the client reason about which Timeline they
get without an extra id round-trip. (A flat ``/timelines/{id}`` shape
would also work, but it would require the client to know the timeline
id, which they never do — only the project id is part of the user's
mental model.)

Design notes
------------
* Routes are declared on a module-level ``APIRouter`` and mounted
  under ``/api/v1`` by :mod:`devcrew_api.api.router`.
* Database access goes through :class:`TimelineService`; the route
  handler is responsible only for HTTP concerns (status codes, body
  shape, error mapping).
* ``Annotated[..., Depends(...)]`` aliases keep handler signatures
  tidy and let us swap implementations in tests with
  ``app.dependency_overrides[...]``.
* All 4xx errors are raised as :class:`fastapi.HTTPException` so
  FastAPI returns its standard error envelope.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from devcrew_api.db import get_db
from devcrew_api.schemas.timeline import (
    TimelineCreate,
    TimelineRead,
    TimelineUpdate,
)
from devcrew_api.services.project_service import ProjectNotFoundError
from devcrew_api.services.timeline_service import (
    TimelineAlreadyExistsError,
    TimelineNotFoundError,
    TimelineService,
)


# ---------------------------------------------------------------------------
# Router — nested under projects.
# ---------------------------------------------------------------------------

# All Timeline routes are nested under ``projects``. ``prefix`` carries
# the shape; the project id is consumed by each handler as a ``Path``
# param. ``tags=["timelines"]`` groups these endpoints under one
# heading in Swagger / ReDoc.
router = APIRouter(
    prefix="/projects",
    tags=["timelines"],
)


# ---------------------------------------------------------------------------
# Dependency aliases — declared once, reused everywhere.
# ---------------------------------------------------------------------------

DbSession = Annotated[Session, Depends(get_db)]


def get_timeline_service(db: DbSession) -> TimelineService:
    """FastAPI dependency that wires a :class:`TimelineService`.

    Kept here (not in ``services``) because the binding is an
    HTTP-layer concern: it depends on the request-scoped ``Session``.
    """
    return TimelineService(db)


TimelineServiceDep = Annotated[
    TimelineService, Depends(get_timeline_service)
]


# ---------------------------------------------------------------------------
# GET /projects/{project_id}/timeline — fetch
# ---------------------------------------------------------------------------

@router.get(
    "/{project_id}/timeline",
    response_model=TimelineRead,
    summary="Fetch a project's timeline",
    description=(
        "Fetch the timeline owned by ``project_id``. Returns 404 if "
        "the project doesn't exist or has no timeline yet."
    ),
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": (
                "No project exists with that id, or the project has "
                "no timeline yet."
            ),
        },
    },
)
def get_project_timeline(
    service: TimelineServiceDep,
    project_id: Annotated[
        uuid.UUID,
        Path(description="Server-generated UUID v4 of the project."),
    ],
) -> TimelineRead:
    try:
        timeline = service.get_by_project(project_id)
    except TimelineNotFoundError as exc:
        # ``TimelineNotFoundError`` collapses two cases — missing
        # project OR existing project without a timeline — into one
        # 404. The error message distinguishes them. A future
        # refinement could split the response, but for now 404 with
        # a precise message is enough.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return TimelineRead.model_validate(timeline)


# ---------------------------------------------------------------------------
# POST /projects/{project_id}/timeline — create
# ---------------------------------------------------------------------------

@router.post(
    "/{project_id}/timeline",
    response_model=TimelineRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a timeline for a project",
    description=(
        "Create a new timeline owned by ``project_id``. The parent "
        "project must already exist (404 otherwise). Returns 409 if "
        "the project already has a timeline (1:1 cardinality)."
    ),
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Parent project does not exist.",
        },
        status.HTTP_409_CONFLICT: {
            "description": "Project already has a timeline.",
        },
    },
)
def create_project_timeline(
    payload: TimelineCreate,
    service: TimelineServiceDep,
    project_id: Annotated[
        uuid.UUID,
        Path(description="UUID of the parent project."),
    ],
) -> TimelineRead:
    try:
        timeline = service.create(project_id=project_id, payload=payload)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except TimelineAlreadyExistsError as exc:
        # 409 Conflict — the request is well-formed but conflicts
        # with the current state of the resource (a timeline already
        # exists for this project). The client should PATCH the
        # existing timeline instead.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return TimelineRead.model_validate(timeline)


# ---------------------------------------------------------------------------
# PATCH /projects/{project_id}/timeline — partial update
# ---------------------------------------------------------------------------

@router.patch(
    "/{project_id}/timeline",
    response_model=TimelineRead,
    summary="Update a project's timeline",
    description=(
        "Partial update. Only the fields explicitly supplied in the "
        "request body are changed; omitted fields are left untouched."
    ),
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": (
                "No project exists with that id, or the project has "
                "no timeline yet."
            ),
        },
    },
)
def update_project_timeline(
    payload: TimelineUpdate,
    service: TimelineServiceDep,
    project_id: Annotated[
        uuid.UUID,
        Path(description="Server-generated UUID v4 of the project."),
    ],
) -> TimelineRead:
    try:
        timeline = service.update_by_project(project_id, payload)
    except TimelineNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return TimelineRead.model_validate(timeline)


__all__: list[str] = ["router"]