"""Top-level API router for DevCrew AI.

Composes the versioned routers (``/api/v1/...``) plus unversioned
utility endpoints (currently the ``/health`` probe).

The version prefix lives here so individual feature routers can stay
agnostic of the URL scheme — they only declare their own internal
prefix (e.g. ``/workspaces``).
"""

from fastapi import APIRouter

from devcrew_api.api.health import router as health_router
from devcrew_api.api.v1 import (
    projects_flat_router,
    projects_nested_router,
    timelines_router,
    workspaces_router,
)

api_router = APIRouter()

# Health and infrastructure endpoints — no version prefix.
api_router.include_router(health_router)

# Versioned feature routers. ``/api/v1`` is the namespace; each
# sub-router adds its own prefix on top of it.
api_router.include_router(workspaces_router, prefix="/api/v1")
# Projects are exposed under two prefixes: a nested collection route
# (scoped to a workspace) and a flat single-resource route.
api_router.include_router(projects_nested_router, prefix="/api/v1")
api_router.include_router(projects_flat_router, prefix="/api/v1")
# Timelines are nested under projects (1:1 child).
api_router.include_router(timelines_router, prefix="/api/v1")