/**
 * Frontend API bindings for the Project feature.
 *
 * Mirrors `lib/api/workspace.ts`. Each function is a thin wrapper
 * over the generic {@link apiGet} / {@link apiPost} helpers in
 * `./client.ts`. Centralising them here:
 *
 *   1. Pins the URL paths in one place so a server-side rename only
 *      touches this file.
 *   2. Pins the request/response types so feature components don't
 *      have to redeclare them inline.
 *   3. Lets us add cross-cutting behaviour later (retry, optimistic
 *      updates, telemetry) without touching call sites.
 *
 * Types mirror the FastAPI Pydantic schemas:
 *   - `ProjectCreateInput`  → POST /api/v1/workspaces/{ws}/projects body
 *   - `Project`             → GET responses (list + single)
 *
 * Endpoint layout
 * ---------------
 * Project resources are split across two URL shapes:
 *
 *   - Collection routes are nested under a workspace:
 *       GET  /api/v1/workspaces/{workspace_id}/projects
 *       POST /api/v1/workspaces/{workspace_id}/projects
 *   - Single-resource routes are flat:
 *       GET /api/v1/projects/{project_id}
 *       PATCH /api/v1/projects/{project_id}
 *       DELETE /api/v1/projects/{project_id}
 *
 * This binding exposes only the operations the frontend currently
 * needs (list scoped to a workspace, create, fetch one). Update and
 * delete helpers will be added when those UI affordances land.
 */

import { apiGet, apiPatch, apiPost, apiDelete } from "./client";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** Payload accepted by `POST /api/v1/workspaces/{ws}/projects`. */
export interface ProjectCreateInput {
  /** Required display name (1–100 chars). */
  name: string;
  /** Optional long-form description. */
  description?: string | null;
  /**
   * Optional initial status. The backend accepts any
   * :class:`ProjectStatus` enum value (`planned`, `active`, `paused`,
   * `completed`, `archived`). Omit to let the backend default to
   * `planned`.
   */
  status?: string;
}

/**
 * Payload accepted by `PATCH /api/v1/projects/{project_id}`.
 *
 * All fields are optional — the backend applies a partial update
 * (only the fields present are changed). To explicitly clear the
 * description, pass ``description: null``.
 */
export interface ProjectUpdateInput {
  /** New display name (1–100 chars). */
  name?: string;
  /** New description, or ``null`` to clear. */
  description?: string | null;
  /**
   * New lifecycle status. Accepts any of the backend enum values
   * (`planned`, `active`, `paused`, `completed`, `archived`).
   */
  status?: string;
}

/**
 * Response shape returned by every project endpoint. Mirrors the
 * FastAPI `ProjectRead` schema.
 *
 * `status` is the backend string (lowercase enum value), NOT the
 * uppercase frontend badge enum. To render a
 * :class:`ProjectStatusBadge`, pass `status` through
 * {@link backendStatusToBadgeStatus} first.
 */
export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* Endpoint helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all projects for a single workspace, newest first.
 *
 * @throws {ApiError} on network / non-2xx responses. Notably, a
 *   missing workspace does NOT 404 here — it returns an empty array.
 *   That matches the backend's contract.
 */
export function listProjectsForWorkspace(
  workspaceId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Project[]> {
  const search = new URLSearchParams();
  if (params.skip !== undefined) search.set("skip", String(params.skip));
  if (params.limit !== undefined) search.set("limit", String(params.limit));

  const query = search.toString();
  const safeWsId = encodeURIComponent(workspaceId);
  const path =
    `/api/v1/workspaces/${safeWsId}/projects` +
    (query.length > 0 ? `?${query}` : "");

  return apiGet<Project[]>(path);
}

/**
 * Create a new project inside a workspace.
 *
 * @returns The newly-created `Project`, including its server-generated
 *   `id`, `workspace_id`, `status`, and timestamps.
 * @throws {ApiError} on validation failure (422) — most commonly when
 *   the parent workspace id does not exist (the backend maps this to
 *   a 404) or when `name` is empty / over 100 chars (422).
 */
export function createProjectForWorkspace(
  workspaceId: string,
  input: ProjectCreateInput,
): Promise<Project> {
  const safeWsId = encodeURIComponent(workspaceId);
  return apiPost<Project, ProjectCreateInput>(
    `/api/v1/workspaces/${safeWsId}/projects`,
    input,
  );
}

/**
 * Fetch a single project by id.
 *
 * @throws {ApiError} with `status === 404` if the project does not
 *   exist; `status === 422` if `id` is not a valid UUID.
 */
export function getProject(projectId: string): Promise<Project> {
  const safeId = encodeURIComponent(projectId);
  return apiGet<Project>(`/api/v1/projects/${safeId}`);
}

/**
 * Update a project's mutable fields (partial update).
 *
 * Only the fields present on ``input`` are sent to the backend; the
 * others remain unchanged. The backend's PATCH semantics mirror this
 * (FastAPI ``model_dump(exclude_unset=True)``).
 *
 * @throws {ApiError} with ``status === 404`` if the project does not
 *   exist; ``status === 422`` on validation failure.
 */
export function updateProject(
  projectId: string,
  input: ProjectUpdateInput,
): Promise<Project> {
  const safeId = encodeURIComponent(projectId);
  return apiPatch<Project, ProjectUpdateInput>(
    `/api/v1/projects/${safeId}`,
    input,
  );
}

/**
 * Delete a project.
 *
 * Returns ``void`` — the backend responds with ``204 No Content`` on
 * success. Callers that don't care about the response body should
 * just ``await`` this and continue.
 *
 * @throws {ApiError} with ``status === 404`` if the project does not
 *   exist.
 */
export function deleteProject(projectId: string): Promise<void> {
  const safeId = encodeURIComponent(projectId);
  return apiDelete<void>(`/api/v1/projects/${safeId}`);
}