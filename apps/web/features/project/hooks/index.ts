/**
 * Project feature hooks.
 *
 * Currently empty. The Project feature's only interactive client-
 * side state (the create dialog) uses ``useRouter`` and ``useState``
 * inline. As the feature grows — e.g. a status editor, a delete
 * confirmation, an activity feed with polling — reusable hooks
 * (``useProjectStatus``, ``useDeleteProject``) will live here.
 *
 * Why a placeholder barrel
 * ------------------------
 * The spec's recommended Project folder structure includes
 * ``hooks/``. Empty files are awkward in version control, but an
 * empty barrel communicates intent: this is where feature-local
 * React hooks will live. Importers can do
 * ``import { useX } from "@/features/project/hooks"`` even before
 * any hook exists.
 */
export {};