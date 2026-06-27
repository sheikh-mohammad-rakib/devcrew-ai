/**
 * Project list — presentational component.
 *
 * Mirrors :class:`WorkspacesPageView`:
 *
 *   - Pure presentation. Takes a {@link LoadProjectsResult} and
 *     renders one of four states:
 *
 *       1. ``no-workspace`` — friendly "Create a workspace first"
 *          empty state with the disabled "No workspace selected"
 *          placeholder (no project CTA can succeed without a
 *          workspace).
 *       2. ``ok`` with projects — list of {@link ProjectCard}s.
 *       3. ``ok`` with no projects — standard empty state with a
 *          working "New Project" CTA.
 *       4. ``error`` — {@link ErrorState} with the FastAPI URL hint.
 *
 *   - Delegates the page chrome (header, empty, error) to the shared
 *     components in ``@/components/shared`` so every feature page
 *     renders the same way.
 *
 *   - The page header always shows the "New Project" trigger
 *     (disabled or enabled depending on the state) so the page
 *     feels uniform regardless of which state the user lands on.
 *
 * Server Component
 * ----------------
 * This view is a Server Component. The ``CreateProjectDialog`` it
 * renders is a Client Component, but the view itself owns no state.
 */

import { BriefcaseIcon, GitBranchIcon } from "lucide-react"

import {
  EmptyState,
  ErrorState,
  PageHeader,
} from "@/components/shared"

import { CreateProjectDialog } from "@/features/project/components/create-project-dialog"
import { ProjectCard } from "@/features/project/components/project-card"
import type { LoadProjectsResult } from "@/features/project/types"

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

function ProjectList({
  projects,
  workspaceId,
}: {
  projects: Extract<LoadProjectsResult, { kind: "ok" }>["projects"]
  workspaceId: string
}) {
  return (
    <ul
      className="flex flex-col gap-3"
      aria-label={`${projects.length} projects`}
    >
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          workspaceId={workspaceId}
        />
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Public view                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The composed page view. Accepts a {@link LoadProjectsResult} and
 * renders the appropriate state. Used by the page entry point after
 * it has loaded data via ``loadProjects()``.
 */
export function ProjectsPageView({ result }: { result: LoadProjectsResult }) {
  // The header CTA is always rendered so the page feels uniform, but
  // it's disabled when there's no workspace to create against, and
  // hidden entirely while we're showing an error.
  const headerAction =
    result.kind === "error" ? null : (
      <CreateProjectDialog
        workspace={
          result.kind === "ok"
            ? { id: result.workspaceId, name: result.workspaceName }
            : undefined
        }
      />
    )

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <PageHeader
        title="Projects"
        description="Projects inside your active workspace."
        action={headerAction}
      />

      <section aria-label="Project list">
        {result.kind === "error" ? (
          <ErrorState
            status={result.status}
            message={result.message}
            showApiHint
          />
        ) : result.kind === "no-workspace" ? (
          <EmptyState
            icon={BriefcaseIcon}
            title="No workspace yet"
            description="Projects live inside a workspace. Create one first, then come back to add projects."
          />
        ) : result.projects.length === 0 ? (
          <EmptyState
            icon={GitBranchIcon}
            title="No projects yet"
            description="Projects you create inside this workspace will appear here."
            action={
              <CreateProjectDialog
                workspace={{
                  id: result.workspaceId,
                  name: result.workspaceName,
                }}
              />
            }
          />
        ) : (
          <ProjectList
            projects={result.projects}
            workspaceId={result.workspaceId}
          />
        )}
      </section>
    </div>
  );
}