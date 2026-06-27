import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

/**
 * shadcn/ui Badge primitive.
 *
 * A small, inline status / count indicator. Wraps content in a
 * rounded pill with a coloured background and matching foreground.
 * Variants match the canonical shadcn recipe (`default`, `secondary`,
 * `destructive`, `outline`).
 *
 * Composition
 * -----------
 * The component is purely presentational and exposes an ``asChild``
 * prop so it can delegate to a child element via Radix ``Slot``. That
 * lets callers wrap an ``<a>``, ``<Link>``, or ``<button>`` while
 * keeping the badge chrome — useful for clickable status pills.
 *
 * Variants
 * --------
 * - ``default``   → primary surface (filled).
 * - ``secondary`` → muted surface (filled).
 * - ``destructive`` → destructive surface (filled).
 * - ``outline``   → bordered, transparent.
 *
 * Project status badges layer a second ``cva`` (in the consuming
 * feature) on top of these so status-specific colours stay out of
 * the design-system primitive.
 */

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Render the badge as a child element via Radix `Slot.Root`. */
  asChild?: boolean
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }