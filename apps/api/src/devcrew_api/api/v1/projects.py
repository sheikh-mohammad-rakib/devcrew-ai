"""HTTP routes for the Project feature.

Endpoints
---------
Nested under a workspace (collection routes):

* ``POST /api/v1/workspaces/{workspace_id}/projects``  — create (201)
* ``GET  /api/v1/workspaces/{workspace_id}/projects``  — list   (200)

Flat (single-resource routes):

* ``GET    /api/v1/projects/{project_id}``            — fetch one (200 / 404)
* ``PATCH  /api/v1/projects/{project_id}``            — partial update (200 / 404)
* ``DELETE /api/v1/projects/{project_id}``            — delete   (204 / 404)

Why the split?
--------------
* Listing and creating are scoped to a workspace, so they live under
  ``/workspaces/{ws}/projects`` to make the URL self-describing.
* Get / update / delete address a single project by id — they don't
  need the workspace in the URL because the project's id is already
  unique. Keeping these flat (``/projects/{id}``) means clients don't
  have to know the parent workspace to act on a known project.

Design notes
------------
* Routes are declared on a module-level ``APIRouter`` and mounted
  under ``/api/v1`` by :mod:`devcrew_api.api.router`.
* Database access goes through :class:`ProjectService`; the route
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

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from devcrew_api.db import get_db
from devcrew_api.schemas.project import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from devcrew_api.services.project_service import (
    ProjectNotFoundError,
    ProjectService,
)
from devcrew_api.services.workspace_service import WorkspaceNotFoundError


# ---------------------------------------------------------------------------
# Routers — one per prefix so we can mount them side-by-side.
# ---------------------------------------------------------------------------

# Collection routes: nested under a workspace. ``prefix`` includes
# the ``workspaces/{workspace_id}/projects`` shape; the workspace id
# is consumed by ``get_workspace_projects`` as a ``Path`` param.
nested_router = APIRouter(
    prefix="/workspaces",
    tags=["projects"],
)

# Single-resource routes: flat under ``/projects``. These don't need
# a workspace id because the project id alone is globally unique.
flat_router = APIRouter(
    prefix="/projects",
    tags=["projects"],
)


# ---------------------------------------------------------------------------
# Dependency aliases — declared once, reused everywhere.
# ---------------------------------------------------------------------------

DbSession = Annotated[Session, Depends(get_db)]


def get_project_service(db: DbSession) -> ProjectService:
    """FastAPI dependency that wires a :class:`ProjectService`.

    Kept here (not in ``services``) because the binding is an
    HTTP-layer concern: it depends on the request-scoped ``Session``.
    """
    return ProjectService(db)


ProjectServiceDep = Annotated[
    ProjectService, Depends(get_project_service)
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _service_error_to_http(
    service_callable,
    *args,
    not_found_exc: type[Exception],
    not_found_status: int = status.HTTP_404_NOT_FOUND,
    **kwargs,
):
    """Invoke ``service_callable`` and translate typed errors to HTTPException.

    Centralises the try/except so every endpoint looks the same. The
    callable may raise either ``not_found_exc`` (mapped to 404) or
    any other exception (propagated unchanged so 5xx / middleware
    can handle it).
    """
    try:
        return service_callable(*args, **kwargs)
    except not_found_exc as exc:
        raise HTTPException(
            status_code=not_found_status,
            detail=str(exc),
        ) from exc


# ---------------------------------------------------------------------------
# Collection routes (nested under a workspace)
# ---------------------------------------------------------------------------

@nested_router.post(
    "/{workspace_id}/projects",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project inside a workspace",
    description=(
        "Create a new project scoped to ``workspace_id``. The parent "
        "workspace must already exist (404 otherwise)."
    ),
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Parent workspace does not exist.",
        },
    },
)
def create_project(
    payload: ProjectCreate,
    service: ProjectServiceDep,
    workspace_id: Annotated[
        uuid.UUID,
        Path(description="UUID of the parent workspace."),
    ],
) -> ProjectRead:
    try:
        project = service.create(workspace_id=workspace_id, payload=payload)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return ProjectRead.model_validate(project)


@nested_router.get(
    "/{workspace_id}/projects",
    response_model=list[ProjectRead],
    summary="List projects in a workspace",
    description=(
        "List projects for one workspace, newest first. Supports "
        "offset pagination via ``skip`` and ``limit``. A missing "
        "workspace id yields an empty list, not a 404."
    ),
)
def list_workspace_projects(
    service: ProjectServiceDep,
    workspace_id: Annotated[
        uuid.UUID,
        Path(description="UUID of the parent workspace."),
    ],
    skip: Annotated[int, Query(ge=0, description="Rows to skip.")] = 0,
    limit: Annotated[
        int,
        Query(ge=1, le=200, description="Maximum rows to return."),
    ] = 50,
) -> list[ProjectRead]:
    projects = service.list_by_workspace(
        workspace_id=workspace_id, skip=skip, limit=limit
    )
    return [ProjectRead.model_validate(p) for p in projects]


# ---------------------------------------------------------------------------
# Single-resource routes (flat)
# ---------------------------------------------------------------------------

@flat_router.get(
    "/{project_id}",
    response_model=ProjectRead,
    summary="Fetch a project",
    description="Fetch a single project by its UUID. Returns 404 if missing.",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "No project exists with that id.",
        },
    },
)
def get_project(
    service: ProjectServiceDep,
    project_id: Annotated[
        uuid.UUID,
        Path(description="Server-generated UUID v4 of the project."),
    ],
) -> ProjectRead:
    try:
        project = service.get(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return ProjectRead.model_validate(project)


@flat_router.patch(
    "/{project_id}",
    response_model=ProjectRead,
    summary="Update a project",
    description=(
        "Partial update. Only the fields explicitly supplied in the "
        "request body are changed; omitted fields are left untouched."
    ),
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "No project exists with that id.",
        },
    },
)
def update_project(
    payload: ProjectUpdate,
    service: ProjectServiceDep,
    project_id: Annotated[
        uuid.UUID,
        Path(description="Server-generated UUID v4 of the project."),
    ],
) -> ProjectRead:
    try:
        project = service.update(project_id, payload)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return ProjectRead.model_validate(project)


@flat_router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
    description=(
        "Delete a project by id. Idempotent: deleting a missing id "
        "returns 204 as if the row were already gone."
    ),
    responses={
        status.HTTP_204_NO_CONTENT: {
            "description": "Project deleted (or was already absent).",
        },
    },
)
def delete_project(
    service: ProjectServiceDep,
    project_id: Annotated[
        uuid.UUID,
        Path(description="Server-generated UUID v4 of the project."),
    ],
) -> None:
    # Idempotent delete — never raises ProjectNotFoundError. We do
    # the existence check explicitly so we don't surface a 204 for a
    # project the client never created (which can mask bugs); we
    # return 404 in that case so the client knows the row was missing.
    try:
        service.get(project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    service.delete(project_id)


__all__: list[str] = ["flat_router", "nested_router"]