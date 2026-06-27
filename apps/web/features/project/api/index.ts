/**
 * Feature-local API surface for the Project feature.
 *
 * Re-exports the bindings that live in ``@/lib/api/project`` so the
 * Project feature has a self-contained public API. The actual
 * implementation is in ``lib/api/project.ts`` to keep parity with
 * the Workspace feature, which also keeps its bindings at the top
 * level under ``@/lib/api/workspace``.
 *
 * Why this barrel exists
 * ----------------------
 * Callers should be able to import the Project feature's API
 * surface as:
 *
 *     import { listProjects, createProject, … } from
 *       "@/features/project/api";
 *
 * without reaching into the cross-feature ``@/lib/api/`` namespace.
 * If we later decide to fold the binding into the feature folder
 * (matching the spec's recommended structure), we can move the
 * implementation here and the importers don't need to change.
 *
 * Endpoint shape
 * --------------
 * The Project resource spans two URL shapes:
 *
 *   - Collection routes are nested under a workspace:
 *       GET  /api/v1/workspaces/{workspace_id}/projects
 *       POST /api/v1/workspaces/{workspace_id}/projects
 *   - Single-resource routes are flat:
 *       GET    /api/v1/projects/{project_id}
 *       PATCH  /api/v1/projects/{project_id}
 *       DELETE /api/v1/projects/{project_id}
 */

export {
  // Types
  type Project,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  // Endpoint helpers
  listProjectsForWorkspace as listProjects,
  createProjectForWorkspace as createProject,
  getProject,
  updateProject,
  deleteProject,
} from "@/lib/api/project";