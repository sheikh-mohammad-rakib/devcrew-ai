"""HTTP routes for the Workspace feature.

Endpoints
---------
* ``POST   /api/v1/workspaces``         — create a new workspace
* ``GET    /api/v1/workspaces``         — list workspaces (paginated)
* ``GET    /api/v1/workspaces/{id}``    — fetch a single workspace

Design notes
------------
* Routes are declared on a module-level ``APIRouter`` so they can be
  included under a versioned prefix in :mod:`devcrew_api.api.router`.
* Database access goes through :class:`WorkspaceService`; the route
  handler is responsible only for HTTP concerns (status codes, body
  shape, error mapping).
* ``Annotated[..., Depends(...)]`` aliases keep signatures tidy and
  avoid repeating the boilerplate inside each handler.
* All 4xx errors raise :class:`fastapi.HTTPException` — FastAPI turns
  them into a standard error envelope and the right status code.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from devcrew_api.db import get_db
from devcrew_api.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceRead,
)
from devcrew_api.services.workspace_service import (
    WorkspaceNotFoundError,
    WorkspaceService,
    WorkspaceSlugConflictError,
)

# ``tags`` groups the endpoints in Swagger / ReDoc.
router = APIRouter(
    prefix="/workspaces",
    tags=["workspaces"],
)

# Reusable dependency aliases ----------------------------------------------------
DbSession = Annotated[Session, Depends(get_db)]


def get_workspace_service(db: DbSession) -> WorkspaceService:
    """FastAPI dependency that wires a :class:`WorkspaceService`.

    Kept here (rather than in ``services``) because the binding is an
    HTTP-layer concern: it depends on the request-scoped ``Session``.
    """
    return WorkspaceService(db)


WorkspaceServiceDep = Annotated[WorkspaceService, Depends(get_workspace_service)]


# --------------------------------------------------------------------------- POST
@router.post(
    "",
    response_model=WorkspaceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a workspace",
    description=(
        "Create a new workspace. Returns ``409 Conflict`` if the "
        "supplied ``slug`` is already in use."
    ),
)
def create_workspace(
    payload: WorkspaceCreate,
    service: WorkspaceServiceDep,
) -> WorkspaceRead:
    try:
        workspace = service.create(payload)
    except WorkspaceSlugConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return WorkspaceRead.model_validate(workspace)


# ---------------------------------------------------------------------------- LIST
@router.get(
    "",
    response_model=list[WorkspaceRead],
    summary="List workspaces",
    description=(
        "List workspaces ordered by most-recently-created first. "
        "Supports offset pagination via ``skip`` and ``limit``."
    ),
)
def list_workspaces(
    service: WorkspaceServiceDep,
    skip: Annotated[int, Query(ge=0, description="Number of rows to skip.")] = 0,
    limit: Annotated[
        int,
        Query(ge=1, le=200, description="Maximum rows to return."),
    ] = 50,
    active_only: Annotated[
        bool,
        Query(description="If true, exclude soft-deleted workspaces."),
    ] = False,
) -> list[WorkspaceRead]:
    workspaces = service.list(skip=skip, limit=limit, active_only=active_only)
    return [WorkspaceRead.model_validate(w) for w in workspaces]


# ----------------------------------------------------------------------------- GET
@router.get(
    "/{workspace_id}",
    response_model=WorkspaceRead,
    summary="Fetch a workspace",
    description="Fetch a single workspace by its UUID. Returns ``404`` if missing.",
)
def get_workspace(
    service: WorkspaceServiceDep,
    workspace_id: Annotated[
        uuid.UUID,
        Path(description="Server-generated UUID v4 of the workspace."),
    ],
) -> WorkspaceRead:
    try:
        workspace = service.get(workspace_id)
    except WorkspaceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return WorkspaceRead.model_validate(workspace)


__all__: list[str] = ["router"]
