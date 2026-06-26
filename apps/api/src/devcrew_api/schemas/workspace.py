"""Pydantic v2 schemas for the Workspace feature.

The schema layer is the **boundary** between the HTTP world and the
persistence/ORM world. Keeping these DTOs separate from
``devcrew_api.models`` lets us:

* Evolve the wire-format independently from the database schema.
* Validate and coerce untrusted input before it touches SQLAlchemy.
* Document the API precisely via OpenAPI.

Three schema flavors are exposed:

* :class:`WorkspaceCreate` — what the client sends on POST. Only
  fields the user is allowed to set are listed.
* :class:`WorkspaceUpdate` — partial-update payload. Every field is
  optional so the client can PATCH-style the resource.
* :class:`WorkspaceRead` — server-to-client response shape. Includes
  server-generated fields (``id``, timestamps, ``is_active``).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceBase(BaseModel):
    """Shared fields between create / read / update schemas."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Human-readable display name for the workspace.",
        examples=["DevCrew Platform"],
    )

    slug: str = Field(
        ...,
        min_length=1,
        max_length=255,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description=(
            "URL-safe identifier. Lowercase letters, digits, and single "
            "hyphens. Must be unique across the system."
        ),
        examples=["devcrew-platform"],
    )

    description: str | None = Field(
        default=None,
        description="Optional long-form description of the workspace.",
        examples=["The flagship multi-agent engineering workspace."],
    )


class WorkspaceCreate(WorkspaceBase):
    """Payload accepted by ``POST /api/v1/workspaces``."""


class WorkspaceUpdate(BaseModel):
    """Payload accepted by partial updates (PATCH).

    All fields are optional so the client can send any subset.
    """

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    description: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class WorkspaceRead(WorkspaceBase):
    """Response shape returned by every workspace endpoint."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(
        ...,
        description="Server-generated UUID v4 identifier.",
    )
    is_active: bool = Field(
        ...,
        description="Whether the workspace is currently active.",
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
    "WorkspaceUpdate",
]
