/**
 * Server-only data loader for the workspace list.
 *
 * This module is marked `server-only` so any accidental import from a
 * Client Component (which can't run Node `fetch`) becomes a build-time
 * error instead of a silent runtime failure.
 *
 * The loader uses a tagged `FetchResult` rather than throwing so the
 * page can render an in-place error UI instead of bubbling a 500 to
 * Next.js' default error boundary.
 */

import "server-only";

import { ApiError } from "@/lib/api/client";
import { listWorkspaces } from "@/lib/api/workspace";
import type { FetchResult } from "@/features/workspace/types";

export async function loadWorkspaces(): Promise<FetchResult> {
  try {
    const workspaces = await listWorkspaces({ limit: 100 });
    return { kind: "ok", workspaces };
  } catch (err) {
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
}