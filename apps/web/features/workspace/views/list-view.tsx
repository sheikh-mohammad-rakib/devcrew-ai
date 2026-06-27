/**
 * Workspace list — presentational component.
 *
 * Pure presentation: receives a {@link FetchResult} and renders one of
 * four states (list / empty / error / loading). Has no data-fetching
 * code and no client-side hooks, so it can be safely rendered on the
 * server with no hydration mismatch concerns.
 *
 * Visual styling is byte-identical to the pre-refactor implementation
 * that lived in `app/page.tsx`.
 */

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

function EmptyState() {
  return (
    <div
      role="status"
      className="rounded-lg border border-dashed p-10 text-center"
    >
      <h2 className="font-medium">No workspaces yet</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Workspaces you create will appear here. Creation will land in the
        next sprint.
      </p>
    </div>
  );
}

function ErrorState({
  status,
  message,
}: {
  status: number;
  message: string;
}) {
  const headline =
    status === 0
      ? "Could not reach the API"
      : status >= 500
        ? "The API is having trouble"
        : `API returned ${status}`;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-6"
    >
      <h2 className="text-destructive font-medium">{headline}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      <p className="text-muted-foreground/70 mt-3 text-xs">
        Make sure the FastAPI server is running on{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          {process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}
        </code>
        .
      </p>
    </div>
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
    <main className="mx-auto min-h-svh w-full max-w-3xl px-6 py-12">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Workspaces
        </h1>
        <p className="text-muted-foreground text-sm">
          Top-level DevCrew engagements. Create, edit, and delete are
          coming in a follow-up sprint.
        </p>
      </header>

      <section aria-label="Workspace list">
        {result.kind === "error" ? (
          <ErrorState status={result.status} message={result.message} />
        ) : result.workspaces.length === 0 ? (
          <EmptyState />
        ) : (
          <WorkspaceList workspaces={result.workspaces} />
        )}
      </section>
    </main>
  );
}