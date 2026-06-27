/**
 * Loading skeleton for the Workspace list page inside the shell.
 *
 * Next.js automatically wraps any `page.tsx` in `<Suspense>` and
 * streams this component while the Server Component's data fetch is
 * in flight. This gives the user a visible loading state without
 * shipping any client-side JS.
 *
 * The skeleton renders only the inner content column — the shell's
 * sidebar and header remain mounted around it. We render three card
 * skeletons (matching the most common list length) plus a placeholder
 * for the page header so the page doesn't visibly shift when the
 * real content streams in.
 */

import { LoadingState } from "@/components/shared"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-8 w-36" />
      </header>

      <LoadingState count={3} label="Loading workspaces" />
    </div>
  )
}