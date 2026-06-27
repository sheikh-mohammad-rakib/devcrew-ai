/**
 * Server-only data loader for the Project list.
 *
 * Mirrors `features/workspace/list-loader.ts`:
 *
 *   - Marked ``server-only`` so an accidental Client Component import
 *     becomes a build-time error instead of a silent runtime failure.
 *   - Returns a tagged result (`LoadProjectsResult`) rather than
 *     throwing so the page can render in-place error / empty UIs
 *     instead of bubbling a 500 to Next.js' default error boundary.
 *
 * Why two API calls?
 * ------------------
 * Projects are scoped to a workspace in the backend
 * (``GET /api/v1/workspaces/{ws}/projects``). The current Workspaces
 * feature has no per-workspace detail page, so the global
 * ``/projects`` page can't ask the URL for a workspace id. It:
 *
 *   1. Calls :func:`listWorkspaces` to learn what workspaces exist.
 *   2. If the list is empty, returns the ``no-workspace`` state so the
 *      page can show "Create a workspace first" without ever calling
 *      the projects endpoint.
 *   3. Otherwise picks the newest workspace (``created_at DESC`` is
 *      the backend default) and loads its projects.
 *
 * Picking "newest" is the same heuristic the Workspaces list uses to
 * sort its own cards, so the two pages agree on which workspace is
 * the user's "primary" one for now.
 */

import "server-only";

import { ApiError } from "@/lib/api/client";
import {
  listProjectsForWorkspace,
} from "@/lib/api/project";
import { listWorkspaces } from "@/lib/api/workspace";

import type { LoadProjectsResult } from "@/features/project/types";

export async function loadProjects(): Promise<LoadProjectsResult> {
  // Step 1 — find a workspace to scope the project list to.
  let workspaces;
  try {
    workspaces = await listWorkspaces({ limit: 100 });
  } catch (err) {
    return toErrorResult(err);
  }

  if (workspaces.length === 0) {
    // No workspace exists yet. The page should show "Create a
    // workspace first" — there's nowhere to list projects from.
    return { kind: "no-workspace" };
  }

  // `listWorkspaces` already sorts by created_at DESC, so the first
  // entry is the newest workspace.
  const workspace = workspaces[0]!;

  // Step 2 — load that workspace's projects.
  try {
    const projects = await listProjectsForWorkspace(workspace.id, {
      limit: 100,
    });
    return {
      kind: "ok",
      projects,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  } catch (err) {
    return toErrorResult(err);
  }
}

/**
 * Convert a thrown error into the ``error`` variant of the
 * discriminated union. Centralised so both call sites stay terse.
 */
function toErrorResult(err: unknown): Extract<
  LoadProjectsResult,
  { kind: "error" }
> {
  if (err instanceof ApiError) {
    return {
      kind: "error",
      status: err.status,
      message: err.message,
    };
  }
  // Unknown error (e.g. fetch failed before an ApiError was formed).
  return {
    kind: "error",
    status: 0,
    message: err instanceof Error ? err.message : "Unknown error",
  };
}
