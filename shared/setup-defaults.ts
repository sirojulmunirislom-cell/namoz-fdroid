import tzlookup from "tz-lookup";
import {
  type Location,
  type PrayerSettings,
  type Recommendation,
  Recommendation as RecommendationSchema,
} from "./schema";
import { cities, distanceKm } from "./prayer";
export function detectedTimezone(latitude: number, longitude: number): string {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return "";
  try {
    return tzlookup(latitude, longitude);
  } catch {
    return "";
  }
}
export function locationFromCoordinates(
  latitude: number,
  longitude: number,
  label: string,
): Location {
  const timezone = detectedTimezone(latitude, longitude);
  const nearest = cities
    .map((c) => ({ city: c, distance: distanceKm(c, { latitude, longitude }) }))
    .sort((a, b) => a.distance - b.distance)[0];
  const nearby =
    nearest && nearest.distance <= 25 && nearest.city.timezone === timezone
      ? nearest.city
      : null;
  return {
    name: nearby?.name || label,
    country: nearby?.country || "",
    latitude,
    longitude,
    timezone,
  };
}
export function setupDefaults(
  location: Location,
  recommendations: unknown[] = [],
): Pick<PrayerSettings, "method" | "madhab" | "highLatitudeRule"> & {
  source: "regional" | "standard" | "verified";
  recommendation?: Recommendation;
} {
  const verified = recommendations
    .map((r) => RecommendationSchema.safeParse(r))
    .filter((r) => r.success)
    .map((r) => r.data!)
    .filter(
      (r) =>
        r.verified &&
        r.country === location.country &&
        (!r.city || r.city === location.name),
    )
    .sort((a, b) => Number(Boolean(b.city)) - Number(Boolean(a.city)))[0];
  const zone = location.timezone;
  let method: PrayerSettings["method"] = "MuslimWorldLeague",
    madhab: PrayerSettings["madhab"] = "shafi",
    source: "regional" | "standard" | "verified" = "standard";
  const profiles: Record<
    string,
    [PrayerSettings["method"], PrayerSettings["madhab"]]
  > = {
    "Asia/Tashkent": ["Karachi", "hanafi"],
    "Asia/Samarkand": ["Karachi", "hanafi"],
    "Asia/Karachi": ["Karachi", "hanafi"],
    "Asia/Dhaka": ["Karachi", "hanafi"],
    "Asia/Dushanbe": ["Karachi", "hanafi"],
    "Asia/Bishkek": ["Karachi", "hanafi"],
    "Asia/Almaty": ["MuslimWorldLeague", "hanafi"],
    "Asia/Qyzylorda": ["MuslimWorldLeague", "hanafi"],
    "Asia/Riyadh": ["UmmAlQura", "shafi"],
    "Asia/Dubai": ["Dubai", "shafi"],
    "Asia/Qatar": ["Qatar", "shafi"],
    "Asia/Kuwait": ["Kuwait", "shafi"],
    "Asia/Singapore": ["Singapore", "shafi"],
    "Asia/Kuala_Lumpur": ["Singapore", "shafi"],
    "Europe/Istanbul": ["Turkey", "hanafi"],
    "Asia/Istanbul": ["Turkey", "hanafi"],
    "Africa/Cairo": ["Egyptian", "shafi"],
  };
  if (profiles[zone]) {
    [method, madhab] = profiles[zone];
    source = "regional";
  }
  if (verified) {
    method = verified.method;
    madhab = verified.madhab;
    source = "verified";
  }
  // Adhan's 48-degree starting threshold, applied symmetrically to both hemispheres.
  return {
    method,
    madhab,
    highLatitudeRule: Math.abs(location.latitude) > 48 ? "seventh" : "middle",
    source,
    ...(verified ? { recommendation: verified } : {}),
  };
}
