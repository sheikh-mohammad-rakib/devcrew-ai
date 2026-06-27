"use client"

/**
 * Sidebar recipe — shadcn/ui pattern, adapted to the umbrella
 * `radix-ui` package and the project's Tailwind setup.
 *
 * What this file exports
 * ----------------------
 *   <Sidebar>                  Root — desktop fixed column or mobile sheet
 *   <SidebarHeader>            Top section (brand / workspace switcher)
 *   <SidebarContent>           Scrollable middle section (primary nav)
 *   <SidebarFooter>            Bottom section (user / settings)
 *   <SidebarGroup>             Groups one or more menu sections
 *   <SidebarGroupLabel>        Section heading (uppercase muted)
 *   <SidebarGroupContent>      Holds menu/sub content
 *   <SidebarMenu>              Vertical menu list
 *   <SidebarMenuItem>          Single menu entry
 *   <SidebarMenuButton>        The clickable button (icon + label)
 *   <SidebarMenuSub>           Nested submenu list
 *   <SidebarMenuSubItem>       Nested submenu entry
 *   <SidebarMenuSubButton>     Nested submenu button
 *   <SidebarRail>              Thin invisible hover-rail for resize
 *   <SidebarInset>             Right-hand main content column
 *
 * Styling is driven by the `@layer sidebar { ... }` block in
 * `packages/ui/src/styles/globals.css`, which targets `data-slot`
 * attributes set here.
 */

import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"
import { useSidebar } from "@/components/shell/sidebar-provider"

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface SidebarProps extends React.ComponentProps<"div"> {
  /**
   * Sidebar presentation style:
   *   - `sidebar` — fixed column with a divider (default)
   *   - `floating` — floating panel with shadow + rounded corners
   *   - `inset` — visually nested inside the page
   */
  variant?: "sidebar" | "floating" | "inset"
  /**
   * Which edge of the viewport the sidebar docks to.
   */
  side?: "left" | "right"
  /**
   * Collapsible behaviour:
   *   - `offcanvas` — slides out of view when collapsed
   *   - `icon` — collapses to an icon-only rail
   *   - `none` — not collapsible
   */
  collapsible?: "offcanvas" | "icon" | "none"
}

export function Sidebar({
  variant = "sidebar",
  side = "left",
  collapsible = "icon",
  className,
  children,
  ...props
}: SidebarProps) {
  const { state, isMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        data-variant={variant}
        data-side={side}
        data-state={state}
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  // Mobile rendering — render nothing here; the `<Sidebar />` is a
  // desktop-only element. The mobile sheet is rendered separately by
  // the caller via `<Sheet>` + `useSidebar()`.
  if (isMobile) {
    return null
  }

  return (
    <div
      data-slot="sidebar"
      data-variant={variant}
      data-side={side}
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-svh w-(--sidebar-width) flex-col transition-[width] duration-200 ease-linear",
        // Variant: floating / inset get extra spacing and rounding.
        variant === "floating" && "m-2 rounded-lg border shadow-sm",
        variant === "inset" && "rounded-lg border",
        collapsible === "icon" && state === "collapsed"
          ? "w-(--sidebar-width-icon)"
          : "w-(--sidebar-width)",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2",
        className,
      )}
      {...props}
    />
  )
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Groups                                                                     */
/* -------------------------------------------------------------------------- */

export function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
}

export function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="sidebar-group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Menu                                                                       */
/* -------------------------------------------------------------------------- */

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

export function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

export interface SidebarMenuButtonProps
  extends React.ComponentProps<"button"> {
  /** Render the button as a child element via `Slot.Root`. */
  asChild?: boolean
  /** Whether the underlying item is the currently active route. */
  isActive?: boolean
  /**
   * Tooltip shown when the sidebar is collapsed to icon-only mode.
   * Pass the visible label here.
   */
  tooltip?: string | React.ComponentProps<typeof SidebarMenuButtonTooltip>
  /** Render size. `default` for expanded; `sm` suits icon-mode. */
  size?: "default" | "sm" | "lg"
  /** Variant: `default` or `outline`. */
  variant?: "default" | "outline"
}

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const { state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      data-variant={variant}
      data-size={size}
      className={cn(
        "peer/menu-button ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0",
        size === "sm" && "h-7 text-xs",
        size === "lg" && "h-12 text-sm",
        "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
        className,
      )}
      {...props}
    />
  )

  if (!tooltip) return button

  if (typeof tooltip === "string") {
    return (
      <SidebarMenuButtonTooltip content={tooltip}>
        {button}
      </SidebarMenuButtonTooltip>
    )
  }
  return (
    <SidebarMenuButtonTooltip {...tooltip}>{button}</SidebarMenuButtonTooltip>
  )
}

/* -------------------------------------------------------------------------- */
/* Tooltip wrapper (lazy import would be nicer but a direct wrapper keeps
   the file self-contained and matches the shadcn recipe).                          */
/* -------------------------------------------------------------------------- */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

interface SidebarMenuButtonTooltipProps
  extends Omit<React.ComponentProps<"div">, "content"> {
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

function SidebarMenuButtonTooltip({
  content,
  side = "right",
  align = "center",
  children,
  ...props
}: SidebarMenuButtonTooltipProps) {
  const { state } = useSidebar()
  // Tooltip is only meaningful when the sidebar is in icon mode.
  if (state === "expanded") return <>{children}</>

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          data-slot="sidebar-menu-button-tooltip"
          {...props}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/* -------------------------------------------------------------------------- */
/* Submenu                                                                    */
/* -------------------------------------------------------------------------- */

export function SidebarMenuSub({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  )
}

export function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  )
}

export interface SidebarMenuSubButtonProps
  extends React.ComponentProps<"a"> {
  /** Whether the underlying item is the currently active route. */
  isActive?: boolean
  /** Render the anchor as a child element via `Slot.Root`. */
  asChild?: boolean
  /** Size variant. */
  size?: "sm" | "md"
}

export function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: SidebarMenuSubButtonProps) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-active={isActive}
      data-size={size}
      className={cn(
        "ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Rail                                                                      */
/* -------------------------------------------------------------------------- */

export function SidebarRail({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      onClick={toggleSidebar}
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear sm:flex",
        "group-data-[side=left]:-right-4 group-data-[side=right]:left-0",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-[2px]",
        "group-data-[side=left]:cursor-w-resize group-data-[side=right]:cursor-e-resize",
        "[group-data-[side=left][data-state=collapsed]_&]:cursor-e-resize",
        "[group-data-[side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0",
        "group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Inset                                                                    */
/* -------------------------------------------------------------------------- */

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className,
      )}
      {...props}
    />
  )
}