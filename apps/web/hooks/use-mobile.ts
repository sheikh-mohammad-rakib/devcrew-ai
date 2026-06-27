"use client"

/**
 * `useIsMobile` — viewport-size hook.
 *
 * Returns `true` when the viewport is below Tailwind's `md` breakpoint
 * (768 px). Used by the sidebar to switch between desktop collapsed
 * (icon-only) and mobile (full-screen sheet) presentation modes.
 *
 * Implementation notes
 * --------------------
 * - On the server (no `window`) we default to `false` (desktop). This
 *   keeps the initial Server Component render producing the same DOM
 *   as a desktop browser, avoiding hydration mismatches on first load.
 * - We re-subscribe on every change rather than only on mount, so a
 *   window resize across the breakpoint is observed.
 */

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }
    setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}