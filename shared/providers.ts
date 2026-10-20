import tzlookup from "tz-lookup";
import { fetchNearbyMosques, MosqueRateLimitError } from "./mosques";
export interface ProviderEnvironment {
  WEATHER_PROVIDER?: string;
  NODE_ENV?: string;
  MET_CONTACT_URL?: string;
  GEODATA_CONTACT_URL?: string;
}
export type ProviderCache = (
  key: string,
  ttl: number,
  fn: () => Promise<unknown>,
) => Promise<unknown>;
export function timezone(lat: number, lon: number) {
  return tzlookup(lat, lon);
}
export function metSymbolToCode(symbol: string): number | null {
  const base = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (base.includes("thunder")) return 95;
  if (base.includes("snow")) return base.includes("showers") ? 85 : 71;
  if (base.includes("sleet")) return 67;
  if (base.includes("rain")) return base.includes("showers") ? 80 : 61;
  return (
    (
      { clearsky: 0, fair: 1, partlycloudy: 2, cloudy: 3, fog: 45 } as Record<
        string,
        number
      >
    )[base] ?? null
  );
}
export function createProviders(
  env: ProviderEnvironment,
  externalCache?: ProviderCache,
) {
  const cache = new Map<string, { expires: number; data: unknown }>();
  async function memoryCached(
    key: string,
    ttl: number,
    fn: () => Promise<unknown>,
  ) {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data;
    const data = await fn();
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + ttl, data });
    return data;
  }

  const cached = externalCache ?? memoryCached;
  async function weather(lat: number, lon: number) {
    const provider =
      env.WEATHER_PROVIDER ??
      (env.NODE_ENV === "production" ? "disabled" : "open-meteo");
    if (provider === "met-no") return metWeather(lat, lon);
    if (provider !== "open-meteo")
      throw new Error("Weather provider is not configured");
    const a = lat.toFixed(2),
      b = lon.toFixed(2);
    return cached(`weather:${a},${b}`, 30 * 60_000, async () => {
      const u = new URL("https://api.open-meteo.com/v1/forecast");
      u.search = new URLSearchParams({
        latitude: a,
        longitude: b,
        hourly: "temperature_2m,precipitation_probability,weather_code",
        current: "temperature_2m,weather_code",
        timezone: "UTC",
        timeformat: "unixtime",
        forecast_days: "2",
      }).toString();
      const r = await fetch(u, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error("Weather service unavailable");
      const data = (await r.json()) as any;
      return {
        ...data,
        fetchedAt: new Date().toISOString(),
        provider: "Open-Meteo",
        providerUrl: "https://open-meteo.com/",
        attribution: "Weather data by Open-Meteo.com",
        license: "CC BY 4.0; free API for non-commercial use",
      };
    });
  }
  async function metWeather(lat: number, lon: number) {
    const contact = env.MET_CONTACT_URL;
    if (!contact || !contact.startsWith("https://"))
      throw new Error(
        "MET Norway requires an approved public project contact URL.",
      );
    const a = lat.toFixed(2),
      b = lon.toFixed(2);
    return cached(`met:${a},${b}`, 30 * 60_000, async () => {
      const r = await fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${a}&lon=${b}`,
        {
          headers: { "User-Agent": `Namoz/0.1 (${contact})` },
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!r.ok) throw new Error("Weather service unavailable");
      const raw = (await r.json()) as any;
      const series = (raw.properties?.timeseries ?? [])
        .map((row: any) => {
          const period = row.data?.next_1_hours ?? row.data?.next_6_hours;
          return {
            time: new Date(row.time).getTime() / 1000,
            temperature: row.data?.instant?.details?.air_temperature,
            code: metSymbolToCode(period?.summary?.symbol_code || ""),
            rain: period?.details?.probability_of_precipitation ?? null,
          };
        })
        .filter(
          (row: any) =>
            Number.isFinite(row.time) &&
            Number.isFinite(row.temperature) &&
            row.code !== null,
        );
      if (!series.length) throw new Error("Weather forecast unavailable");
      return {
        current: {
          time: series[0].time,
          temperature_2m: series[0].temperature,
          weather_code: series[0].code,
        },
        hourly: {
          time: series.map((s: any) => s.time),
          temperature_2m: series.map((s: any) => s.temperature),
          weather_code: series.map((s: any) => s.code),
          precipitation_probability: series.map((s: any) => s.rain),
        },
        fetchedAt: new Date().toISOString(),
        provider: "MET Norway",
        providerUrl: "https://www.met.no/",
        attribution: "Weather data: MET Norway · CC BY 4.0",
        license: "CC BY 4.0",
        forecastUpdatedAt: raw.properties?.meta?.updated_at,
      };
    });
  }
  let lastGeocode = 0;
  async function searchCities(query: string) {
    const contact = env.GEODATA_CONTACT_URL;
    if (!contact)
      throw new Error(
        "Online city search is not configured; use the offline list or coordinates",
      );
    return cached(`city:${query}`, 86400_000, async () => {
      if (Date.now() - lastGeocode < 1100)
        throw new Error("Please wait before searching again");
      lastGeocode = Date.now();
      const u = new URL("https://nominatim.openstreetmap.org/search");
      u.search = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        limit: "6",
        "accept-language": "uz,en",
      }).toString();
      const r = await fetch(u, {
        headers: { "User-Agent": `Namoz/0.1 (${contact})` },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error("City search unavailable");
      const rows = (await r.json()) as any[];
      return rows.map((x) => ({
        name:
          x.address?.city || x.address?.town || x.address?.village || x.name,
        country: x.address?.country || "",
        latitude: Number(x.lat),
        longitude: Number(x.lon),
        timezone: tzlookup(Number(x.lat), Number(x.lon)),
      }));
    });
  }
  let lastOverpass = 0;
  async function nearbyMosques(lat: number, lon: number) {
    const a = lat.toFixed(3),
      b = lon.toFixed(3);
    return cached(`mosque:${a},${b}:v3`, 3600_000, async () => {
      if (Date.now() - lastOverpass < 5000)
        throw new Error("Please wait before searching again");
      lastOverpass = Date.now();
      try {
        return await fetchNearbyMosques(
          lat, lon,
          env.GEODATA_CONTACT_URL || "https://namoz.namoz-prayer-bcaf08.workers.dev",
        );
      } catch (error) {
        if (error instanceof MosqueRateLimitError) lastOverpass = Date.now() + 25_000;
        throw error;
      }
    });
  }

  return { weather, searchCities, nearbyMosques };
}
