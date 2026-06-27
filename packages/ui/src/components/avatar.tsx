"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

/**
 * shadcn/ui Avatar primitive.
 *
 * Three-piece composite:
 *   - {@link Avatar} — the round container; clips children.
 *   - {@link AvatarImage} — the actual image; loaded by radix-ui with
 *     automatic fallback to {@link AvatarFallback} when the image errors.
 *   - {@link AvatarFallback} — initials, icon, or any content shown while
 *     the image is loading or fails to load.
 *
 * Used today as a placeholder user avatar in the application shell's
 * header; later wired to a real user account.
 */

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-xs",
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback, AvatarImage }