/**
 * Public surface of the shared UI components.
 *
 * Importers should pull from `@/components/shared` rather than the
 * individual files. This barrel exists so we can rename or move
 * internal files without touching every consumer.
 *
 * Scope
 * -----
 * "Shared" here means **cross-feature** but **app-specific**: these
 * are presentation primitives used by every feature page inside the
 * application shell. App-agnostic UI primitives (Button, Dialog,
 * Skeleton, …) live in `@workspace/ui`.
 */

export { EmptyState, type EmptyStateProps } from "./empty-state"
export { ErrorState, type ErrorStateProps } from "./error-state"
export { LoadingState, type LoadingStateProps } from "./loading-state"
export { PageHeader, type PageHeaderProps } from "./page-header"