"use client"

/**
 * MobileSidebarSheet — slide-in drawer for the sidebar on mobile.
 *
 * On desktop this component renders nothing: the desktop sidebar is
 * already mounted by {@link AppShell}. On mobile (viewport < 768 px),
 * the Sheet renders an off-canvas panel containing the same sidebar
 * contents, controlled by `useSidebar().open` / `setOpen(false)`.
 *
 * Why a Sheet and not a custom drawer?
 *   The Sheet primitive already implements focus-trap, ESC-to-close,
 *   backdrop click, body scroll lock, and accessibility plumbing
 *   (aria-modal, aria-labelledby). Re-implementing those for a
 *   one-off drawer is wasted effort.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import { useSidebar } from "@/components/shell/sidebar-provider"

export interface MobileSidebarSheetProps {
  children: React.ReactNode
}

export function MobileSidebarSheet({ children }: MobileSidebarSheetProps) {
  const { open, setOpen, isMobile } = useSidebar()

  // No-op on desktop — the sidebar is mounted directly by AppShell.
  if (!isMobile) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="w-(--sidebar-width-mobile) gap-0 p-0"
        showCloseButton={false}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Application navigation menu.</SheetDescription>
        </SheetHeader>
        {/*
          The AppSidebar content tree is wrapped in its own Sidebar
          wrapper, but on mobile the Sidebar primitive renders
          nothing (see shell/sidebar.tsx). Instead we let the Sheet
          host the same nav markup by re-using the AppSidebar's
          internal children — but because AppSidebar is a single
          component, the simplest approach is to render it as the
          Sheet body here. AppSidebar's outer <Sidebar> returns null
          when isMobile is true, so we lose the chrome; that's why
          we apply the sidebar surface styles directly to the
          SheetContent's child wrapper below.
        */}
        <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}