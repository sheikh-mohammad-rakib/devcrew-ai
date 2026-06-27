"""Pydantic v2 schemas for the Timeline feature.

The schema layer is the **boundary** between the HTTP world and the
persistence/ORM world. Keeping these DTOs separate from
``devcrew_api.models.timeline`` lets us:

* Evolve the wire-format independently from the database schema.
* Validate and coerce untrusted input before it touches SQLAlchemy.
* Document the API precisely via OpenAPI.

Schemas exposed
---------------
* :class:`TimelineCreate` — ``POST`` payload. Only fields the client
  is allowed to set on creation are listed (``current_stage`` and
  ``status`` are optional and default to the model-level defaults
  ``REQUIREMENTS`` / ``NOT_STARTED``).
* :class:`TimelineUpdate` — ``PATCH`` payload. Every field is optional;
  the service layer applies only the keys the client actually sent.
* :class:`TimelineRead`   — server-to-client response shape.

The :class:`TimelineStage` and :class:`TimelineStatus` enums are the
canonical Python-level values used by all three schemas. They mirror
the enums stored in the database
(``devcrew_api.models.timeline.TimelineStage`` /
``.TimelineStatus``) — the schema layer re-imports them so callers
don't have to reach into the ``models`` package.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from devcrew_api.models.timeline import TimelineStage, TimelineStatus

# Re-export the enums so callers don't have to reach into ``models``.
__all__ = [
    "TimelineCreate",
    "TimelineRead",
    "TimelineStage",
    "TimelineStatus",
    "TimelineUpdate",
]


class TimelineCreate(BaseModel):
    """Payload accepted by ``POST /api/v1/projects/{project_id}/timeline``.

    The ``project_id`` is taken from the URL path, not the body, so the
    body only carries the user-supplied fields. Both ``current_stage``
    and ``status`` are optional; omitting them lets the model apply
    its server-side defaults (``REQUIREMENTS`` / ``NOT_STARTED``).
    """

    current_stage: TimelineStage = Field(
        default=TimelineStage.REQUIREMENTS,
        description=(
            "Initial stage the timeline starts in. "
            "Defaults to 'requirements'."
        ),
        examples=[TimelineStage.REQUIREMENTS, TimelineStage.ARCHITECTURE],
    )

    status: TimelineStatus = Field(
        default=TimelineStatus.NOT_STARTED,
        description=(
            "Initial progress state. Defaults to 'not_started'."
        ),
        examples=[TimelineStatus.NOT_STARTED, TimelineStatus.IN_PROGRESS],
    )


class TimelineUpdate(BaseModel):
    """Payload accepted by ``PATCH /api/v1/projects/{project_id}/timeline``.

    Every field is optional — clients send only the keys they want to
    change. An empty payload is a true no-op: the service still bumps
    ``updated_at`` (because the row is touched) but leaves every
    column untouched.
    """

    current_stage: TimelineStage | None = Field(
        default=None,
        description=(
            "New stage. Omit to leave unchanged. Forward / backward "
            "transitions are not enforced at the schema layer."
        ),
    )

    status: TimelineStatus | None = Field(
        default=None,
        description="New progress state. Omit to leave unchanged.",
    )


class TimelineRead(BaseModel):
    """Response shape returned by every timeline endpoint."""

    # ``from_attributes=True`` lets Pydantic build the response from a
    # SQLAlchemy ORM instance (``Timeline``) by reading its attributes.
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(
        ...,
        description="Server-generated UUID v4 identifier.",
    )
    project_id: uuid.UUID = Field(
        ...,
        description="Project this timeline belongs to.",
    )
    current_stage: TimelineStage = Field(
        ...,
        description="Ordered stage the timeline is currently in.",
    )
    status: TimelineStatus = Field(
        ...,
        description="Parallel progress state for the work in current_stage.",
    )
    created_at: datetime = Field(
        ...,
        description="UTC timestamp of when the timeline was created.",
    )
    updated_at: datetime = Field(
        ...,
        description="UTC timestamp of the last modification.",
    )