import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
  HighLatitudeRule,
  Qibla,
} from "adhan";
import { DateTime } from "luxon";
import { PrayerSettings, type Location } from "./schema";
export const prayerKeys = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;
export type PrayerKey = (typeof prayerKeys)[number];
export type PrayerDay = {
  date: string;
  timezone: string;
  times: Record<PrayerKey, string>;
  settingsKey: string;
};
export function settingsKey(s: PrayerSettings) {
  return [
    s.location.latitude,
    s.location.longitude,
    s.location.timezone,
    s.method,
    s.madhab,
    s.highLatitudeRule,
  ].join("|");
}
export function getPrayerDay(input: unknown, date?: string): PrayerDay | null {
  const parsed = PrayerSettings.safeParse(input);
  if (!parsed.success) return null;
  const s = parsed.data;
  const day = date
    ? DateTime.fromISO(date, { zone: s.location.timezone })
    : DateTime.now().setZone(s.location.timezone);
  if (!day.isValid) return null;
  const params = CalculationMethod[s.method]();
  params.madhab = s.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule =
    s.highLatitudeRule === "middle"
      ? HighLatitudeRule.MiddleOfTheNight
      : s.highLatitudeRule === "seventh"
        ? HighLatitudeRule.SeventhOfTheNight
        : HighLatitudeRule.TwilightAngle;
  const p = new PrayerTimes(
    new Coordinates(s.location.latitude, s.location.longitude),
    new Date(day.year, day.month - 1, day.day),
    params,
  );
  if (prayerKeys.some((k) => !Number.isFinite(p[k].getTime()))) return null;
  return {
    date: day.toISODate()!,
    timezone: s.location.timezone,
    times: Object.fromEntries(
      prayerKeys.map((k) => [k, p[k].toISOString()]),
    ) as Record<PrayerKey, string>,
    settingsKey: settingsKey(s),
  };
}
export function nextPrayer(s: PrayerSettings, now: Date = new Date()) {
  const day = DateTime.fromJSDate(now, { zone: s.location.timezone });
  for (const d of [day, day.plus({ days: 1 })]) {
    const p = getPrayerDay(s, d.toISODate()!);
    if (!p) continue;
    for (const k of prayerKeys.filter((k) => k !== "sunrise"))
      if (new Date(p.times[k]).getTime() > now.getTime())
        return { key: k, time: p.times[k] };
  }
  return null;
}
export function activeDhikrWindow(
  s: unknown,
  now: Date = new Date(),
): "morning" | "evening" | null {
  const parsed = PrayerSettings.safeParse(s);
  if (!parsed.success) return null;
  const day = getPrayerDay(
    parsed.data,
    DateTime.fromJSDate(now, {
      zone: parsed.data.location.timezone,
    }).toISODate()!,
  );
  if (!day) return null;
  const t = now.getTime(),
    ts = (k: PrayerKey) => new Date(day.times[k]).getTime();
  if (t >= ts("fajr") && t < ts("sunrise")) return "morning";
  if (t >= ts("asr") && t < ts("maghrib")) return "evening";
  return null;
}
export function qiblaDirection(
  location: Pick<Location, "latitude" | "longitude">,
) {
  return Qibla(new Coordinates(location.latitude, location.longitude));
}
export function angularDistance(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180);
}
export function distanceKm(
  a: Pick<Location, "latitude" | "longitude">,
  b: Pick<Location, "latitude" | "longitude">,
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dl = rad(b.latitude - a.latitude),
    dn = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dl / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dn / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function hijriParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-civil-nu-latn", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).formatToParts(date);
  return {
    day: Number(parts.find((p) => p.type === "day")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    year: Number(parts.find((p) => p.type === "year")?.value),
  };
}
export function voluntaryFastAllowed(month: number, day: number) {
  return !(
    month === 9 ||
    (month === 10 && day === 1) ||
    (month === 12 && day >= 10 && day <= 13)
  );
}
export const cities: Location[] = [
  {
    name: "Toshkent",
    country: "O‘zbekiston",
    latitude: 41.2995,
    longitude: 69.2401,
    timezone: "Asia/Tashkent",
  },
  {
    name: "Samarqand",
    country: "O‘zbekiston",
    latitude: 39.6542,
    longitude: 66.9597,
    timezone: "Asia/Samarkand",
  },
  {
    name: "Buxoro",
    country: "O‘zbekiston",
    latitude: 39.7747,
    longitude: 64.4286,
    timezone: "Asia/Samarkand",
  },
  {
    name: "Andijon",
    country: "O‘zbekiston",
    latitude: 40.7821,
    longitude: 72.3442,
    timezone: "Asia/Tashkent",
  },
  {
    name: "Namangan",
    country: "O‘zbekiston",
    latitude: 40.9983,
    longitude: 71.6726,
    timezone: "Asia/Tashkent",
  },
  {
    name: "Farg‘ona",
    country: "O‘zbekiston",
    latitude: 40.3864,
    longitude: 71.7864,
    timezone: "Asia/Tashkent",
  },
  {
    name: "Nukus",
    country: "O‘zbekiston",
    latitude: 42.4602,
    longitude: 59.6176,
    timezone: "Asia/Samarkand",
  },
  {
    name: "Qarshi",
    country: "O‘zbekiston",
    latitude: 38.8606,
    longitude: 65.789,
    timezone: "Asia/Samarkand",
  },
  {
    name: "Termiz",
    country: "O‘zbekiston",
    latitude: 37.2242,
    longitude: 67.2783,
    timezone: "Asia/Samarkand",
  },
  {
    name: "Jizzax",
    country: "O‘zbekiston",
    latitude: 40.1158,
    longitude: 67.8422,
    timezone: "Asia/Tashkent",
  },
  {
    name: "Urganch",
    country: "O‘zbekiston",
    latitude: 41.55,
    longitude: 60.6333,
    timezone: "Asia/Samarkand",
  },
  {
    name: "Navoiy",
    country: "O‘zbekiston",
    latitude: 40.1039,
    longitude: 65.3688,
    timezone: "Asia/Samarkand",
  },
  {
    name: "Guliston",
    country: "O‘zbekiston",
    latitude: 40.4897,
    longitude: 68.7842,
    timezone: "Asia/Tashkent",
  },
  {
    name: "Makkah",
    country: "Saudi Arabia",
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: "Asia/Riyadh",
  },
  {
    name: "Kayseri",
    country: "Türkiye",
    latitude: 38.7225,
    longitude: 35.4875,
    timezone: "Europe/Istanbul",
  },
  {
    name: "Istanbul",
    country: "Türkiye",
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: "Europe/Istanbul",
  },
  {
    name: "Moskva",
    country: "Россия",
    latitude: 55.7558,
    longitude: 37.6173,
    timezone: "Europe/Moscow",
  },
  {
    name: "London",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
  },
];
