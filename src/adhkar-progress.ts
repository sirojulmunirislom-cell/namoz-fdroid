import { DateTime } from "luxon";
import type { Content } from "../shared/schema";

export function readingDay(now: Date, zone?: string) {
  return DateTime.fromJSDate(now, {zone: zone || DateTime.local().zoneName}).toISODate()!;
}
export function readingKey(content: Content, day: string, preview = false) {
  return `namoz.adhkar.${preview ? "preview" : "published"}.${content.categoryId}.${content.id}.${day}`;
}
export function readCount(content: Content, day: string, preview = false) {
  try {
    const value = Number(localStorage.getItem(readingKey(content, day, preview)) || 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(content.repetitions ?? 1, Math.floor(value))) : 0;
  } catch {return 0;}
}
export function saveCount(content: Content, day: string, value: number, preview = false) {
  try {localStorage.setItem(readingKey(content,day,preview),String(value));} catch { /* storage may be unavailable */ }
  window.dispatchEvent(new Event("namoz:reading-progress"));
}
export function nextUnread(contents: Content[], day: string, preview = false) {
  return contents.find(c => readCount(c,day,preview) < (c.repetitions ?? 1));
}
