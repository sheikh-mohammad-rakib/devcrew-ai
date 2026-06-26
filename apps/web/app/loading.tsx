/**
 * Loading skeleton for the Workspace list page.
 *
 * Next.js automatically wraps any `page.tsx` in `<Suspense>` and
 * streams this component while the Server Component's data fetch is
 * in flight. This gives the user a visible loading state without
 * shipping any client-side JS.
 */
export default function Loading() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl px-6 py-12">
      <header className="mb-8 flex flex-col gap-2">
        <div className="bg-muted h-8 w-40 animate-pulse rounded" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded" />
      </header>

      <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Loading workspaces">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border bg-card p-4"
          >
            <div className="flex flex-col gap-2">
              <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
              <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}