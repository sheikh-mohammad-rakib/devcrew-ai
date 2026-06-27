/**
 * ErrorState — uniform error panel shown when a feature's data
 * fetch fails. Renders a headline derived from the HTTP status (or
 * transport-level failure), the underlying error message, and an
 * optional retry action.
 *
 * Status → headline mapping
 * -------------------------
 *   - `0`     → "Could not reach the API" (transport failure)
 *   - `>=500` → "The API is having trouble"
 *   - other   → "API returned <status>"
 *
 * Callers can override the headline via the `title` prop. The
 * transport hint about the FastAPI URL is opt-in (set `showApiHint`)
 * so callers that point elsewhere (or don't want the hint for
 * security reasons in production) can suppress it.
 *
 * Server Component
 * ----------------
 * No interactivity; the retry action is rendered as a child slot
 * (typically a `<Button>` calling `router.refresh()`).
 *
 * @example
 *   <ErrorState
 *     status={result.status}
 *     message={result.message}
 *     showApiHint
 *     action={<Button onClick={() => router.refresh()}>Retry</Button>}
 *   />
 */

import * as React from "react"
import { AlertCircleIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export interface ErrorStateProps {
  /** HTTP status code (0 for transport failures). */
  status: number
  /** Human-readable error message from the API or transport layer. */
  message?: string
  /**
   * Override the auto-derived headline (e.g. for non-API errors).
   * When omitted, the headline is computed from `status`.
   */
  title?: string
  /**
   * Show the hint about the FastAPI dev server URL below the
   * message. Default: `false`.
   */
  showApiHint?: boolean
  /** Optional retry / recovery action element. */
  action?: React.ReactNode
  /** Extra classes appended to the outer container. */
  className?: string
}

function defaultTitle(status: number): string {
  if (status === 0) return "Could not reach the API"
  if (status >= 500) return "The API is having trouble"
  return `API returned ${status}`
}

export function ErrorState({
  status,
  message,
  title,
  showApiHint = false,
  action,
  className,
}: ErrorStateProps) {
  const headline = title ?? defaultTitle(status)

  return (
    <div
      role="alert"
      data-slot="error-state"
      data-status={status}
      className={cn(
        "border-destructive/40 bg-destructive/5 rounded-lg border p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircleIcon
          aria-hidden="true"
          className="text-destructive mt-0.5 size-5 shrink-0"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-destructive font-medium">{headline}</h2>
          {message ? (
            <p className="text-muted-foreground text-sm">{message}</p>
          ) : null}
          {showApiHint ? (
            <p className="text-muted-foreground/70 mt-1 text-xs">
              Make sure the FastAPI server is running on{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">
                {process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}
              </code>
              .
            </p>
          ) : null}
          {action ? <div className="mt-1">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}