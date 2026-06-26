/**
 * Frontend API bindings for the Workspace feature.
 *
 * Each function is a thin wrapper over the generic {@link apiGet} /
 * {@link apiPost} helpers in `./client.ts`. Centralising them here:
 *
 *   1. Pins the URL paths in one place so a server-side rename only
 *      touches this file.
 *   2. Pins the request/response types so feature components don't
 *      have to redeclare them inline.
 *   3. Lets us add cross-cutting behaviour later (retry, optimistic
 *      updates, telemetry) without touching call sites.
 *
 * Types mirror the FastAPI Pydantic schemas:
 *   - `WorkspaceCreate`  → POST /api/v1/workspaces body
 *   - `Workspace`         → GET /api/v1/workspaces/{id} response
 *   - The list endpoint returns `Workspace[]`.
 */

import { apiGet, apiPost } from "./client";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** Payload accepted by `POST /api/v1/workspaces`. */
export interface WorkspaceCreateInput {
  /** Required display name (1–100 chars). */
  name: string;
  /** Optional long-form description. */
  description?: string | null;
}

/**
 * Response shape returned by every workspace endpoint. Mirrors the
 * FastAPI `WorkspaceRead` schema.
 */
export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* Endpoint helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all workspaces.
 *
 * The server returns rows ordered by `created_at DESC`. Supports
 * pagination via `skip` and `limit`; the backend caps `limit` at 200.
 *
 * @throws {ApiError} on network / non-2xx responses.
 */
export function listWorkspaces(
  params: { skip?: number; limit?: number } = {},
): Promise<Workspace[]> {
  const search = new URLSearchParams();
  if (params.skip !== undefined) search.set("skip", String(params.skip));
  if (params.limit !== undefined) search.set("limit", String(params.limit));

  const query = search.toString();
  const path = query.length > 0
    ? `/api/v1/workspaces?${query}`
    : "/api/v1/workspaces";

  return apiGet<Workspace[]>(path);
}

/**
 * Create a new workspace.
 *
 * @returns The newly-created `Workspace`, including its server-generated
 *   `id` and timestamps.
 * @throws {ApiError} on validation failure (422) or transport error.
 */
export function createWorkspace(
  input: WorkspaceCreateInput,
): Promise<Workspace> {
  return apiPost<Workspace, WorkspaceCreateInput>(
    "/api/v1/workspaces",
    input,
  );
}

/**
 * Fetch a single workspace by id.
 *
 * @throws {ApiError} with `status === 404` if the workspace does not
 *   exist; `status === 422` if `id` is not a valid UUID.
 */
export function getWorkspace(id: string): Promise<Workspace> {
  // Defensive URL encoding — `id` is a UUID but encoding is cheap and
  // protects against any caller passing a weird value.
  const safeId = encodeURIComponent(id);
  return apiGet<Workspace>(`/api/v1/workspaces/${safeId}`);
}