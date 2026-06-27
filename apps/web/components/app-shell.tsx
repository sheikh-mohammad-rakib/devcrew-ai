/**
 * AppShell — top-level composition of the application shell.
 *
 * The shell is a thin Server Component that imports:
 *   - {@link SidebarProvider} (client) — owns open/expanded state.
 *   - {@link AppSidebar} (server)     — the desktop sidebar wrapper.
 *   - {@link MobileSidebarSheet}      — the mobile slide-in drawer.
 *   - {@link SiteHeader} (client)     — top bar with avatar dropdown.
 *   - {@link SidebarInset} (client)   — the main content column.
 *
 * Children passed to AppShell are rendered inside `<SidebarInset>` so
 * any page under `app/(app)/` automatically inherits the shell.
 *
 * Mobile behaviour
 * ----------------
 * When the viewport is below `md` (768 px) the desktop sidebar is
 * hidden (its `Sidebar` primitive returns `null` on mobile) and the
 * hamburger in the header opens {@link MobileSidebarSheet}, which
 * hosts the same nav contents inside a Sheet panel.
 */

import { AppSidebar, AppSidebarContents } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/shell/sidebar"
import { SidebarProvider } from "@/components/shell/sidebar-provider"
import { MobileSidebarSheet } from "@/components/mobile-sidebar-sheet"
import { SiteHeader } from "@/components/site-header"

export interface AppShellProps {
  children: React.ReactNode
}

/**
 * Wraps the shell around its children.
 *
 * Usage (in `app/(app)/layout.tsx`):
 *   <AppShell>{children}</AppShell>
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <MobileSidebarSheet>
        <AppSidebarContents />
      </MobileSidebarSheet>
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}