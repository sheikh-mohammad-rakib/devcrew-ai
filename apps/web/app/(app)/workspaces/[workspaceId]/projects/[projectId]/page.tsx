/**
 * Project detail page — placeholder.
 *
 * Server Component that:
 *   1. Receives the dynamic route params via Next.js 16's promise
 *      shape (``params: Promise<{ workspaceId; projectId }>``).
 *   2. Awaits ``params`` to get the workspace and project ids.
 *   3. Loads the project via ``getProject(projectId)`` AND the
 *      workspace via ``getWorkspace(workspaceId)`` so the page can
 *      show the workspace name in the header (requirement #6).
 *   4. Renders the project's name + status badge + workspace
 *      breadcrumb + a "Detail page coming soon." body, plus a
 *      "Back to Projects" link.
 *   5. Catches errors and renders them via {@link ErrorState} with
 *      the FastAPI URL hint.
 *
 * Why load the workspace too?
 *   The detail route is nested under ``/workspaces/[workspaceId]``
 *   (per the spec) so the URL already encodes the workspace. We
 *   fetch the workspace object to display its name in the
 *   breadcrumb and page header. If the workspace fetch fails
 *   (e.g. deleted mid-flight) we fall back to a generic label
 *   rather than crashing the page.
 *
 * Sprint 3.2 keeps the rest minimal — tasks, agents, activity
 * feed land in a later sprint. The placeholder exists so cards
 * have a real destination and the route layout works end-to-end.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, BriefcaseIcon } from "lucide-react"

import { ApiError } from "@/lib/api/client"
import { getProject } from "@/lib/api/project"
import { getWorkspace } from "@/lib/api/workspace"
import { ErrorState, PageHeader } from "@/components/shared"
import { Button } from "@workspace/ui/components/button"
import {
  backendStatusToBadgeStatus,
} from "@/features/project/status"
import { ProjectStatusBadge } from "@/features/project/components/ProjectStatusBadge"

export default async function ProjectDetailPage({
  params,
}: {
  /**
   * Next.js 16 makes dynamic route params a Promise. Awaiting is
   * required to read them; the surrounding page renders inside a
   * server suspense boundary so the await is non-blocking.
   */
  params: Promise<{ workspaceId: string; projectId: string }>
}) {
  // Next 16: dynamic params are async. Await before reading.
  const { workspaceId, projectId } = await params

  // Load the project first — it's the primary entity on this page.
  let project
  try {
    project = await getProject(projectId)
  } catch (err) {
    return renderDetailError(err, workspaceId)
  }

  // The workspace fetch is secondary. If it fails (rare — the
  // workspace is in the URL so it almost always exists), fall back
  // to a generic label so the page still renders.
  let workspaceName: string
  try {
    const ws = await getWorkspace(workspaceId)
    workspaceName = ws.name
  } catch {
    workspaceName = "this workspace"
  }

  const badgeStatus = backendStatusToBadgeStatus(project.status)

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`/workspaces/${encodeURIComponent(workspaceId)}/projects`}
            aria-label="Back to Projects"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Projects
          </Link>
        </Button>
        <span
          aria-hidden="true"
          className="text-muted-foreground/60 text-sm"
        >
          /
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <BriefcaseIcon aria-hidden="true" className="size-3.5" />
          {workspaceName}
        </span>
      </div>

      <PageHeader
        title={project.name}
        description={
          project.description ?? "No description provided for this project."
        }
        action={<ProjectStatusBadge status={badgeStatus} />}
      />

      <section
        aria-label="Project details"
        className="rounded-lg border bg-card text-card-foreground p-6"
      >
        <h2 className="font-medium">Project overview</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Detail page coming soon. This placeholder will be replaced
          with the project&apos;s timeline, tasks, AI runs, and settings
          in a future sprint.
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Workspace
            </dt>
            <dd>{workspaceName}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Status
            </dt>
            <dd>
              <ProjectStatusBadge status={badgeStatus} />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
              Project ID
            </dt>
            <dd className="font-mono text-xs break-all">{project.id}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

/**
 * Render the shared error state for the detail page. Centralised so
 * both the project-fetch and (potential) workspace-fetch paths can
 * fall back to it without duplicating chrome.
 */
function renderDetailError(
  err: unknown,
  workspaceId: string,
): React.ReactElement {
  const status = err instanceof ApiError ? err.status : 0
  const message =
    err instanceof ApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Unknown error"

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`/workspaces/${encodeURIComponent(workspaceId)}/projects`}
            aria-label="Back to Projects"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Projects
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Project"
        description="We couldn't load this project."
      />

      <ErrorState status={status} message={message} showApiHint />
    </div>
  )
}
