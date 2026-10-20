import { z } from "zod";

export const locales = ["uz-Latn", "uz-Cyrl", "ru", "en"] as const;
export const Locale = z.enum(locales);
export type Locale = z.infer<typeof Locale>;
export const jamaatPrayerNames = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type JamaatPrayer = (typeof jamaatPrayerNames)[number];
export const methods = [
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "UmmAlQura",
  "Dubai",
  "MoonsightingCommittee",
  "NorthAmerica",
  "Kuwait",
  "Qatar",
  "Singapore",
  "Turkey",
  "Tehran",
] as const;
export const Location = z.object({
  name: z.string().min(1).max(120),
  country: z.string().max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid timezone"),
});
export type Location = z.infer<typeof Location>;
export const PrayerSettings = z.object({
  location: Location,
  method: z.enum(methods),
  madhab: z.enum(["hanafi", "shafi"]),
  confirmed: z.literal(true),
  highLatitudeRule: z.enum(["middle", "seventh", "angle"]),
  version: z.literal(1),
});
export type PrayerSettings = z.infer<typeof PrayerSettings>;
export const UserPreferences = z.object({
  locale: Locale.default("uz-Latn"),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  fontScale: z.number().min(1).max(1.5).default(1),
  showTransliteration: z.boolean().default(true),
  haptics: z.boolean().default(true),
  analytics: z.boolean().default(false),
  audienceStatistics: z.boolean().default(false),
  audienceAgeGroup: z.enum(["", "under18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"]).default(""),
  audienceGender: z.enum(["", "male", "female", "other"]).default(""),
  contentNotifications: z.boolean().default(true),
  calendarNotifications: z.boolean().default(true),
  jamaatNotifications: z.boolean().default(false),
  jamaatLeadMinutes: z.number().int().min(5).max(60).default(20),
  jamaatPrayers: z
    .array(z.enum(["fajr", "dhuhr", "asr", "maghrib", "isha"]))
    .max(5)
    .default(["fajr", "dhuhr", "asr", "maghrib", "isha"]),
  mosqueDua: z.boolean().default(true),
  mosqueExitReminder: z.boolean().default(false),
  calendarLeadDays: z.number().int().min(1).max(30).default(1),
  fullScreenNewSunnah: z.boolean().default(true),
});
export type UserPreferences = z.infer<typeof UserPreferences>;
export const defaultPreferences = UserPreferences.parse({});
const SafeLink = z
  .string()
  .max(1500)
  .refine(
    (v) =>
      !v ||
      (() => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      })(),
    "HTTPS URL required",
  );
export const Translation = z.object({
  title: z.string().max(200).default(""),
  body: z.string().max(30000).default(""),
  transliteration: z.string().max(10000).default(""),
  videoUrl: SafeLink.default(""),
  sourceText: z.string().max(1000).optional(),
});
export type Translation = z.infer<typeof Translation>;
export const translationsSchema = z.object({
  "uz-Latn": Translation,
  "uz-Cyrl": Translation,
  ru: Translation,
  en: Translation,
});
export const emptyTranslations = () =>
  Object.fromEntries(
    locales.map((l) => [
      l,
      {
        title: "",
        body: "",
        transliteration: "",
        videoUrl: "",
        sourceText: "",
      },
    ]),
  ) as z.infer<typeof translationsSchema>;
export const Category = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  titles: z.object({
    "uz-Latn": z.string().min(1),
    "uz-Cyrl": z.string().min(1),
    ru: z.string().min(1),
    en: z.string().min(1),
  }),
  window: z.enum(["morning", "evening", "always"]),
  order: z.number().int().min(0).max(999),
  enabled: z.boolean(),
});
export type Category = z.infer<typeof Category>;
export const Content = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  kind: z.enum(["sunnah", "dhikr", "dua", "event", "jamaat"]),
  // Explicit editorial assignment, never inferred from a translated title/body.
  prayerScope: z.array(z.enum(jamaatPrayerNames)).min(1).max(5)
    .refine((v) => new Set(v).size === v.length, "Duplicate prayer").optional(),
  categoryId: z.string().max(64).default(""),
  translations: translationsSchema,
  arabic: z.string().max(30000).default(""),
  transmitter: z.string().max(300).default(""),
  collection: z.string().max(300).default(""),
  hadithNumber: z.string().max(100).default(""),
  grade: z.enum(["sahih", "quran", "unverified"]).default("unverified"),
  grader: z.string().max(300).default(""),
  repetitions: z.number().int().min(1).max(1000).nullable().default(null),
  order: z.number().int().min(0).max(99999).default(0),
  status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
  verified: z.boolean().default(false),
  internalSourceUrl: SafeLink.default(""),
  imageUrl: z
    .string()
    .max(1500)
    .refine(
      (v) => !v || v.startsWith("/media/") || SafeLink.safeParse(v).success,
    )
    .default(""),
  event: z
    .object({
      hijriMonth: z.number().int().min(1).max(12),
      hijriDay: z.number().int().min(1).max(30),
      repeatMonthly: z.boolean().default(false),
      weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
      fasting: z.enum(["none", "recommended", "obligatory"]).default("none"),
      leadDays: z.number().int().min(1).max(30).default(1),
    })
    .nullable()
    .default(null),
  updatedAt: z.string().default(""),
  revision: z.number().int().nonnegative().default(0),
});
export type Content = z.infer<typeof Content>;
const reviewedLegacyPrayerScopes: Readonly<Record<string, readonly JamaatPrayer[]>> = {
  "jamaat-bukhari-645": jamaatPrayerNames,
  "jamaat-bukhari-662": jamaatPrayerNames,
  "jamaat-muslim-656a": ["fajr", "isha"],
};
export function effectiveJamaatPrayers(c: Pick<Content, "id" | "kind" | "prayerScope">): readonly JamaatPrayer[] {
  if (c.kind !== "jamaat") return [];
  // Known reviewed publications predate this field. Unclassified new/unknown
  // legacy material is excluded until its prayer assignment is reviewed.
  return c.prayerScope ?? reviewedLegacyPrayerScopes[c.id] ?? [];
}
export function publicationErrors(c: Content): string[] {
  const e: string[] = [];
  if (!c.verified) e.push("Religious/editorial review is required");
  for (const l of locales) {
    if (!c.translations[l].title.trim() || !c.translations[l].body.trim())
      e.push(`${l}: title and body are required`);
    if (
      ["dhikr", "dua"].includes(c.kind) &&
      !c.translations[l].transliteration.trim()
    )
      e.push(`${l}: transliteration is required`);
    const v = c.translations[l].videoUrl;
    if (v) {
      try {
        if (
          ![
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtu.be",
          ].includes(new URL(v).hostname)
        )
          e.push(`${l}: YouTube link required`);
      } catch {
        e.push(`${l}: invalid video URL`);
      }
    }
  }
  if (c.kind === "jamaat") {
    if (!effectiveJamaatPrayers(c).length)
      e.push("Select the prayers to which this jamaat hadith applies");
    for (const l of locales)
      if (!c.translations[l].sourceText?.trim())
        e.push(`${l}: translated hadith source is required`);
  }
  if (c.grade === "unverified") e.push("A verified source is required");
  if (["sunnah", "jamaat"].includes(c.kind) && c.grade !== "sahih")
    e.push("A sunnah material requires a sahih hadith basis");
  if (c.grade === "quran" && (!c.collection.trim() || !c.hadithNumber.trim()))
    e.push("Quran surah and ayah reference required");
  if (
    c.grade === "sahih" &&
    (!c.transmitter.trim() || !c.collection.trim() || !c.hadithNumber.trim())
  )
    e.push("Transmitter, collection and hadith number are required");
  if (["dhikr", "dua"].includes(c.kind) && !c.arabic.trim())
    e.push("Arabic text is required");
  if (c.kind === "event" && !c.event) e.push("Hijri date is required");
  return e;
}
export const Appearance = z.object({
  notificationRetentionDays: z.number().int().min(1).max(90).default(30),
  prayerNotificationIntro: z.object({
    "uz-Latn": z.string().max(300).default(""), "uz-Cyrl": z.string().max(300).default(""),
    ru: z.string().max(300).default(""), en: z.string().max(300).default(""),
  }).default({"uz-Latn":"", "uz-Cyrl":"", ru:"", en:""}),
  brandName: z.string().min(1).max(50).default("Namoz"),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#123e35"),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#dfba73"),
  logoUrl: z
    .string()
    .max(1500)
    .refine((v) => !v || v.startsWith("/media/"))
    .default(""),
  sectionOrder: z
    .array(
      z.enum([
        "prayer",
        "calendar",
        "events",
        "sunnah",
        "qibla",
        "adhkar",
        "mosques",
      ]),
    )
    .min(6)
    .max(7)
    .refine(
      (a) =>
        new Set(a).size === a.length &&
        ["prayer", "calendar", "sunnah", "qibla", "adhkar", "mosques"].every(
          (id) => a.includes(id as any),
        ),
    )
    .default([
      "prayer",
      "calendar",
      "events",
      "sunnah",
      "qibla",
      "adhkar",
      "mosques",
    ])
    .transform((a) =>
      a.includes("events")
        ? a
        : a.flatMap((id) =>
            id === "calendar" ? [id, "events" as const] : [id],
          ),
    ),
  hiddenSections: z
    .array(
      z.enum(["calendar", "events", "sunnah", "qibla", "adhkar", "mosques"]),
    )
    .default([]),
});
export type Appearance = z.infer<typeof Appearance>;
export const defaultAppearance = Appearance.parse({});
export const Mosque = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(120),
  country: z.string().max(80),
  address: z.string().max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  verified: z.boolean().default(false),
  source: z.string().max(500).default(""),
  updatedAt: z.string().default(""),
});
export type Mosque = z.infer<typeof Mosque>;
export const Recommendation = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  country: z.string().min(1).max(80),
  city: z.string().max(120).default(""),
  method: z.enum(methods),
  madhab: z.enum(["hanafi", "shafi"]),
  source: z.string().min(3).max(1000),
  verified: z.boolean().default(false),
});
export type Recommendation = z.infer<typeof Recommendation>;

export function hasTranslation(c: Content, locale: Locale) {
  return !!(
    c.translations[locale]?.title.trim() && c.translations[locale]?.body.trim()
  );
}
export function localizedSource(c: Content, locale: Locale) {
  return (
    c.translations[locale]?.sourceText?.trim() ||
    [c.transmitter, c.collection, c.hadithNumber && `№ ${c.hadithNumber}`]
      .filter(Boolean)
      .join(" · ")
  );
}
