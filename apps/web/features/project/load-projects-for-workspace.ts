/**
 * Server-only data loader for a single workspace's project list.
 *
 * Used by the per-workspace route
 * ``/workspaces/[workspaceId]/projects``. The workspace id comes
 * from the URL, so there's no "no workspace" state to worry about
 * — but the workspace id might not exist on the backend anymore,
 * so we surface a 404 as the ``error`` variant.
 *
 * Mirrors :func:`loadProjects` (the global list loader) but takes
 * the workspace id directly instead of looking it up.
 *
 * Tagged-result shape
 * -------------------
 * Returns a {@link LoadProjectsResult} so the same
 * :class:`ProjectsPageView` can render either this loader's
 * output or the global loader's output. The ``no-workspace``
 * variant is never returned by this loader — if the workspace id
 * is missing the API responds with 404 and we surface that as the
 * ``error`` variant instead.
 *
 * Server-only
 * -----------
 * Marked ``server-only`` so an accidental Client Component import
 * becomes a build-time error.
 */

import "server-only";

import { ApiError } from "@/lib/api/client";
import { getWorkspace } from "@/lib/api/workspace";
import { listProjectsForWorkspace } from "@/lib/api/project";

import type { LoadProjectsResult } from "@/features/project/types";

export async function loadProjectsForWorkspace(
  workspaceId: string,
): Promise<LoadProjectsResult> {
  // Resolve the workspace name first — if the workspace doesn't
  // exist we want to surface a 404-shaped error before doing the
  // (more expensive) project list call.
  let workspaceName: string;
  try {
    const ws = await getWorkspace(workspaceId);
    workspaceName = ws.name;
  } catch (err) {
    return toErrorResult(err);
  }

  try {
    const projects = await listProjectsForWorkspace(workspaceId, {
      limit: 100,
    });
    return {
      kind: "ok",
      projects,
      workspaceId,
      workspaceName,
    };
  } catch (err) {
    return toErrorResult(err);
  }
}

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
  return {
    kind: "error",
    status: 0,
    message: err instanceof Error ? err.message : "Unknown error",
  };
}