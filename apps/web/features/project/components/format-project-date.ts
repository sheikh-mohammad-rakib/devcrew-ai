/**
 * Compact, locale-aware date formatter for project cards and detail
 * headers.
 *
 * Why a helper?
 * -------------
 *   - The backend emits ISO-8601 timestamps (``"2026-06-28T14:33:02"``).
 *     Rendering those raw is noisy; rendering them through
 *     ``Date.prototype.toLocaleDateString()`` is friendly but
 *     locale-dependent and inconsistent across the app.
 *   - Centralising the format means cards, detail headers, and
 *     future activity feeds all use the same string. A future
 *     redesign (e.g. "2 days ago" relative time) becomes a
 *     one-file change.
 *
 * Format
 * ------
 *   - Locale: en-US (matches the rest of the app).
 *   - Style: short month + day-of-month + year
 *     (e.g. "Jun 28, 2026").
 *   - Time: omitted — cards care about *when*, not *what time*.
 *
 * Defensive parsing
 * -----------------
 * If the input is missing, malformed, or not a string, we return
 * ``null`` so callers can render a placeholder or omit the field.
 * We never throw — a bad timestamp must never break a card render.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Format an ISO-8601 timestamp for compact display.
 *
 * @param iso An ISO-8601 string (e.g. ``"2026-06-28T14:33:02"``).
 * @returns The formatted date, or ``null`` if the input is invalid.
 */
export function formatProjectDate(iso: string | null | undefined): string | null {
  if (typeof iso !== "string" || iso.length === 0) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FORMATTER.format(d);
}
