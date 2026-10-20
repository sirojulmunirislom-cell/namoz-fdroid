import { z } from "zod";
import { Locale } from "./schema";

export const ageGroups = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;
export const genders = ["male", "female", "other"] as const;
export const AgeGroup = z.enum(ageGroups);
export type AgeGroup = z.infer<typeof AgeGroup>;
export const Gender = z.enum(genders);
export type Gender = z.infer<typeof Gender>;

// Demographics are explicitly supplied by consenting adults, never inferred
// from a name, device, location or account. Omitting them remains valid.
export const AnalyticsSample = z
  .object({
    consent: z.literal(true),
    section: z.enum([
      "prayer",
      "calendar",
      "events",
      "sunnah",
      "qibla",
      "adhkar",
      "mosques",
      "settings",
    ]),
    platform: z.enum(["android", "ios", "web"]),
    duration: z.number().int().min(1).max(300),
    dayId: z.string().regex(/^[a-f0-9]{64}$/),
    hour: z.number().int().min(0).max(23),
    locale: Locale.optional(),
    demographics: z
      .object({
        consent: z.literal(true),
        ageGroup: AgeGroup,
        gender: Gender.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type AnalyticsSample = z.infer<typeof AnalyticsSample>;

export const analyticsAudienceDays = 30;

// A rotating anonymous ID identifies a browser/device for one UTC day only.
// Count its last sample once, so heartbeats and section changes do not inflate
// the audience or assign one day's session to several language/age categories.
// These are daily anonymous sessions, not unique people across the period.
export const analyticsAudienceQueries = ["locale", "age_group", "gender"].map(
  (column) => `SELECT ${column} AS value,COUNT(*) AS sessions FROM analytics
    WHERE id IN (
      SELECT MAX(id) FROM analytics
      WHERE day>=date('now','-29 days') AND day<=date('now')
      GROUP BY day,anonymous_day_id
    ) GROUP BY ${column} ORDER BY sessions DESC,value`,
);
