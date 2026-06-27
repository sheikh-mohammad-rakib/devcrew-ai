"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

/**
 * shadcn/ui Separator primitive.
 *
 * Visual (decorative) divider — set `decorative={true}` (the default)
 * to hide it from assistive tech. When used semantically (e.g. between
 * menu items), pass `decorative={false}` and an `aria-label`.
 *
 * The umbrella `radix-ui` package exposes the primitive as
 * `Separator`, whose root element is `<Separator.Root>`.
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
