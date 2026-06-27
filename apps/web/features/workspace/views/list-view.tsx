/**
 * Workspace list — presentational component.
 *
 * Pure presentation: receives a {@link FetchResult} and renders one of
 * three states (list / empty / error). The page chrome — header,
 * empty state, error state — is delegated to the shared components in
 * `@/components/shared` so every feature page renders the same way.
 *
 * Chrome
 * ------
 * This view renders only the inner content column — no outer
 * `<main>` / page chrome. The shell layout (`app/(app)/layout.tsx`)
 * owns the surrounding sidebar + header, so the view focuses on the
 * workspace list and the shared page-level header.
 *
 * The page header always shows a "New Workspace" trigger that opens the
 * {@link CreateWorkspaceDialog}. The same trigger is duplicated inside
 * the empty state so a brand-new user can recover from "No workspaces
 * yet" without scrolling.
 */

import { BriefcaseIcon } from "lucide-react"

import {
  EmptyState,
  ErrorState,
  PageHeader,
} from "@/components/shared"

import { CreateWorkspaceDialog } from "@/features/workspace/components/create-workspace-dialog";
import type { FetchResult, Workspace } from "@/features/workspace/types";

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

function WorkspaceList({ workspaces }: { workspaces: Workspace[] }) {
  return (
    <ul
      className="flex flex-col gap-3"
      aria-label={`${workspaces.length} workspaces`}
    >
      {workspaces.map((w) => (
        <li
          key={w.id}
          className="rounded-lg border bg-card text-card-foreground p-4 transition-colors hover:bg-accent/30"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-medium leading-tight">{w.name}</h2>
            {w.description ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {w.description}
              </p>
            ) : (
              <p className="text-muted-foreground/60 text-sm italic">
                No description.
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Public view                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The composed page view. Accepts a {@link FetchResult} and renders
 * the appropriate state. Used by the page entry-point after it has
 * loaded data via `loadWorkspaces()`.
 */
export function WorkspacesPageView({ result }: { result: FetchResult }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <PageHeader
        title="Workspaces"
        description="Top-level DevCrew engagements."
        // Hide the header CTA while we're showing an error — it
        // would just produce another failed request.
        action={
          result.kind !== "error" ? <CreateWorkspaceDialog /> : null
        }
      />

      <section aria-label="Workspace list">
        {result.kind === "error" ? (
          <ErrorState
            status={result.status}
            message={result.message}
            showApiHint
          />
        ) : result.workspaces.length === 0 ? (
          <EmptyState
            icon={BriefcaseIcon}
            title="No workspaces yet"
            description="Workspaces you create will appear here."
            action={<CreateWorkspaceDialog />}
          />
        ) : (
          <WorkspaceList workspaces={result.workspaces} />
        )}
      </section>
    </div>
  );
}