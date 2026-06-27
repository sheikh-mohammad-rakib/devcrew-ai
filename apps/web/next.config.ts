import type { NextConfig } from "next"

const FASTAPI_ORIGIN = "http://127.0.0.1:8000"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],

  /**
   * Proxy `/api/*` from the Next.js dev server to the FastAPI backend.
   *
   * Why:
   *   The FastAPI backend does not (yet) ship CORS middleware. Sending
   *   cross-origin requests from `http://localhost:3000` → `http://127.0.0.1:8000`
   *   triggers a CORS preflight (`OPTIONS /api/...`), which FastAPI
   *   answers with 405 and no `Access-Control-Allow-*` headers. The
   *   browser then blocks the actual `POST`, and the frontend sees a
   *   network error.
   *
   *   By proxying through Next.js, the browser sees a same-origin
   *   request (no preflight). The proxy itself is a server-to-server
   *   HTTP call that has no CORS constraints.
   *
   *   Set `NEXT_PUBLIC_API_BASE_URL=""` (empty) in `apps/web/.env.local`
   *   to use this proxy. Otherwise the client falls back to the
   *   direct cross-origin URL and the CORS error reappears.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${FASTAPI_ORIGIN}/api/:path*`,
      },
    ]
  },
}

export default nextConfig