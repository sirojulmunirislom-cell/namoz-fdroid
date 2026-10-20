import { z } from "zod";
import { Locale, Location } from "./schema";
// Only the chosen region/time zone is needed: never send prayer coordinates here.
export const CalendarPushPreferences = z
  .object({
    timezone: Location.shape.timezone,
    region: z.string().max(80),
    leadDays: z.number().int().min(1).max(30),
  })
  .strict();
export const WebPushPreferences = z
  .object({
    endpoint: z.string().url().max(2000),
    locale: Locale,
    topics: z.array(z.enum(["content", "calendar", "jamaat"])).max(3),
    calendar: CalendarPushPreferences.nullable(),
  })
  .strict()
  .refine(
    (v) => !v.topics.includes("calendar") || v.calendar !== null,
    "Calendar settings are required",
  );
export type CalendarPushPreferences = z.infer<typeof CalendarPushPreferences>;
