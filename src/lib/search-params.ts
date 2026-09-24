export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query-string parameter, or undefined. */
export function param(sp: SearchParams, key: string) {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}

export function intParam(sp: SearchParams, key: string) {
  const n = Number(param(sp, key));
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Rebuilds a URL keeping the current filters, with some changed or removed. */
export function withParams(path: string, sp: SearchParams, changes: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first && !(k in changes) && k !== "error") qs.set(k, first);
  }
  for (const [k, v] of Object.entries(changes)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
