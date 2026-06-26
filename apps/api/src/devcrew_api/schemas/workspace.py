"""Pydantic v2 schemas for the Workspace feature.

The schema layer is the **boundary** between the HTTP world and the
persistence/ORM world. Keeping these DTOs separate from
``devcrew_api.models.workspace`` lets us:

* Evolve the wire-format independently from the database schema.
* Validate and coerce untrusted input before it touches SQLAlchemy.
* Document the API precisely via OpenAPI.

Only two schemas are exposed:

* :class:`WorkspaceCreate` — what the client sends on ``POST``. Only
  fields the user is allowed to set are listed (``name``, optionally
  ``description``).
* :class:`WorkspaceRead` — server-to-client response shape. Includes
  server-generated fields (``id``, ``created_at``, ``updated_at``).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    """Payload accepted by ``POST /api/v1/workspaces``."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Display name for the workspace (max 100 chars).",
        examples=["DevCrew Platform"],
    )

    description: str | None = Field(
        default=None,
        description="Optional long-form description of the workspace.",
        examples=["The flagship multi-agent engineering workspace."],
    )


class WorkspaceRead(BaseModel):
    """Response shape returned by every workspace endpoint."""

    # ``from_attributes=True`` lets Pydantic build the response from a
    # SQLAlchemy ORM instance (``Workspace``) by reading its attributes.
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(
        ...,
        description="Server-generated UUID v4 identifier.",
    )
    name: str = Field(..., description="Display name of the workspace.")
    description: str | None = Field(
        default=None,
        description="Optional long-form description.",
    )
    created_at: datetime = Field(
        ...,
        description="UTC timestamp of when the workspace was created.",
    )
    updated_at: datetime = Field(
        ...,
        description="UTC timestamp of the last modification.",
    )


__all__: list[str] = [
    "WorkspaceCreate",
    "WorkspaceRead",
]