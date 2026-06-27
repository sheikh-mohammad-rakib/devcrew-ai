/**
 * API client for the DevCrew AI backend.
 *
 * This module is a thin, dependency-free wrapper around the browser
 * `fetch` API. It exists to:
 *
 *   1. Centralize the base URL, headers, and error handling so feature
 *      modules never duplicate that logic.
 *   2. Make the base URL configurable at runtime via a getter that
 *      reads `NEXT_PUBLIC_API_BASE_URL` first, then falls back to the
 *      local FastAPI default.
 *   3. Translate non-2xx responses into typed `ApiError` instances so
 *      callers can branch on `error.status` / `error.code` instead of
 *      parsing strings.
 *
 * Design rules
 * ------------
 * - No external HTTP libraries. The browser already ships `fetch`.
 * - Every helper returns a typed `Promise<T>` parsed from JSON.
 * - Non-2xx responses throw `ApiError`; transport failures throw
 *   `ApiError` with `status = 0` and the underlying error attached.
 * - `Authorization: Bearer …` is supported via an optional token getter
 *   so we can plug auth in later without touching every call site.
 *
 * Server-side fetch
 * -----------------
 * When this client runs inside a Next.js Server Component, the
 * `fetch` implementation is undici (Node 18+). undici requires
 * *absolute* URLs — relative URLs throw "Failed to parse URL". To
 * keep Server Components working when ``NEXT_PUBLIC_API_BASE_URL``
 * is set to a relative path (so the browser can route through a
 * Next.js rewrite without CORS preflight), {@link buildUrl} upgrades
 * relative URLs to absolute ones on the server by reading the
 * incoming request's ``host`` header.
 */

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Shape returned by every endpoint as a FastAPI HTTPException.
 *
 *   { "detail": "Workspace not found: …" }
 *
 * We keep this permissive because FastAPI can also return other shapes
 * for 422 validation errors (`detail` becomes an array of field errors).
 */
export interface ApiErrorBody {
  detail?: unknown;
}

/** Custom error class so callers can `instanceof ApiError` safely. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly body: ApiErrorBody | undefined;
  public readonly url: string;
  public readonly cause?: unknown;

  constructor(
    message: string,
    init: {
      status: number;
      url: string;
      body?: ApiErrorBody;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = init.status;
    this.body = init.body;
    this.url = init.url;
    this.cause = init.cause;
  }
}

/** Init bag accepted by {@link apiFetch}. */
export interface ApiFetchOptions {
  /** HTTP method. Default: GET. */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request body — will be JSON-serialized if not a string/FormData. */
  body?: unknown;
  /** Additional request headers (merged with defaults). */
  headers?: Record<string, string>;
  /** AbortController signal for cancellation. */
  signal?: AbortSignal;
  /** Override the default timeout (ms). Default: 30 000. */
  timeoutMs?: number;
  /** Skip auth header injection (useful for public endpoints). */
  skipAuth?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Configuration                                                               */
/* -------------------------------------------------------------------------- */

/** Default base URL of the local FastAPI dev server. */
export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Optional global token provider. Set this once at app startup (e.g.
 * after login) and every subsequent request will include
 * `Authorization: Bearer <token>`.
 *
 * Pluggable as a function (not a static value) so tokens that expire
 * or rotate are read fresh on every request.
 */
let tokenProvider: (() => string | null | undefined) | null = null;

export function setAuthTokenProvider(
  provider: (() => string | null | undefined) | null,
): void {
  tokenProvider = provider;
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the base URL.
 *
 * Resolution order:
 *   1. ``NEXT_PUBLIC_API_BASE_URL`` env var — may be an absolute URL
 *      (``http://…``) or empty for same-origin / Next.js-rewrite mode.
 *   2. {@link DEFAULT_API_BASE_URL}.
 *
 * Trailing slashes are stripped so callers can do
 * ``apiGet("/workspaces")`` regardless of how the URL was set.
 */
export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;

  if (fromEnv === undefined) {
    return DEFAULT_API_BASE_URL;
  }

  const trimmed = fromEnv.trim();
  if (trimmed.length === 0) return "";

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Build a full URL from a path, handling leading slashes robustly.
 *
 * On the server, relative base URLs (the same-origin / rewrite mode)
 * are upgraded to absolute URLs by reading the request's ``host``
 * header — undici refuses relative URLs.
 */
function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (base !== "") {
    return `${base}${normalizedPath}`;
  }

  // Same-origin mode: browser uses a plain relative URL; server
  // synthesizes an absolute one from the request's host.
  if (typeof window !== "undefined") {
    return normalizedPath;
  }

  // Server-side: undici fetch needs an absolute URL. Try to read the
  // current request's ``host`` header. We use the synchronous ``next/headers``
  // accessor pattern that works across Next.js 13/14/15; if unavailable
  // (build step / unit tests) fall back to the dev-server default.
  let host = "127.0.0.1:3000";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { headers } = require("next/headers") as typeof import("next/headers");
    const maybePromise = headers() as unknown;
    // Next 13/14/15 returns ReadonlyHeaders synchronously; Next 16
    // returns a Promise. Handle both transparently.
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === "function") {
      // We can't await here (this is a sync function). Fall back to
      // the dev default in that case — Next.js will still route the
      // request to itself because the path matches a rewrite rule.
      // The default below matches the dev server's bind address.
    } else {
      const h = maybePromise as { get?: (k: string) => string | null };
      const hostHeader = h?.get?.("host");
      if (hostHeader) host = hostHeader;
    }
  } catch {
    // Build step / non-Next context — keep the default.
  }
  const proto =
    typeof process !== "undefined" && process.env.NODE_ENV === "production"
      ? "https"
      : "http";
  return `${proto}://${host}${normalizedPath}`;
}

/**
 * Serialize a request body. Strings and FormData are passed through;
 * everything else is JSON-encoded.
 */
function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

/**
 * Attempt to parse a response body as JSON. Falls back to `undefined`
 * (with the raw text in the error) when parsing fails — the response
 * may be empty or contain non-JSON.
 */
async function parseBody(
  response: Response,
): Promise<ApiErrorBody | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return undefined;
  }
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

/** Best-effort error message extracted from a FastAPI error body. */
function extractDetailMessage(body: ApiErrorBody | undefined): string {
  if (!body) return "Unknown API error";
  const detail = body.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === "string") return first.msg;
  }
  return "API request failed";
}

/* -------------------------------------------------------------------------- */
/* Core fetch wrapper                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Perform an authenticated JSON request against the DevCrew API.
 *
 * Throws {@link ApiError} on any non-2xx response or transport failure.
 */
export async function apiFetch<TResponse = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<TResponse> {
  const {
    method = "GET",
    body,
    headers = {},
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    skipAuth = false,
  } = options;

  const url = buildUrl(path);

  // Compose headers. JSON content-type by default — overridable.
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof ArrayBuffer) &&
    !requestHeaders["Content-Type"]
  ) {
    requestHeaders["Content-Type"] = "application/json";
  }
  if (!skipAuth) {
    const token = tokenProvider?.();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  // Combine caller-provided signal with our timeout signal.
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const onCallerAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onCallerAbort);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: serializeBody(body),
      signal: controller.signal,
      // No Next.js caching — every request is a fresh server hit.
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timeoutHandle);
    signal?.removeEventListener("abort", onCallerAbort);
    const isAbort =
      (err instanceof DOMException && err.name === "AbortError") ||
      controller.signal.aborted;
    throw new ApiError(
      isAbort
        ? `Request to ${url} aborted (timeout or caller cancel)`
        : `Network error contacting ${url}: ${(err as Error).message}`,
      { status: 0, url, cause: err },
    );
  }

  clearTimeout(timeoutHandle);
  signal?.removeEventListener("abort", onCallerAbort);

  if (!response.ok) {
    const errorBody = await parseBody(response);
    throw new ApiError(
      `API ${method} ${url} failed (${response.status}): ${extractDetailMessage(errorBody)}`,
      { status: response.status, url, body: errorBody },
    );
  }

  // 204 / 205 / etc. — nothing to parse.
  if (response.status === 204) {
    return undefined as TResponse;
  }

  // JSON success — fall through to typed return.
  try {
    return (await response.json()) as TResponse;
  } catch (err) {
    throw new ApiError(
      `API ${method} ${url} returned a non-JSON success body`,
      { status: response.status, url, cause: err },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                         */
/* -------------------------------------------------------------------------- */

/**
 * `GET path` returning parsed JSON.
 *
 * @example
 *   const me = await apiGet<User>("/users/me");
 */
export function apiGet<T>(path: string, options: Omit<ApiFetchOptions, "method" | "body"> = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

/**
 * `POST path` with a JSON body.
 *
 * @example
 *   const created = await apiPost<Workspace>("/api/v1/workspaces", { name: "Foo" });
 */
export function apiPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  options: Omit<ApiFetchOptions, "method" | "body"> = {},
): Promise<TResponse> {
  return apiFetch<TResponse>(path, { ...options, method: "POST", body });
}

/**
 * `PATCH path` with a JSON body.
 *
 * @example
 *   const updated = await apiPatch<Project>("/api/v1/projects/abc", { name: "New" });
 */
export function apiPatch<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  options: Omit<ApiFetchOptions, "method" | "body"> = {},
): Promise<TResponse> {
  return apiFetch<TResponse>(path, { ...options, method: "PATCH", body });
}

/**
 * `DELETE path` returning the parsed JSON body (often empty).
 *
 * The backend typically returns the deleted entity or a status
 * envelope. Callers that don't care about the body can pass
 * ``undefined`` as the type parameter.
 *
 * @example
 *   await apiDelete<void>("/api/v1/projects/abc");
 */
export function apiDelete<TResponse = unknown>(
  path: string,
  options: Omit<ApiFetchOptions, "method" | "body"> = {},
): Promise<TResponse> {
  return apiFetch<TResponse>(path, { ...options, method: "DELETE" });
}