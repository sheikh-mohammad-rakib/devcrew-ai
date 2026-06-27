"use client"

/**
 * "New Workspace" dialog.
 *
 * Client Component because it owns interactive state (open / loading /
 * field values / errors). On submit it:
 *
 *   1. Validates the name client-side (must be non-empty, max 100 chars
 *      to match the backend Pydantic constraint).
 *   2. Calls the existing {@link createWorkspace} helper from
 *      `@/lib/api/workspace` — exactly as the requirement specifies.
 *   3. Surfaces backend validation errors (FastAPI returns 422 with a
 *      structured `detail` array; we map those onto the form fields).
 *   4. On success, closes the dialog and calls `router.refresh()` so
 *      the surrounding Server Component re-runs its data load and the
 *      new workspace appears in the list without a full page reload.
 *
 * The component is intentionally self-contained: it does not import
 * any feature-internal state. The parent only needs to render it once
 * inside the list page.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PlusIcon } from "lucide-react"

import { ApiError } from "@/lib/api/client"
import { createWorkspace } from "@/lib/api/workspace"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** Field-level validation error keyed by field name. */
type FieldErrors = Partial<Record<"name" | "description", string>>

interface FormState {
  name: string
  description: string
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Convert the FastAPI 422 ``detail`` array into our {@link FieldErrors}
 * shape. Falls back to a generic top-level error string when the body
 * doesn't match the expected structure.
 */
function extractFieldErrors(body: unknown): FieldErrors | string | null {
  if (!body || typeof body !== "object") return null
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === "string") return detail
  if (!Array.isArray(detail)) return null

  const errors: FieldErrors = {}
  let hasAny = false
  for (const entry of detail) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as { loc?: unknown; msg?: unknown }
    const loc = Array.isArray(e.loc) ? e.loc : []
    // FastAPI loc is e.g. ["body", "name"]. Skip the leading "body".
    const field = loc.find(
      (x): x is "name" | "description" =>
        x === "name" || x === "description",
    )
    if (field && typeof e.msg === "string") {
      errors[field] = e.msg
      hasAny = true
    }
  }
  return hasAny ? errors : null
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function CreateWorkspaceDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<FormState>({
    name: "",
    description: "",
  })
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset every per-form state when the dialog opens/closes so the user
  // never sees leftover errors / values from a previous session.
  React.useEffect(() => {
    if (!open) {
      // Defer reset to after the close animation so the user doesn't see
      // a flash of empty fields. 200 ms matches the Dialog's tail.
      const handle = setTimeout(() => {
        setForm({ name: "", description: "" })
        setFieldErrors({})
        setFormError(null)
        setIsSubmitting(false)
      }, 200)
      return () => clearTimeout(handle)
    }
    return undefined
  }, [open])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear that field's error as the user types — they may be fixing it.
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    }
    if (formError) setFormError(null)
  }

  function validateLocal(): boolean {
    const next: FieldErrors = {}
    const trimmed = form.name.trim()
    if (trimmed.length === 0) {
      next.name = "Name is required."
    } else if (trimmed.length > 100) {
      next.name = "Name must be 100 characters or fewer."
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    if (!validateLocal()) return

    setIsSubmitting(true)
    try {
      await createWorkspace({
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      // Success — close and ask Next.js to re-render the page.
      setOpen(false)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const result = extractFieldErrors(err.body)
        if (result && typeof result === "object") {
          setFieldErrors(result)
          setFormError(null)
        } else if (typeof result === "string") {
          setFormError(result)
        } else {
          setFormError("Validation failed. Please check your input.")
        }
      } else if (err instanceof ApiError) {
        setFormError(
          err.status === 0
            ? "Could not reach the API. Is the backend running?"
            : `API error (${err.status}): ${err.message}`,
        )
      } else {
        setFormError(err instanceof Error ? err.message : "Unknown error")
      }
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="default" size="default">
          <PlusIcon data-icon="inline-start" />
          New Workspace
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>
            Workspaces are the top-level containers for DevCrew engagements.
            You can rename or delete them later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="workspace-name"
              className="text-sm font-medium leading-none"
            >
              Name
            </label>
            <input
              id="workspace-name"
              name="name"
              type="text"
              required
              autoComplete="off"
              maxLength={100}
              disabled={isSubmitting}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "workspace-name-error" : undefined}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30"
              placeholder="My new workspace"
            />
            {fieldErrors.name ? (
              <p
                id="workspace-name-error"
                role="alert"
                className="text-destructive text-xs"
              >
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="workspace-description"
              className="text-sm font-medium leading-none"
            >
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="workspace-description"
              name="description"
              rows={3}
              disabled={isSubmitting}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description ? "workspace-description-error" : undefined
              }
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30"
              placeholder="What is this workspace for?"
            />
            {fieldErrors.description ? (
              <p
                id="workspace-description-error"
                role="alert"
                className="text-destructive text-xs"
              >
                {fieldErrors.description}
              </p>
            ) : null}
          </div>

          {formError ? (
            <div
              role="alert"
              className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  Creating…
                </>
              ) : (
                "Create workspace"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}