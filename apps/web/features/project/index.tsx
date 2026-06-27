/**
 * Public surface of the Project feature.
 *
 * External code (e.g. `app/(app)/projects/page.tsx`) should only
 * import from this barrel. Internal modules (loader, view, types)
 * are intentionally NOT re-exported so the feature's internal
 * structure can evolve without breaking consumers.
 *
 * Scope (Sprint 3.2)
 * ------------------
 * Exposes:
 *   - :class:`ProjectsPage` — Server Component page entry point.
 *   - :class:`ProjectStatusBadge` — visual status pill.
 *   - The feature-local types (``Project``, ``FetchResult``,
 *     ``LoadProjectsResult``, ``WorkspaceContext``) for consumers
 *     that need them.
 *   - The backend ↔ badge status mapper helpers so other features
 *     can render a project's status without re-implementing the
 *     mapping.
 */

import { loadProjects } from "@/features/project/list-loader";
import { ProjectsPageView } from "@/features/project/views/list-view";

/**
 * Project list page — Server Component entry point.
 *
 * This is what `app/(app)/projects/page.tsx` renders. It composes
 * the data loader (server-only fetch) with the page view (pure
 * presentation).
 */
export async function ProjectsPage() {
  const result = await loadProjects();
  return <ProjectsPageView result={result} />;
}

// Components
export {
  PROJECT_STATUSES,
  ProjectStatusBadge,
  projectStatusVariants,
  type ProjectStatus,
  type ProjectStatusBadgeProps,
} from "@/features/project/components/ProjectStatusBadge";

export { CreateProjectDialog, type CreateProjectDialogProps } from "@/features/project/components/create-project-dialog";
export { ProjectCard, type ProjectCardProps } from "@/features/project/components/project-card";

// Status mapping (backend enum ↔ frontend badge enum)
export {
  backendStatusToBadgeStatus,
  badgeStatusToBackendStatus,
  isBackendProjectStatus,
  type BackendProjectStatus,
} from "@/features/project/status";

// Re-export feature-local types for callers that need them.
export type {
  FetchResult,
  LoadProjectsResult,
  Project,
  WorkspaceContext,
} from "@/features/project/types";