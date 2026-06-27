"use client"

/**
 * ProjectStatusBadge — visually-distinct pill for a project's
 * lifecycle status.
 *
 * Two layers of styling
 * ---------------------
 * 1. The base :class:`Badge` from ``@workspace/ui`` provides the
 *    pill shape / padding / typography.
 * 2. A feature-local ``cva`` (``projectStatusVariants``) overlays a
 *    colour pair per status on top of that base.
 *
 * Why a feature-local cva and not more ``Badge`` variants?
 *   Status colours are domain-specific — only this feature uses
 *   "planning", "review", "completed", etc. Promoting them to the
 *   shared primitive would leak domain meaning into the design
 *   system.
 *
 * Mapping notes
 * -------------
 * The five statuses requested by the spec are:
 *
 *   PLANNING  → neutral / muted  (default "not yet started")
 *   ACTIVE    → primary / blue   (work in progress)
 *   REVIEW    → amber / warning  (awaiting feedback)
 *   COMPLETED → green / success  (finished)
 *   ARCHIVED  → slate / muted    (no longer active)
 *
 * Each variant pairs a translucent background with a foreground that
 * stays readable in both light and dark themes by using the project's
 * semantic colour tokens (``bg-primary``, ``bg-amber-500/15``,
 * etc.). Icons reinforce the state at a glance — the badge still
 * reads correctly with the icon hidden by user CSS (``[&_svg]:
 * hidden``).
 *
 * Status parity with the backend
 * ------------------------------
 * The backend's :class:`ProjectStatus` enum (Sprint 3.1) currently
 * exposes ``planned``, ``active``, ``paused``, ``completed``,
 * ``archived`` — five values, but with different names than this
 * component accepts (``planned`` ≠ ``PLANNING``, ``paused`` ≠
 * ``REVIEW``). The two will be reconciled in a future sprint once
 * the backend status enum is updated. Until then the badge accepts
 * only the strings listed in :data:`PROJECT_STATUSES`; passing any
 * other value is a TypeScript error.
 */

import * as React from "react"
import {
  ArchiveIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CirclePlayIcon,
  ClipboardCheckIcon,
  type LucideIcon,
} from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

/* -------------------------------------------------------------------------- */
/* Status enum                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Canonical string-literal union of statuses the badge accepts.
 *
 * Kept as a plain union (rather than a TypeScript ``enum``) so the
 * emitted JS is trivially serializable across the server / client
 * boundary and tree-shakable.
 */
export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "REVIEW",
  "COMPLETED",
  "ARCHIVED",
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

/* -------------------------------------------------------------------------- */
/* Visual configuration                                                       */
/* -------------------------------------------------------------------------- */

interface StatusVisual {
  /** Human-readable label. */
  label: string
  /** Icon rendered to the left of the label. */
  icon: LucideIcon
}

const STATUS_VISUALS: Readonly<Record<ProjectStatus, StatusVisual>> = {
  PLANNING: { label: "Planning", icon: CircleDashedIcon },
  ACTIVE: { label: "Active", icon: CirclePlayIcon },
  REVIEW: { label: "Review", icon: ClipboardCheckIcon },
  COMPLETED: { label: "Completed", icon: CheckCircle2Icon },
  ARCHIVED: { label: "Archived", icon: ArchiveIcon },
}

/* -------------------------------------------------------------------------- */
/* cva — colour mapping per status                                            */
/* -------------------------------------------------------------------------- */

const projectStatusVariants = cva("", {
  variants: {
    status: {
      PLANNING:
        "bg-muted text-muted-foreground border-transparent",
      ACTIVE:
        "bg-primary/10 text-primary border-transparent",
      REVIEW:
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent",
      COMPLETED:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent",
      ARCHIVED:
        "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-transparent",
    },
  },
  defaultVariants: {
    status: "PLANNING",
  },
})

type ProjectStatusVariantProps = VariantProps<typeof projectStatusVariants>

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export interface ProjectStatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "variant">,
    ProjectStatusVariantProps {
  /**
   * Override the visible label. Defaults to the title-cased status
   * (e.g. ``"PLANNING"`` → ``"Planning"``).
   */
  label?: string
  /** Hide the leading icon. Default: ``false``. */
  hideIcon?: boolean
  /** Extra classes appended to the badge. */
  className?: string
}

/**
 * Renders a coloured Badge representing a Project's lifecycle state.
 *
 * @example
 *   <ProjectStatusBadge status="ACTIVE" />
 *   <ProjectStatusBadge status="COMPLETED" hideIcon />
 */
export function ProjectStatusBadge({
  status,
  label,
  hideIcon = false,
  className,
  ...props
}: ProjectStatusBadgeProps) {
  // Runtime guard — TypeScript prevents bad inputs at compile time,
  // but JavaScript callers (e.g. API responses) could still pass
  // anything. Fall back to PLANNING rather than rendering a blank.
  const safeStatus: ProjectStatus = (
    PROJECT_STATUSES as readonly string[]
  ).includes(status as string)
    ? (status as ProjectStatus)
    : "PLANNING"

  const visual = STATUS_VISUALS[safeStatus]
  const Icon = visual.icon
  const text = label ?? visual.label

  return (
    <Badge
      data-slot="project-status-badge"
      data-status={safeStatus}
      aria-label={`Project status: ${text}`}
      className={cn(
        "gap-1",
        projectStatusVariants({ status: safeStatus }),
        className,
      )}
      {...props}
    >
      {hideIcon ? null : (
        <Icon
          aria-hidden="true"
          className="size-3 shrink-0"
          data-icon="inline-start"
        />
      )}
      {text}
    </Badge>
  )
}

export { projectStatusVariants }