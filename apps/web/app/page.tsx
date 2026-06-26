import { ApiError } from "@/lib/api/client"
import { listWorkspaces, type Workspace } from "@/lib/api/workspace"

/**
 * Workspace list page (root route).
 *
 * Implemented as a Next.js **Server Component**: the FastAPI call to
 * `GET /api/v1/workspaces` happens at request time on the server, so
 * the user never sees a flash of empty/loading state on first paint,
 * and there's no client-side JS to ship for this view.
 *
 * The page renders one of four states:
 *   1. **Error**     — when the API call fails (network, 4xx, 5xx).
 *   2. **Loading**   — covered by Next.js Suspense; we also export a
 *                      dedicated `app/loading.tsx` for nicer streaming.
 *   3. **Empty**     — when the API returns an empty array.
 *   4. **List**      — when the API returns one or more workspaces.
 *
 * The page is intentionally read-only: no create / delete / update is
 * included in this iteration.
 */

/* -------------------------------------------------------------------------- */
/* Data fetching                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Result envelope for the server-side fetch. We use a tagged result
 * instead of throwing so the page can render an in-place error UI
 * instead of bubbling a 500 to Next.js' error boundary.
 */
type FetchResult =
  | { kind: "ok"; workspaces: Workspace[] }
  | { kind: "error"; status: number; message: string }

async function loadWorkspaces(): Promise<FetchResult> {
  try {
    const workspaces = await listWorkspaces({ limit: 100 })
    return { kind: "ok", workspaces }
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        kind: "error",
        status: err.status,
        message: err.message,
      }
    }
    // Unknown error (e.g. fetch failed before an ApiError was formed).
    return {
      kind: "error",
      status: 0,
      message: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default async function WorkspacesPage() {
  const result = await loadWorkspaces()

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
  )
}

/* -------------------------------------------------------------------------- */
/* Subviews                                                                    */
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
  )
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
  )
}

function ErrorState({
  status,
  message,
}: {
  status: number
  message: string
}) {
  const headline =
    status === 0
      ? "Could not reach the API"
      : status >= 500
        ? "The API is having trouble"
        : `API returned ${status}`

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
  )
}
