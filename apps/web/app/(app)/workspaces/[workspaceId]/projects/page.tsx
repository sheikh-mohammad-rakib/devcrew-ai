/**
 * Per-workspace projects route.
 *
 * Mirrors :class:`WorkspacesPage` but loads projects scoped to the
 * workspace from the URL (rather than picking the "newest"
 * workspace). The same :class:`ProjectsPageView` component renders
 * both this page and the global ``/projects`` page — the view is
 * workspace-agnostic.
 *
 * Loader choice
 * -------------
 * ``loadProjectsForWorkspace`` calls ``getWorkspace`` first to
 * surface a friendly 404-style error if the URL id doesn't exist,
 * then loads the workspace's projects. Falls back to the shared
 * :class:`ErrorState` on failure.
 *
 * Server Component
 * ----------------
 * The page is a thin async Server Component that delegates all the
 * data loading and rendering to feature-local code.
 */

import { ProjectsPageView } from "@/features/project/views/list-view";
import { loadProjectsForWorkspace } from "@/features/project/load-projects-for-workspace";

export default async function WorkspaceProjectsPage({
  params,
}: {
  /** Next 16 — async dynamic params. */
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const result = await loadProjectsForWorkspace(workspaceId)
  return <ProjectsPageView result={result} />
}