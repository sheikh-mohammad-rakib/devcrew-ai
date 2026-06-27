/**
 * AppSidebar — application shell's left navigation.
 *
 * Two named exports:
 *   - {@link AppSidebarContents} — the chrome-less nav markup
 *     (brand, primary nav, footer nav). Used inside both the desktop
 *     sidebar and the mobile sheet.
 *   - {@link AppSidebar} — the desktop wrapper that composes
 *     {@link AppSidebarContents} with the {@link Sidebar} primitive
 *     and {@link SidebarRail}. Returns nothing on mobile viewports
 *     because the mobile sheet hosts the contents instead.
 *
 * Why a Server Component?
 *   The nav items are static markup — no event handlers, no hooks.
 *   Keeping this as a Server Component means no client JS for
 *   navigation chrome. The interactive bits (hamburger toggle,
 *   avatar dropdown) live in {@link SiteHeader} and
 *   {@link MobileSidebarSheet}, both of which are `"use client"`.
 */

import Link from "next/link"
import {
  BotIcon,
  BriefcaseIcon,
  ClockIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  SettingsIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/shell/sidebar"

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

interface NavItem {
  /** Lucide icon component. */
  icon: React.ComponentType<{ className?: string }>
  /** Visible label. */
  label: string
  /**
   * Destination URL. Placeholder routes use `"#"` until their feature
   * pages are scaffolded; the Workspaces item points at `/`.
   */
  href: string
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { icon: LayoutDashboardIcon, label: "Dashboard", href: "#" },
  { icon: BriefcaseIcon, label: "Workspaces", href: "/" },
  { icon: GitBranchIcon, label: "Projects", href: "#" },
  { icon: ClockIcon, label: "Timeline", href: "#" },
  { icon: BotIcon, label: "Agents", href: "#" },
]

const SECONDARY_NAV: ReadonlyArray<NavItem> = [
  { icon: SettingsIcon, label: "Settings", href: "#" },
]

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function Brand() {
  return (
    <SidebarHeader>
      <Link
        href="/"
        className="ring-sidebar-ring flex items-center gap-2 rounded-md p-2 outline-hidden focus-visible:ring-2"
      >
        <div
          aria-hidden="true"
          className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-semibold"
        >
          DC
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold">DevCrew</span>
          <span className="text-muted-foreground text-xs">AI Platform</span>
        </div>
      </Link>
    </SidebarHeader>
  )
}

function NavSection({
  label,
  items,
}: {
  label: string
  items: ReadonlyArray<NavItem>
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon
            // Real routes get Next's <Link>; placeholders get plain anchors
            // so the browser doesn't try to prefetch a non-existent route.
            const isPlaceholder = item.href === "#"
            const buttonProps = {
              tooltip: item.label,
              isActive: item.href === "/",
              size: "default" as const,
              className:
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            }
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton {...buttonProps} asChild>
                  {isPlaceholder ? (
                    <a href={item.href} aria-disabled="true">
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link href={item.href}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/* -------------------------------------------------------------------------- */
/* Public components                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Chrome-less nav markup. Render this inside any container that wants
 * the shell's navigation — typically the desktop `<Sidebar>` wrapper
 * or the mobile `<SheetContent>` body.
 */
export function AppSidebarContents() {
  return (
    <>
      <Brand />
      <SidebarContent>
        <NavSection label="Workspace" items={PRIMARY_NAV} />
      </SidebarContent>
      <SidebarFooter>
        <NavSection label="Account" items={SECONDARY_NAV} />
      </SidebarFooter>
    </>
  )
}

/**
 * The desktop sidebar wrapper. Composes {@link AppSidebarContents}
 * with the {@link Sidebar} primitive and {@link SidebarRail}.
 *
 * Returns `null` on mobile because the {@link MobileSidebarSheet}
 * hosts the contents in a Sheet panel instead.
 */
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  // Pull the desktop-only chrome together with the shared contents.
  return (
    <Sidebar {...props}>
      <AppSidebarContents />
      <SidebarRail />
    </Sidebar>
  )
}