/**
 * Project detail page — placeholder.
 *
 * Server Component that:
 *   1. Receives the dynamic route param via Next.js 16's promise
 *      shape (``params: Promise<{ projectId: string }>``).
 *   2. Awaits ``params`` to get the project id.
 *   3. Calls ``getProject(projectId)`` to fetch the project.
 *   4. Renders the project's name + status badge + a "Detail page
 *      coming soon." body, plus a "Back to Projects" link.
 *   5. Catches errors and renders them via {@link ErrorState} with
 *      the FastAPI URL hint.
 *
 * Sprint 3.2 keeps this minimal — the real detail page (tasks,
 * agents, activity feed) lands in a later sprint. The placeholder
 * exists so cards have a real destination and the route layout
 * works end-to-end.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { ApiError } from "@/lib/api/client"
import { getProject } from "@/lib/api/project"
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
  params: Promise<{ projectId: string }>
}) {
  // Next 16: dynamic params are async. Await before reading.
  const { projectId } = await params

  try {
    const project = await getProject(projectId)
    const badgeStatus = backendStatusToBadgeStatus(project.status)

    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects" aria-label="Back to Projects">
              <ArrowLeftIcon data-icon="inline-start" />
              Back to Projects
            </Link>
          </Button>
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
            with the project's tasks, agent runs, and activity feed in
            a future sprint.
          </p>
        </section>
      </div>
    )
  } catch (err) {
    // Translate ApiError into the shared ErrorState shape so the
    // user sees the same chrome as on the list page.
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
            <Link href="/projects" aria-label="Back to Projects">
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
}