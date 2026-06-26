"""HTTP routes for the Workspace feature.

Endpoints
---------
* ``POST /api/v1/workspaces``         — create a new workspace (201)
* ``GET  /api/v1/workspaces``         — list workspaces (200)
* ``GET  /api/v1/workspaces/{id}``    — fetch a workspace (200 / 404)

Design notes
------------
* Routes are declared on a module-level ``APIRouter`` and mounted
  under ``/api/v1`` by :mod:`devcrew_api.api.router`. This keeps the
  router unaware of the URL scheme version.
* Database access goes through :class:`WorkspaceService`; the route
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
from devcrew_api.schemas.workspace import WorkspaceCreate, WorkspaceRead
from devcrew_api.services.workspace_service import (
    WorkspaceNotFoundError,
    WorkspaceService,
)

# ``tags`` groups these endpoints under one heading in Swagger / ReDoc.
router = APIRouter(
    prefix="/workspaces",
    tags=["workspaces"],
)


# ---------------------------------------------------------------------------
# Dependency aliases — declared once, reused everywhere.
# ---------------------------------------------------------------------------
DbSession = Annotated[Session, Depends(get_db)]


def get_workspace_service(db: DbSession) -> WorkspaceService:
    """FastAPI dependency that wires a :class:`WorkspaceService`.

    Kept here (not in ``services``) because the binding is an
    HTTP-layer concern: it depends on the request-scoped ``Session``.
    """
    return WorkspaceService(db)


WorkspaceServiceDep = Annotated[
    WorkspaceService, Depends(get_workspace_service)
]


# ---------------------------------------------------------------------------
# POST /workspaces — create
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=WorkspaceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a workspace",
    description="Create a new workspace and return its server-generated id.",
)
def create_workspace(
    payload: WorkspaceCreate,
    service: WorkspaceServiceDep,
) -> WorkspaceRead:
    workspace = service.create(payload)
    return WorkspaceRead.model_validate(workspace)


# ---------------------------------------------------------------------------
# GET /workspaces — list
# ---------------------------------------------------------------------------
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
    skip: Annotated[int, Query(ge=0, description="Rows to skip.")] = 0,
    limit: Annotated[
        int,
        Query(ge=1, le=200, description="Maximum rows to return."),
    ] = 50,
) -> list[WorkspaceRead]:
    workspaces = service.list(skip=skip, limit=limit)
    return [WorkspaceRead.model_validate(w) for w in workspaces]


# ---------------------------------------------------------------------------
# GET /workspaces/{workspace_id} — fetch one
# ---------------------------------------------------------------------------
@router.get(
    "/{workspace_id}",
    response_model=WorkspaceRead,
    summary="Fetch a workspace",
    description="Fetch a single workspace by its UUID. Returns 404 if missing.",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "No workspace exists with that id.",
        }
    },
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
        # Translate the typed service error into the right HTTP code.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return WorkspaceRead.model_validate(workspace)


__all__: list[str] = ["router"]
