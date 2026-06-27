/**
 * PageHeader — the standard page-level header used at the top of every
 * feature page inside the application shell.
 *
 * Anatomy
 * -------
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ <h1>{title}</h1>                            ┌──────────────┐ │
 *   │ <p>{description}</p>                        │ {action}     │ │
 *   │                                             └──────────────┘ │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * The `title` and `description` are the only required fields. The
 * `action` slot accepts any React node — typically a Button that opens
 * a creation dialog or runs a destructive command. On narrow viewports
 * the action drops below the title; on `sm:` and up it aligns to the
 * top right.
 *
 * Server Component
 * ----------------
 * PageHeader has no interactive state and no hooks. It is a pure
 * presentational Server Component so pages that use it remain
 * renderable without shipping any client JS for the header itself.
 *
 * @example
 *   <PageHeader
 *     title="Workspaces"
 *     description="Top-level DevCrew engagements."
 *     action={<CreateWorkspaceDialog />}
 *   />
 */

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

export interface PageHeaderProps {
  /** Page title rendered as the `<h1>`. */
  title: string
  /** Short subtitle rendered below the title in muted text. */
  description?: string
  /**
   * Optional action element rendered to the right (or below on
   * narrow viewports). Typically a `<Button>` or a dialog trigger.
   */
  action?: React.ReactNode
  /** Extra classes appended to the header element. */
  className?: string
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "mb-8 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}