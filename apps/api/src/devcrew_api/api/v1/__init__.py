"""v1 of the DevCrew AI HTTP API.

Re-exports every v1 router so :mod:`devcrew_api.api.router` can mount
them in one place. Adding a new feature is a two-step process:

1. Create the new router module under this package.
2. Add its ``router`` to ``__all__`` and import below.
"""

from devcrew_api.api.v1.workspaces import router as workspaces_router

__all__: list[str] = ["workspaces_router"]
