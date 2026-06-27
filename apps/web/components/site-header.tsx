"use client"

/**
 * SiteHeader — top bar of the application shell.
 *
 * Composition (left → right):
 *   1. Hamburger button that calls `useSidebar().toggleSidebar()`.
 *      Visible only on mobile (`md:hidden`), where the sidebar is
 *      hidden by default and toggles as a sheet.
 *   2. App title ("DevCrew AI").
 *   3. Spacer (`flex-1`).
 *   4. Notifications button (placeholder, opens a menu-less dropdown).
 *   5. User avatar dropdown menu (placeholder contents; just enough
 *      UX to show the shell's interactive bits are wired).
 *
 * "use client":
 *   The header owns interactive state (sidebar toggle, dropdown open).
 */

import * as React from "react"
import { BellIcon, PanelLeftIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"

import { useSidebar } from "@/components/shell/sidebar-provider"
import { cn } from "@workspace/ui/lib/utils"

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function HamburgerToggle() {
  const { toggleSidebar, state } = useSidebar()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="sidebar-trigger"
      className="md:hidden"
      onClick={toggleSidebar}
      aria-label={state === "collapsed" ? "Open sidebar" : "Close sidebar"}
    >
      <PanelLeftIcon className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

function NotificationsButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Notifications"
      className="text-muted-foreground"
    >
      <BellIcon className="size-4" />
      <span className="sr-only">Notifications</span>
    </Button>
  )
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="User menu"
          className="size-8 rounded-full p-0"
        >
          <Avatar>
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-48">
        <DropdownMenuLabel>Signed in as User</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Profile (coming soon)</DropdownMenuItem>
        <DropdownMenuItem disabled>Preferences (coming soon)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Sign out (coming soon)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* -------------------------------------------------------------------------- */
/* Public component                                                           */
/* -------------------------------------------------------------------------- */

export interface SiteHeaderProps extends React.ComponentProps<"header"> {
  /** Override the displayed app title (default: "DevCrew AI"). */
  title?: string
}

/**
 * Sticky top bar that lives inside the shell's `<SidebarInset>`.
 * Renders above `{children}` in the route-grouped layout.
 */
export function SiteHeader({
  title = "DevCrew AI",
  className,
  ...props
}: SiteHeaderProps) {
  return (
    <header
      data-slot="site-header"
      className={cn(
        "bg-background sticky top-0 z-30 flex h-14 w-full items-center gap-3 border-b px-4",
        className,
      )}
      {...props}
    >
      <HamburgerToggle />
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <NotificationsButton />
        <UserMenu />
      </div>
    </header>
  )
}