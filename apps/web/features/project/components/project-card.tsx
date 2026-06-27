/**
 * ProjectCard — presentational card for a single project.
 *
 * Renders a project's name, status badge, and description (or muted
 * "No description." fallback). The whole card is wrapped in a
 * Next.js ``<Link>`` so clicking anywhere on it navigates to the
 * project's detail page (``/projects/<projectId>``).
 *
 * Why a single big link?
 *   - Affordance: the whole card reads as a tap target, not just the
 *     title text. This matches the established Workspace card
 *     pattern (one card → one entity).
 *   - Accessibility: the link's accessible name is built from the
 *     card's primary content (project name). The badge and
 *     description are also announced as part of the link content.
 *
 * Server Component
 * ----------------
 * No interactivity — the only dynamic data is the project object
 * passed in. Keeping this a Server Component means no client JS for
 * card rendering; navigation is handled by Next's ``<Link>``.
 */

import Link from "next/link"

import type { Project } from "@/features/project/types"
import { backendStatusToBadgeStatus } from "@/features/project/status"
import { ProjectStatusBadge } from "@/features/project/components/ProjectStatusBadge"

export interface ProjectCardProps {
  /** The project to render. */
  project: Project
  /**
   * Override the project id used in the detail-page URL. Defaults to
   * ``project.id``. Provided so callers can swap in a different
   * identifier if the project object ever carries a slug.
   */
  projectId?: string
  /** Optional extra classes appended to the card root. */
  className?: string
}

export function ProjectCard({
  project,
  projectId,
  className,
}: ProjectCardProps) {
  // Map backend status → frontend badge status. Defensive: unknown
  // values fall back to PLANNING inside the mapper, so we can pass
  // the raw `project.status` string through.
  const badgeStatus = backendStatusToBadgeStatus(project.status)
  const hrefId = projectId ?? project.id
  const href = `/projects/${encodeURIComponent(hrefId)}`

  return (
    <li
      className={
        "rounded-lg border bg-card text-card-foreground p-4 transition-colors hover:bg-accent/30" +
        (className ? ` ${className}` : "")
      }
    >
      <Link
        href={href}
        className="ring-offset-background focus-visible:ring-ring flex flex-col gap-2 outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label={`Open project ${project.name}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-tight">{project.name}</h3>
          <ProjectStatusBadge status={badgeStatus} />
        </div>
        {project.description ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {project.description}
          </p>
        ) : (
          <p className="text-muted-foreground/60 text-sm italic">
            No description.
          </p>
        )}
      </Link>
    </li>
  )
}
