/**
 * Feature-local types for the Project feature.
 *
 * The Project type itself lives in `@/lib/api/project` (it's part of
 * the API binding layer). This module re-exports it so feature
 * consumers can do:
 *
 *     import type { Project, FetchResult, LoadProjectsResult } from
 *       "@/features/project";
 *
 * without reaching into the API layer directly.
 *
 * Three envelopes are defined here:
 *
 *   - :class:`FetchResult`           — discriminated union used by the
 *     list view to render either the populated list, an empty
 *     state, or an error panel.
 *   - :class:`LoadProjectsResult`    — broader envelope returned by
 *     the loader. Adds a `no-workspace` state for "the user hasn't
 *     created any workspaces yet, so there's nowhere to scope a
 *     project list to".
 *   - :class:`WorkspaceContext`      — minimal context object passed
 *     to the create dialog so it knows which workspace to post to.
 */

import type { Project } from "@/lib/api/project";

export type { Project };

/**
 * Result envelope for the Project list page view.
 *
 * Mirrors the shape used by the Workspace feature so the two list
 * pages compose with the same shared components.
 */
export type FetchResult =
  | {
      kind: "ok";
      projects: Project[];
      workspaceId: string;
      workspaceName: string;
    }
  | { kind: "error"; status: number; message: string };

/**
 * Broader envelope returned by {@link loadProjects}. Adds a
 * `no-workspace` state that the loader surfaces when the API
 * returned zero workspaces — in that case there's no workspace to
 * scope a project list to and the page should display a friendly
 * "Create a workspace first" empty state.
 */
export type LoadProjectsResult =
  | {
      kind: "ok";
      projects: Project[];
      workspaceId: string;
      workspaceName: string;
    }
  | { kind: "no-workspace" }
  | { kind: "error"; status: number; message: string };

/**
 * Workspace context passed to the create dialog. The dialog posts
 * new projects against this workspace.
 */
export interface WorkspaceContext {
  id: string;
  /** Display name — used by the dialog's title/description. */
  name: string;
}