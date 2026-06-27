"use client"

/**
 * "New Project" dialog.
 *
 * Mirrors :class:`CreateWorkspaceDialog` in structure and behaviour:
 *
 *   - Client Component because it owns interactive state (open /
 *     loading / field values / errors).
 *   - Validates ``name`` client-side (1–100 chars to match the
 *     backend Pydantic constraint on ``projects.name``).
 *   - Calls :func:`createProjectForWorkspace` from the API binding.
 *   - Surfaces backend validation errors (FastAPI 422 → field-keyed
 *     errors) on the form.
 *   - On success, closes the dialog and calls ``router.refresh()`` so
 *     the surrounding Server Component re-runs its loader and the new
 *     project appears in the list.
 *
 * Workspace context
 * -----------------
 * Projects are scoped to a workspace (``workspace_id`` is a NOT NULL
 * FK). This dialog needs to know which workspace to post to, so it
 * receives ``workspace`` as a prop. The parent (the Projects list
 * page) passes the same workspace it loaded projects from.
 *
 * If ``workspace`` is absent — i.e. the page is rendering the
 * "no workspace yet" state — the dialog renders a disabled
 * placeholder trigger labelled "No workspace selected" so the
 * empty-state CTA still appears but doesn't claim to do anything
 * useful.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PlusIcon } from "lucide-react"

import { ApiError } from "@/lib/api/client"
import { createProjectForWorkspace } from "@/lib/api/project"
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

import {
  badgeStatusToBackendStatus,
} from "@/features/project/status"
import type { WorkspaceContext } from "@/features/project/types"

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

export interface CreateProjectDialogProps {
  /**
   * Workspace the new project should belong to. When omitted the
   * dialog renders a disabled placeholder — there is no sensible
   * workspace to scope the create against, so we don't pretend
   * otherwise.
   */
  workspace?: WorkspaceContext
}

/**
 * "New Project" trigger + modal.
 *
 * @example
 *   // On a Projects page that has a workspace:
 *   <CreateProjectDialog workspace={{ id: ws.id, name: ws.name }} />
 *
 *   // In an empty "no workspace yet" empty state:
 *   <CreateProjectDialog /> // renders disabled
 */
export function CreateProjectDialog({ workspace }: CreateProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<FormState>({
    name: "",
    description: "",
  })
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset every per-form state when the dialog opens/closes so the
  // user never sees leftover errors / values from a previous session.
  React.useEffect(() => {
    if (!open) {
      // Defer reset to after the close animation so the user doesn't
      // see a flash of empty fields. 200 ms matches the Dialog's tail.
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
    if (!workspace) return // Defensive — should be disabled at this point.

    setIsSubmitting(true)
    try {
      await createProjectForWorkspace(workspace.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        // New projects start in PLANNING. Map through the same
        // bridge that the badge uses, then forward the backend's
        // lowercase enum value to the API. If the bridge is ever
        // renamed, this call site doesn't need to change.
        status: badgeStatusToBackendStatus("PLANNING"),
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

  // Without a workspace, render a disabled placeholder trigger so the
  // empty-state action still appears but doesn't claim to do anything.
  if (!workspace) {
    return (
      <Button variant="outline" disabled aria-disabled="true">
        <PlusIcon data-icon="inline-start" />
        No workspace selected
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="default" size="default">
          <PlusIcon data-icon="inline-start" />
          New Project
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a project</DialogTitle>
          <DialogDescription>
            Projects live inside the <strong>{workspace.name}</strong>{" "}
            workspace. You can rename or move them later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-name"
              className="text-sm font-medium leading-none"
            >
              Name
            </label>
            <input
              id="project-name"
              name="name"
              type="text"
              required
              autoComplete="off"
              maxLength={100}
              disabled={isSubmitting}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "project-name-error" : undefined}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30"
              placeholder="My new project"
            />
            {fieldErrors.name ? (
              <p
                id="project-name-error"
                role="alert"
                className="text-destructive text-xs"
              >
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-description"
              className="text-sm font-medium leading-none"
            >
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="project-description"
              name="description"
              rows={3}
              disabled={isSubmitting}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description ? "project-description-error" : undefined
              }
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30"
              placeholder="What is this project for?"
            />
            {fieldErrors.description ? (
              <p
                id="project-description-error"
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
                "Create project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
