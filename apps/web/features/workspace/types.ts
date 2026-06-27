/**
 * Feature-local types for the Workspace feature.
 *
 * The Workspace type itself lives in `@/lib/api/workspace` (it's part
 * of the API binding layer). This module re-exports it so feature
 * consumers can do:
 *
 *     import type { Workspace, FetchResult } from "@/features/workspace";
 *
 * without reaching into the API layer directly. It also defines the
 * `FetchResult` discriminated union used by the loader + view pair.
 */

import type { Workspace } from "@/lib/api/workspace";

/** Result envelope for the workspace list data fetch. */
export type FetchResult =
  | { kind: "ok"; workspaces: Workspace[] }
  | { kind: "error"; status: number; message: string };

export type { Workspace };