/**
 * Workspace detail placeholder page.
 *
 * The full Workspace detail feature (per-workspace settings,
 * member list, etc.) lands in a future sprint. For Sprint 3.2 the
 * route exists so that links from the project detail page's
 * breadcrumb resolve, and so that nested routes like
 * ``/workspaces/[id]/projects`` have a sensible parent layout.
 *
 * What it shows today
 * -------------------
 *   - A page header with the workspace name.
 *   - The description (or a muted fallback).
 *   - A placeholder section ("Workspace overview") so the page
 *     isn't completely empty.
 *   - A "Back to Workspaces" link to ``/`` and a "View projects"
 *     link to the per-workspace projects list.
 *
 * Why fetch-then-render (not try/catch around JSX)?
 * --------------------------------------------------
 * The :rule:`react-hooks/error-boundaries` lint warns against
 * wrapping JSX in ``try/catch`` because React defers rendering to
 * a later phase, so a synchronous throw from a child component
 * would not be caught. The standard pattern is to perform the
 * data fetch outside the render phase and convert the result
 * into a tagged value the component can branch on. This file
 * follows that pattern: ``loadWorkspaceDetail`` returns a
 * discriminated union and the render function switches on
 * ``result.kind``.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { ApiError } from "@/lib/api/client"
import { getWorkspace, type Workspace } from "@/lib/api/workspace"
import { ErrorState, PageHeader } from "@/components/shared"
import { Button } from "@workspace/ui/components/button"

/* -------------------------------------------------------------------------- */
/* Loader                                                                     */
/* -------------------------------------------------------------------------- */

type WorkspaceDetailResult =
  | { kind: "ok"; workspace: Workspace; workspaceId: string }
  | { kind: "error"; status: number; message: string; workspaceId: string }

async function loadWorkspaceDetail(
  workspaceId: string,
): Promise<WorkspaceDetailResult> {
  try {
    const workspace = await getWorkspace(workspaceId)
    return { kind: "ok", workspace, workspaceId }
  } catch (err) {
    return {
      kind: "error",
      status: err instanceof ApiError ? err.status : 0,
      message:
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error",
      workspaceId,
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function WorkspaceDetailPage({
  params,
}: {
  /** Next 16 — async dynamic params. */
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const result = await loadWorkspaceDetail(workspaceId)

  if (result.kind === "error") {
    return <WorkspaceDetailError
      status={result.status}
      message={result.message}
    />
  }

  const { workspace } = result

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" aria-label="Back to Workspaces">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Workspaces
          </Link>
        </Button>
      </div>

      <PageHeader
        title={workspace.name}
        description={
          workspace.description ?? "No description provided."
        }
      />

      <section
        aria-label="Workspace overview"
        className="rounded-lg border bg-card text-card-foreground p-6"
      >
        <h2 className="font-medium">Workspace overview</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Members, settings, and per-workspace analytics land here
          in a future sprint.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/workspaces/${encodeURIComponent(workspaceId)}/projects`}
            >
              View projects
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Error view                                                                 */
/* -------------------------------------------------------------------------- */

function WorkspaceDetailError({
  status,
  message,
}: {
  status: number
  message: string
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" aria-label="Back to Workspaces">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Workspaces
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Workspace"
        description="We couldn't load this workspace."
      />

      <ErrorState status={status} message={message} showApiHint />
    </div>
  )
}
