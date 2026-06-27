import { WorkspacesPage } from "@/features/workspace"

/**
 * Root route inside the `(app)` route group → renders the Workspace
 * feature's page entry point.
 *
 * All workspace-specific code (loader, view, types) lives under
 * `@/features/workspace`. This file stays thin so adding new routes
 * (e.g. `/projects`, `/timeline`) is a one-line change inside the
 * same route group.
 */
export default WorkspacesPage