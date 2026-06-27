/**
 * LoadingState — skeleton blocks shown while data is in flight.
 *
 * Two rendering modes
 * -------------------
 * 1. **Default** (`count` omitted or 0): a generic centered spinner
 *    with a label — used by pages where the layout of the eventual
 *    content isn't yet known (e.g. the Workspace list during
 *    initial load).
 *
 * 2. **List** (`count > 0`): a vertical stack of `count` skeleton
 *    "card" rows, each with a title bar and a description bar.
 *    Replaces the previous ad-hoc skeleton inside
 *    `app/(app)/loading.tsx`.
 *
 * Server Component
 * ----------------
 * No interactivity; safe to render from a Server Component or as the
 * Suspense fallback for `loading.tsx`.
 *
 * @example
 *   // Centered spinner + label
 *   <LoadingState label="Loading workspaces…" />
 *
 *   // 3 stacked card skeletons
 *   <LoadingState count={3} />
 */

import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

export interface LoadingStateProps {
  /**
   * When > 0, render `count` stacked card skeletons instead of the
   * centered spinner. Default: 0 (spinner mode).
   */
  count?: number
  /** Label shown below the spinner. Ignored in list mode. */
  label?: string
  /** Extra classes appended to the outer container. */
  className?: string
}

export function LoadingState({
  count = 0,
  label = "Loading…",
  className,
}: LoadingStateProps) {
  // List mode — stacked card skeletons.
  if (count > 0) {
    return (
      <ul
        data-slot="loading-state"
        aria-busy="true"
        aria-label={label}
        className={cn("flex flex-col gap-3", className)}
      >
        {Array.from({ length: count }).map((_, i) => (
          <li
            key={i}
            className="bg-card text-card-foreground rounded-lg border p-4"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  // Spinner mode — centered spinner + label.
  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="loading-state"
      className={cn(
        "text-muted-foreground flex flex-col items-center justify-center gap-3 py-12",
        className,
      )}
    >
      <Loader2Icon className="size-6 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )
}