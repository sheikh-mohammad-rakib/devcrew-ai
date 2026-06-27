/**
 * Public surface of the Workspace feature.
 *
 * External code (e.g. `app/page.tsx`) should only import from this
 * barrel. Internal modules (loader, view, types) are intentionally
 * NOT re-exported so the feature's internal structure can evolve
 * without breaking consumers.
 */

import { loadWorkspaces } from "@/features/workspace/list-loader";
import { WorkspacesPageView } from "@/features/workspace/views/list-view";

/**
 * Workspace list page — Server Component entry point.
 *
 * This is what `app/page.tsx` renders. It composes the data loader
 * (server-only fetch) with the page view (pure presentation).
 */
export async function WorkspacesPage() {
  const result = await loadWorkspaces();
  return <WorkspacesPageView result={result} />;
}

// Re-export feature-local types for callers that need them.
export type { FetchResult, Workspace } from "@/features/workspace/types";