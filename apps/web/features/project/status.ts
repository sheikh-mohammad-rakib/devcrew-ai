/**
 * Project status bridge.
 *
 * Bridges the backend's {@link BackendProjectStatus} enum (lowercase
 * strings persisted to the database) and the frontend
 * :class:`ProjectStatus` union (uppercase strings consumed by
 * :class:`ProjectStatusBadge`).
 *
 * The two vocabularies don't match one-to-one today:
 *
 *   - The backend's `paused` state is rendered as `REVIEW` on the
 *     frontend — there's no "paused" badge, and the badge's
 *     docstring explicitly proposed this bridge.
 *   - The frontend has `PLANNING` where the backend has `planned`.
 *
 * Centralising the mapping here means call sites never have to do
 * the lookup themselves, and a future backend rename (e.g.
 * `planned → planning`) becomes a one-line change in this file.
 *
 * Why two types?
 * --------------
 * The badge type is owned by the badge component and re-exported
 * from this feature. The backend status is a plain string union
 * here for IDE hover / type-narrowing without dragging the backend
 * enum into the frontend bundle.
 */

import type { ProjectStatus } from "@/features/project/components/ProjectStatusBadge";

/**
 * Backend `ProjectStatus` enum values, as serialized in API
 * responses (`/api/v1/.../projects`). Lowercase by convention.
 */
export type BackendProjectStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "archived";

/** Convenience type guard. */
export function isBackendProjectStatus(
  value: string,
): value is BackendProjectStatus {
  return (
    value === "planned" ||
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "archived"
  );
}

/**
 * Map a backend status (as received from the API) to a frontend
 * :class:`ProjectStatus` string.
 *
 * Unknown / unexpected values fall back to `"PLANNING"` so the UI
 * never renders a broken badge. This is the forward direction
 * (read path).
 */
export function backendStatusToBadgeStatus(
  status: string,
): ProjectStatus {
  switch (status) {
    case "planned":
      return "PLANNING";
    case "active":
      return "ACTIVE";
    case "paused":
      return "REVIEW";
    case "completed":
      return "COMPLETED";
    case "archived":
      return "ARCHIVED";
    default:
      // Defensive default: never render a broken badge.
      return "PLANNING";
  }
}

/**
 * Map a frontend :class:`ProjectStatus` string back to the
 * backend's enum value. The inverse direction is needed when the
 * create dialog (or a future status editor) submits a chosen
 * state to the API.
 *
 * Note: the frontend "REVIEW" maps back to the backend "paused" —
 * the asymmetry is intentional until the backend enum is renamed
 * to match the frontend. See the docstring at the top of this
 * file.
 */
export function badgeStatusToBackendStatus(
  status: ProjectStatus,
): BackendProjectStatus {
  switch (status) {
    case "PLANNING":
      return "planned";
    case "ACTIVE":
      return "active";
    case "REVIEW":
      return "paused";
    case "COMPLETED":
      return "completed";
    case "ARCHIVED":
      return "archived";
  }
}