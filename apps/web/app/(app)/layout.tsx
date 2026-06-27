import * as React from "react"

import { AppShell } from "@/components/app-shell"

/**
 * Route-grouped layout for shell-bearing routes.
 *
 * The `(app)` route group isolates the sidebar/header chrome from
 * routes that should NOT inherit it (login, signup, error pages, …).
 * Routes added under `app/(app)/` automatically render inside the
 * shell; routes added directly under `app/` skip it.
 *
 * Composition is delegated to {@link AppShell} so this layout stays
 * a one-liner that just hands children through.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}