import { ProjectsPage } from "@/features/project";

/**
 * `/projects` route inside the `(app)` route group.
 *
 * Renders the Project feature's page entry point. All project-
 * specific code (loader, view, types) lives under
 * `@/features/project`. This file stays thin so adding new routes
 * (e.g. `/timeline`) is a one-line change inside the same route
 * group.
 */
export default ProjectsPage;