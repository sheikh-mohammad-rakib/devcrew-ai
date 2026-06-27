"use client"

/**
 * SidebarProvider — owns the open / expanded / mobile state of the
 * application shell's sidebar.
 *
 * Why a separate provider?
 *   The sidebar recipe needs to share state across multiple components:
 *   the visual {@link Sidebar}, the mobile {@link Sheet} trigger in the
 *   header, and any future menus that want to dismiss the sheet on
 *   selection. A small React context gives us a clean `useSidebar()`
 *   hook without baking state into the URL or `localStorage`.
 *
 * Persistence:
 *   We intentionally do NOT persist the collapsed state in cookies /
 *   localStorage in this iteration. A refresh will reset to the
 *   default ("expanded" on desktop, "closed" on mobile). When the
 *   recipe matures we can revisit with `next/headers` cookies for a
 *   SSR-friendly approach.
 *
 * "use client":
 *   The provider exposes interactive state (`useState`, click handlers).
 *   It must be rendered inside a Client Component; the route-grouped
 *   `app/(app)/layout.tsx` imports this provider directly.
 */

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/** Default open state when the viewport is desktop. */
const SIDEBAR_DEFAULT_OPEN = true

/** Width of the sidebar in its expanded state (in CSS pixels). */
const SIDEBAR_WIDTH = "16rem"
/** Width of the sidebar when collapsed to icon-only. */
const SIDEBAR_WIDTH_ICON = "3rem"

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

type SidebarContextValue = {
  /** Current visual state: "expanded" or "collapsed". */
  state: "expanded" | "collapsed"
  /** Whether the sidebar is open as a mobile sheet. */
  open: boolean
  /** Open the mobile sheet (no-op on desktop). */
  setOpen: (open: boolean) => void
  /** Toggle the mobile sheet open/closed. */
  toggleSidebar: () => void
  /** True when the viewport is below the mobile breakpoint. */
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return ctx
}

/* -------------------------------------------------------------------------- */
/* CSS variables                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Inject the sidebar width CSS variables onto a wrapper. We do this
 * inline rather than as a stylesheet because the variables are derived
 * from this component's `open`/`state` and need to live in the same
 * scope as the visual sidebar element.
 */
const SidebarStyleVariables = React.memo(function SidebarStyleVariables({
  className,
}: {
  className?: string
}) {
  return (
    <style
      data-slot="sidebar-style-variables"
      // The `suppressHydrationWarning` flag prevents a noisy warning when
      // the browser reports a slightly different viewport width on
      // hydration than the server-rendered CSS expected.
      suppressHydrationWarning
    >
      {`
        [data-slot="sidebar"][data-state="expanded"] {
          --sidebar-width: ${SIDEBAR_WIDTH};
          --sidebar-width-icon: ${SIDEBAR_WIDTH_ICON};
        }
        [data-slot="sidebar"][data-state="collapsed"] {
          --sidebar-width: ${SIDEBAR_WIDTH_ICON};
          --sidebar-width-icon: ${SIDEBAR_WIDTH_ICON};
        }
        [data-slot="sidebar-inset"] {
          --sidebar-width: ${SIDEBAR_WIDTH};
          --sidebar-width-icon: ${SIDEBAR_WIDTH_ICON};
        }
        ${className ?? ""}
      `}
    </style>
  )
})

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export interface SidebarProviderProps extends React.ComponentProps<"div"> {
  /** Default open state when on desktop. Default: `true`. */
  defaultOpen?: boolean
}

/**
 * Wraps the application shell and exposes sidebar state via context.
 *
 * Usage:
 *   <SidebarProvider>
 *     <AppSidebar />
 *     <SidebarInset>{children}</SidebarInset>
 *   </SidebarProvider>
 */
export function SidebarProvider({
  defaultOpen = SIDEBAR_DEFAULT_OPEN,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile()
  // On desktop, `open` tracks the collapsed-vs-expanded state. On
  // mobile, `open` tracks the sheet visibility. The semantic
  // distinction is encoded in the derived `state` value.
  const [open, setOpen] = React.useState(defaultOpen && !isMobile)
  const [openMobile, setOpenMobile] = React.useState(false)

  // When the user resizes across the mobile breakpoint, reset the
  // desktop state so we don't end up with a collapsed desktop sidebar
  // showing the mobile sheet underneath.
  React.useEffect(() => {
    if (!isMobile) setOpenMobile(false)
    else setOpen(defaultOpen)
  }, [isMobile, defaultOpen])

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current)
    } else {
      setOpen((current) => !current)
    }
  }, [isMobile])

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open: isMobile ? openMobile : open,
      setOpen: (next) => {
        if (isMobile) setOpenMobile(next)
        else setOpen(next)
      },
      toggleSidebar,
      isMobile,
    }),
    [open, openMobile, isMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
          className,
        )}
        {...props}
      >
        <SidebarStyleVariables />
        {children}
      </div>
    </SidebarContext.Provider>
  )
}