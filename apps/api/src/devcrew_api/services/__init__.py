"""Service layer for DevCrew AI.

Each domain feature exposes its service via a thin re-export so the
rest of the codebase can import ``from devcrew_api.services import
WorkspaceService`` without reaching into submodules.
"""

from devcrew_api.services.project_service import (
    ProjectNotFoundError,
    ProjectService,
    ProjectServiceError,
)
from devcrew_api.services.timeline_service import (
    TimelineAlreadyExistsError,
    TimelineNotFoundError,
    TimelineService,
    TimelineServiceError,
)
from devcrew_api.services.workspace_service import (
    WorkspaceNotFoundError,
    WorkspaceService,
    WorkspaceServiceError,
)

__all__: list[str] = [
    "ProjectNotFoundError",
    "ProjectService",
    "ProjectServiceError",
    "TimelineAlreadyExistsError",
    "TimelineNotFoundError",
    "TimelineService",
    "TimelineServiceError",
    "WorkspaceNotFoundError",
    "WorkspaceService",
    "WorkspaceServiceError",
]