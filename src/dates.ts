import { DateTime } from "luxon";
import type { Locale } from "../shared/schema";
const monthNames: Record<Locale, string[]> = {
  "uz-Latn": [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ],
  "uz-Cyrl": [
    "Январ",
    "Феврал",
    "Март",
    "Апрел",
    "Май",
    "Июн",
    "Июл",
    "Август",
    "Сентябр",
    "Октябр",
    "Ноябр",
    "Декабр",
  ],
  ru: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};
const weekdayNames: Record<Locale, string[]> = {
  "uz-Latn": ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
  "uz-Cyrl": ["Ду", "Се", "Чо", "Па", "Жу", "Ша", "Як"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
export const monthLabel = (month: number, year: number, locale: Locale) =>
  `${monthNames[locale][month - 1]} ${year}`;
export const weekdayLabel = (index: number, locale: Locale) =>
  weekdayNames[locale][index];
export function dateLabel(date: Date, locale: Locale, zone?: string) {
  const d = DateTime.fromJSDate(date, { zone });
  return `${weekdayNames[locale][d.weekday - 1]}, ${d.day} ${monthNames[locale][d.month - 1]}`;
}
