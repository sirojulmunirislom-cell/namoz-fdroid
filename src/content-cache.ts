// A server snapshot is authoritative, including an intentionally empty list.
// Never merge bundled records back into a successful snapshot: that would
// resurrect records the editor withdrew. Different API origins are isolated.
export function contentCacheKey(apiBase:string, bundled:boolean) {
  return apiBase ? `namoz.published:${apiBase.replace(/\/$/,"")}` : bundled ? "namoz.published.bundled" : "namoz.published";
}
export function initialContentSnapshot<T>(cached:T|null, fallback:T):T {
  return cached ?? fallback;
}
