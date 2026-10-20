import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { api } from "./api";
import {
  normalizeOpenMeteo,
  openMeteoUrl,
  type WeatherSnapshot,
} from "../shared/weather";
const cache = new Map<string, { at: number; value: WeatherSnapshot }>();
const pending = new Map<string, Promise<WeatherSnapshot>>();
export async function loadWeather(
  latitude: number,
  longitude: number,
  force = false,
): Promise<WeatherSnapshot> {
  // Direct access is an explicit non-commercial preview option, not a production fallback.
  if (import.meta.env.VITE_DIRECT_WEATHER !== "open-meteo")
    return api(`/weather?lat=${latitude}&lon=${longitude}`);
  const url = openMeteoUrl(latitude, longitude);
  const previous = cache.get(url);
  if (previous && Date.now() - previous.at < (force ? 60_000 : 30 * 60_000))
    return previous.value;
  const ongoing = pending.get(url);
  if (ongoing) return ongoing;
  const request = (async () => {
    let raw: unknown;
    if (Capacitor.isNativePlatform()) {
      const r = await CapacitorHttp.get({
        url,
        connectTimeout: 12000,
        readTimeout: 12000,
      });
      if (r.status !== 200) throw new Error("Weather service unavailable");
      raw = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const r = await fetch(url, {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (!r.ok) throw new Error("Weather service unavailable");
        raw = await r.json();
      } finally {
        clearTimeout(timeout);
      }
    }
    const value = normalizeOpenMeteo(raw);
    if (cache.size >= 8) cache.delete(cache.keys().next().value!);
    cache.set(url, { at: Date.now(), value });
    return value;
  })();
  pending.set(url, request);
  try {
    return await request;
  } finally {
    pending.delete(url);
  }
}
