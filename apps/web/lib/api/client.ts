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
 *   1. `process.env.NEXT_PUBLIC_API_BASE_URL` — exposed to the browser.
 *   2. {@link DEFAULT_API_BASE_URL}.
 *
 * Trailing slashes are stripped so callers can do
 * `apiGet("/workspaces")` regardless of how the URL was set.
 */
export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined;

  const raw = (fromEnv && fromEnv.length > 0
    ? fromEnv
    : DEFAULT_API_BASE_URL
  ).trim();

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/** Build a full URL from a path, handling leading slashes robustly. */
function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
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