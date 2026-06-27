import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * shadcn/ui Skeleton primitive.
 *
 * A non-interactive placeholder block that pulses while content loads.
 * Size and shape are controlled via `className` (e.g. `h-4 w-32`,
 * `rounded-full`, etc.) — keeping the component unopinionated so callers
 * can compose any layout shape they need.
 *
 * This component has no client interactivity and no radix dependency,
 * so it intentionally omits `"use client"`.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }