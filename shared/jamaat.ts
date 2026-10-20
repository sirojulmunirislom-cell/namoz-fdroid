import { DateTime } from "luxon";
import { z } from "zod";
import { getPrayerDay } from "./prayer";
import {
  hasTranslation,
  localizedSource,
  effectiveJamaatPrayers,
  jamaatPrayerNames,
  type JamaatPrayer,
  type Content,
  type Locale,
  type PrayerSettings,
  type UserPreferences,
} from "./schema";
import { translate } from "../src/i18n";

export const jamaatPrayers = jamaatPrayerNames;
export { effectiveJamaatPrayers } from "./schema";
export const JamaatSlot = z.object({
  key: z.string().regex(/^\d{4}-\d{2}-\d{2}:(fajr|dhuhr|asr|maghrib|isha)$/),
  prayer: z.enum(jamaatPrayers),
  at: z.string().datetime(),
  prayerAt: z.string().datetime(),
  contentId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
});
export type JamaatSlot = z.infer<typeof JamaatSlot>;
export const JamaatState = z.object({
  used: z.array(z.string()).default([]),
  lastId: z.string().default(""),
  pending: z.array(JamaatSlot).default([]),
  // Prevent re-queuing the same prayer when its lead time changes after delivery.
  completed: z.array(z.string()).default([]),
});
export type JamaatState = z.infer<typeof JamaatState>;
export const emptyJamaatState = (): JamaatState => JamaatState.parse({});
export function jamaatPool(content: Content[], locale: Locale, prayer?: JamaatPrayer) {
  return content
    .filter(
      (c) =>
        c.kind === "jamaat" &&
        c.status === "published" &&
        c.verified &&
        c.grade === "sahih" &&
        (prayer ? effectiveJamaatPrayers(c).includes(prayer) : effectiveJamaatPrayers(c).length > 0) &&
        hasTranslation(c, locale) &&
        c.translations[locale].sourceText?.trim(),
    )
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
function take(pool: Content[], used: string[], lastId: string) {
  // Keep a global least-recently-used order while selecting only from this
  // prayer's pool. Resetting a whole cycle when a general hadith repeats would
  // starve prayer-specific material which was not eligible for that slot.
  const unseen = pool.filter((c) => !used.includes(c.id));
  const available = unseen.length ? unseen : [...pool].sort((a, b) => used.indexOf(a.id) - used.indexOf(b.id));
  const next = available.find((c) => c.id !== lastId) || available[0];
  return { id: next.id, used: [...used.filter((id) => id !== next.id), next.id] };
}
export function planJamaat(
  content: Content[],
  settings: PrayerSettings | null,
  prefs: UserPreferences,
  previous: JamaatState,
  now = new Date(),
) {
  const pool = jamaatPool(content, prefs.locale);
  const state: JamaatState = structuredClone(previous);
  state.used = [...new Set(state.used.filter((id) => pool.some((c) => c.id === id)).reverse())].reverse();
  // A scheduled occurrence advances the queue even if it was not opened.
  for (const slot of state.pending
    .filter((s) => Date.parse(s.at) <= +now)
    .sort((a, b) => a.at.localeCompare(b.at))) {
    if (state.completed.includes(slot.key)) continue;
    const c = pool.find((item) => item.id === slot.contentId);
    if (c && effectiveJamaatPrayers(c).includes(slot.prayer)) {
      state.used = [...state.used.filter((id) => id !== slot.contentId), slot.contentId];
      state.lastId = slot.contentId;
    }
    state.completed.push(slot.key);
  }
  state.completed = state.completed.slice(-100);
  state.pending = [];
  if (!settings || !prefs.jamaatNotifications || !pool.length) return state;
  let used = [...state.used],
    last = state.lastId;
  const day = DateTime.fromJSDate(now, {
    zone: settings.location.timezone,
  }).startOf("day");
  const slots: Omit<JamaatSlot, "contentId">[] = [];
  // At most 35 notifications: leaves room for other native reminders.
  for (let i = 0; i < 8; i++) {
    const date = day.plus({ days: i }).toISODate()!;
    const times = getPrayerDay(settings, date)?.times;
    if (!times) continue;
    for (const prayer of jamaatPrayers) {
      if (!prefs.jamaatPrayers.includes(prayer)) continue;
      const key = `${date}:${prayer}`,
        prayerAt = times[prayer];
      const at = new Date(
        Date.parse(prayerAt) - prefs.jamaatLeadMinutes * 60000,
      );
      if (
        +at <= +now ||
        +at > +now + 7 * 86400000 ||
        state.completed.includes(key)
      )
        continue;
      slots.push({ key, prayer, at: at.toISOString(), prayerAt });
    }
  }
  for (const slot of slots
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 35)) {
    const eligible = pool.filter((c) => effectiveJamaatPrayers(c).includes(slot.prayer));
    if (!eligible.length) continue;
    const next = take(eligible, used, last);
    state.pending.push({ ...slot, contentId: next.id });
    used = next.used;
    last = next.id;
  }
  return state;
}
export function jamaatMessage(slot: JamaatSlot, c: Content, locale: Locale, intro?: string) {
  return {
    title: `${translate(locale, slot.prayer)} · ${translate(locale, "jamaat")}`,
    // Describe the beginning of prayer time, never a mosque's iqamah time.
    body: `${(intro?.trim() || translate(locale, "jamaatStartsIn")).replace("{minutes}", String(Math.round((Date.parse(slot.prayerAt) - Date.parse(slot.at)) / 60000)))}\n${c.translations[locale].body}\n${localizedSource(c, locale)}`,
  };
}
