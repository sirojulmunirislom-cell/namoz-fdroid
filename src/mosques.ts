import { api } from "./api";
import { Mosque, type Location } from "../shared/schema";
import { z } from "zod";
import { SearchedMosque } from "../shared/mosques";
export { parseMosques } from "../shared/mosques";
const pending = new Map<string, Promise<{ items: Mosque[]; at: string; stale: boolean }>>();
let lastRequest = 0;
export function loadMosques(location: Location) {
  const key = location.latitude.toFixed(3) + "," + location.longitude.toFixed(3);
  const active = pending.get(key);
  if (active) return active;
  const request = searchMosques(location).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
async function searchMosques(location: Location): Promise<{ items: Mosque[]; at: string; stale: boolean }> {
  const lat = location.latitude.toFixed(3),
    lon = location.longitude.toFixed(3);
  const key = `namoz.mosques:${lat},${lon}`;
  let saved: { items: Mosque[]; at: string } | undefined;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    saved = z
      .object({ items: z.array(Mosque), at: z.string().datetime() })
      .parse(raw);
  } catch {}
  if (saved && Date.now() - Date.parse(saved.at) < 3600000)
    return { ...saved, stale: !navigator.onLine };
  try {
    if (Date.now() - lastRequest < 5000) throw Error("Please retry shortly");
    lastRequest = Date.now();
    const items = z.array(SearchedMosque).parse(await api("/mosques?" + new URLSearchParams({ lat, lon }), {
      credentials: "omit",
      // OSM (40s) plus the independent fallback (20s).
      signal: AbortSignal.timeout(65_000),
    })).map(item => ({ ...item, city: item.city || location.name, country: item.country || location.country }));
    const result = {
      items,
      at: new Date().toISOString(),
      stale: false,
    };
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("namoz.mosques:"),
      );
      if (keys.length >= 5 && !keys.includes(key))
        localStorage.removeItem(keys[0]);
      localStorage.setItem(key, JSON.stringify(result));
    } catch {}
    return result;
  } catch (error) {
    if (saved) return { ...saved, stale: true };
    throw error;
  }
}
