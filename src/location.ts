import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { version as appVersion } from "../package.json";
import {
  checkLocationPermissions,
  requestLocationPermissions,
  currentDevicePosition,
} from "./native-location";
import { z } from "zod";
import { Location, type Locale } from "../shared/schema";
import {
  detectedTimezone,
  locationFromCoordinates,
} from "../shared/setup-defaults";

export function locationErrorKey(error: unknown) {
  const code = String((error as { code?: unknown })?.code ?? "");
  if (["1", "OS-PLUG-GLOC-0003"].includes(code)) return "locationDenied";
  if (
    [
      "OS-PLUG-GLOC-0007",
      "OS-PLUG-GLOC-0009",
      "OS-PLUG-GLOC-0016",
      "OS-PLUG-GLOC-0017",
    ].includes(code)
  )
    return "locationDisabled";
  if (["3", "OS-PLUG-GLOC-0010"].includes(code)) return "locationTimeout";
  if (["OS-PLUG-GLOC-0014", "OS-PLUG-GLOC-0015"].includes(code))
    return "locationServicesError";
  return "locationUnavailable";
}
export async function withDeadline<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject({ code: "OS-PLUG-GLOC-0010" }), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}
export async function devicePosition() {
  if (Capacitor.isNativePlatform()) {
    let permission = await withDeadline(checkLocationPermissions(), 10000);
    if (
      permission.location !== "granted" &&
      permission.coarseLocation !== "granted"
    )
      permission = await withDeadline(requestLocationPermissions(), 60000);
    if (
      permission.location !== "granted" &&
      permission.coarseLocation !== "granted"
    )
      throw { code: "OS-PLUG-GLOC-0003" };
  }
  try {
    return await withDeadline(
      currentDevicePosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      }),
      23000,
    );
  } catch (error) {
    if (
      !["locationTimeout", "locationUnavailable"].includes(
        locationErrorKey(error),
      )
    )
      throw error;
    // Approximate network position is valid too; never require precise permission.
    return await withDeadline(
      currentDevicePosition({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 60000,
      }),
      15000,
    );
  }
}
const responses = new Map<string, unknown>();
export async function publicJson(url: string, cache = true): Promise<unknown> {
  if (cache && responses.has(url)) return responses.get(url);
  let value: unknown;
  if (Capacitor.isNativePlatform()) {
    const response = await withDeadline(
      CapacitorHttp.get({
        url,
        connectTimeout: 8000,
        readTimeout: 8000,
        headers: { "User-Agent": `Namoz/${appVersion} (app.namoz.prayer.fdroid)` },
      }),
      10000,
    );
    if (response.status !== 200) throw Error("Geocoding unavailable");
    value =
      typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data;
  } else {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      credentials: "omit",
      referrerPolicy: "strict-origin",
    });
    if (!response.ok) throw Error("Geocoding unavailable");
    value = await response.json();
  }
  if (responses.size >= 50) responses.delete(responses.keys().next().value!);
  if (cache) responses.set(url, value);
  return value;
}
const searchResponse = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
});
export async function searchWorldCities(
  query: string,
  locale: Locale,
): Promise<Location[]> {
  if (query.trim().length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query.trim().slice(0, 100),
    count: "12",
    language: locale.split("-")[0],
    format: "json",
  }).toString();
  const data = searchResponse.parse(await publicJson(url.toString()));
  return (data.results || []).flatMap((city) => {
    const parsed = Location.safeParse({
      name:
        city.admin1 && city.admin1 !== city.name
          ? city.name + ", " + city.admin1
          : city.name,
      country: city.country || "",
      latitude: city.latitude,
      longitude: city.longitude,
      timezone:
        city.timezone || detectedTimezone(city.latitude, city.longitude),
    });
    return parsed.success ? [parsed.data] : [];
  });
}
let lastReverse = 0;
export async function resolvePosition(
  latitude: number,
  longitude: number,
  locale: Locale,
  label: string,
): Promise<{ location: Location; named: boolean }> {
  const fallback = locationFromCoordinates(
    latitude,
    longitude,
    `${label} (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
  );
  try {
    const url = new URL(
      import.meta.env.VITE_REVERSE_GEOCODER_URL ||
        "https://nominatim.openstreetmap.org/reverse",
    );
    url.search = new URLSearchParams({
      lat: latitude.toFixed(3),
      lon: longitude.toFixed(3),
      format: "jsonv2",
      zoom: "10",
      "accept-language": locale.split("-")[0],
    }).toString();
    // Only invoked by the location button, never by typing or background tracking.
    if (Date.now() - lastReverse < 1100 && !responses.has(url.toString()))
      throw Error("Retry later");
    lastReverse = Date.now();
    const data = z
      .object({
        address: z.object({
          city: z.string().optional(),
          town: z.string().optional(),
          village: z.string().optional(),
          municipality: z.string().optional(),
          province: z.string().optional(),
          country: z.string().optional(),
        }),
      })
      .parse(await publicJson(url.toString()));
    const name =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality;
    if (!name) throw Error("No city name");
    // Keep actual device coordinates, not the geocoder's city-centre coordinates.
    return {
      location: {
        ...fallback,
        name: [
          name,
          data.address.province !== name ? data.address.province : "",
        ]
          .filter(Boolean)
          .join(", ")
          .slice(0, 120),
        country: (data.address.country || "").slice(0, 80),
      },
      named: true,
    };
  } catch {
    return { location: fallback, named: false };
  }
}
