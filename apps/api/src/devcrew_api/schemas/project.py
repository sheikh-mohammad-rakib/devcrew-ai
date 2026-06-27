"""Pydantic v2 schemas for the Project feature.

The schema layer is the **boundary** between the HTTP world and the
persistence/ORM world. Keeping these DTOs separate from
``devcrew_api.models.project`` lets us:

* Evolve the wire-format independently from the database schema.
* Validate and coerce untrusted input before it touches SQLAlchemy.
* Document the API precisely via OpenAPI.

Schemas exposed
---------------
* :class:`ProjectCreate`  — ``POST`` payload (workspace_id + user-supplied fields).
* :class:`ProjectUpdate`  — ``PATCH`` payload (any subset of mutable fields).
* :class:`ProjectRead`    — server-to-client response shape.

The :class:`ProjectStatus` enum is the canonical Python-level value
used by all three schemas. It mirrors the enum stored in the database
(``devcrew_api.models.project.ProjectStatus``).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from devcrew_api.models.project import ProjectStatus

# Re-export the status enum so callers don't have to reach into the
# ``models`` package just to reference a status value.
__all__ = [
    "ProjectCreate",
    "ProjectRead",
    "ProjectStatus",
    "ProjectUpdate",
]


class ProjectCreate(BaseModel):
    """Payload accepted by ``POST /api/v1/workspaces/{ws}/projects``.

    The ``workspace_id`` is taken from the URL path, not the body, so
    the body only carries the user-supplied fields. ``status`` is
    optional and defaults to :attr:`ProjectStatus.PLANNED`.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Display name for the project (max 100 chars).",
        examples=["Refactor billing service"],
    )

    description: str | None = Field(
        default=None,
        description="Optional long-form description of the project.",
        examples=["Decompose the monolithic billing service into 3 microservices."],
    )

    status: ProjectStatus = Field(
        default=ProjectStatus.PLANNED,
        description="Initial lifecycle state. Defaults to 'planned'.",
        examples=[ProjectStatus.PLANNED, ProjectStatus.ACTIVE],
    )


class ProjectUpdate(BaseModel):
    """Payload accepted by ``PATCH /api/v1/projects/{id}``.

    Every field is optional — clients send only the keys they want to
    change. An empty payload is a no-op (the service still bumps
    ``updated_at`` if needed but otherwise leaves the row alone).
    """

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="New display name (1–100 chars). Omit to leave unchanged.",
    )

    description: str | None = Field(
        default=None,
        description="New description. Pass an empty string to clear (or null).",
    )

    status: ProjectStatus | None = Field(
        default=None,
        description="New lifecycle state. Omit to leave unchanged.",
    )


class ProjectRead(BaseModel):
    """Response shape returned by every project endpoint."""

    # ``from_attributes=True`` lets Pydantic build the response from a
    # SQLAlchemy ORM instance (``Project``) by reading its attributes.
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(
        ...,
        description="Server-generated UUID v4 identifier.",
    )
    workspace_id: uuid.UUID = Field(
        ...,
        description="Workspace this project belongs to.",
    )
    name: str = Field(..., description="Display name of the project.")
    description: str | None = Field(
        default=None,
        description="Optional long-form description.",
    )
    status: ProjectStatus = Field(
        ...,
        description="Lifecycle state of the project.",
    )
    created_at: datetime = Field(
        ...,
        description="UTC timestamp of when the project was created.",
    )
    updated_at: datetime = Field(
        ...,
        description="UTC timestamp of the last modification.",
    )