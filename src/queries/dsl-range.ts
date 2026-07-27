/**
 * Perses supplies an absolute range; the DSL takes RFC 3339 bounds, so the
 * panel range becomes a `range(...)` stage (half-open per RFC 0002 §6.2 —
 * `from <= effective < to`). A hand-written range wins, so the editor never
 * lies about what ran. Shared by the log and time-series query plugins.
 */
export function withRange(dsl: string, start: Date, end: Date): string {
  if (/\brange\s*\(/.test(dsl)) return dsl;
  const [head, ...rest] = dsl.split("|");
  return [
    head!.trim(),
    `range(${start.toISOString()}, ${end.toISOString()})`,
    ...rest.map((s) => s.trim()),
  ].join(" | ");
}
