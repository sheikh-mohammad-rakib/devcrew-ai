/**
 * EmptyState — placeholder shown when a list-like feature has zero
 * records. Replaces the ad-hoc "No X yet" panels previously embedded
 * inside individual feature views.
 *
 * Composition
 * -----------
 *   ┌─────────────────────────────────────────┐
 *   │            [icon in circle]             │
 *   │              <h2>{title}</h2>           │
 *   │          <p>{description}</p>           │
 *   │              {action slot}              │
 *   └─────────────────────────────────────────┘
 *
 * The icon is optional; when omitted, only the title / description /
 * action render. The whole block is wrapped in `role="status"` so
 * assistive tech announces the empty result.
 *
 * Server Component
 * ----------------
 * Pure presentation; safe to render from a Server Component page.
 *
 * @example
 *   <EmptyState
 *     title="No workspaces yet"
 *     description="Workspaces you create will appear here."
 *     action={<CreateWorkspaceDialog />}
 *   />
 */

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

export interface EmptyStateProps {
  /** Headline (e.g. "No workspaces yet"). */
  title: string
  /** Supporting copy explaining how to recover. */
  description?: string
  /** Optional icon shown in a circle above the title. */
  icon?: React.ComponentType<{ className?: string }>
  /** Optional action element (typically a creation CTA). */
  action?: React.ReactNode
  /** Extra classes appended to the outer container. */
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      data-slot="empty-state"
      className={cn(
        "rounded-lg border border-dashed p-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div
          aria-hidden="true"
          className="bg-muted text-muted-foreground mx-auto mb-4 flex size-12 items-center justify-center rounded-full"
        >
          <Icon className="size-6" />
        </div>
      ) : null}
      <h2 className="font-medium">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}