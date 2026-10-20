import { DateTime } from "luxon";
import { hijriParts, voluntaryFastAllowed } from "./prayer";
import type { Content } from "./schema";
export type MonthConfirmation = {
  region: string;
  year: number;
  month: number;
  start_date: string;
  source: string;
};
export function hijriDate(
  date: Date,
  zone: string,
  region: string,
  months: MonthConfirmation[],
) {
  const day = DateTime.fromJSDate(date).setZone(zone).startOf("day");
  for (const m of months.filter((m) => m.region === region)) {
    const start = DateTime.fromISO(m.start_date, { zone }).startOf("day");
    const diff = Math.round(day.diff(start, "days").days);
    const next = months.find(
      (n) =>
        n.region === region &&
        ((m.month === 12 && n.year === m.year + 1 && n.month === 1) ||
          (n.year === m.year && n.month === m.month + 1)),
    );
    const length = next
      ? Math.round(
          DateTime.fromISO(next.start_date, { zone }).diff(start, "days").days,
        )
      : 29;
    if (diff >= 0 && diff < Math.min(30, length))
      return { day: diff + 1, month: m.month, year: m.year, confirmed: true };
  }
  // Anchor adjacent expected days to a known regional month start. Otherwise a
  // later sighting can leave a second, tabular "day 1" immediately before it.
  const nearby = months
    .filter((m) => m.region === region)
    .map((m) => ({
      m,
      start: DateTime.fromISO(m.start_date, { zone }).startOf("day"),
    }))
    .filter((a) => Math.abs(day.diff(a.start, "days").days) <= 35)
    .sort(
      (a, b) =>
        Math.abs(day.diff(a.start, "days").days) -
        Math.abs(day.diff(b.start, "days").days),
    );
  for (const { m, start } of nearby) {
    for (let shift = -4; shift <= 4; shift++) {
      const nominal = start.plus({ days: shift });
      const h = hijriParts(nominal.toJSDate(), zone);
      if (h.year === m.year && h.month === m.month && h.day === 1)
        return {
          ...hijriParts(day.plus({ days: shift }).toJSDate(), zone),
          confirmed: false,
        };
    }
  }
  return { ...hijriParts(date, zone), confirmed: false };
}
export function eventsOnDate(
  date: Date,
  zone: string,
  region: string,
  months: MonthConfirmation[],
  events: Content[],
) {
  const h = hijriDate(date, zone, region, months);
  return {
    h,
    events: events.filter(
      (c) =>
        c.kind === "event" &&
        c.event &&
        (c.event.weekdays?.length
          ? c.event.weekdays.includes(DateTime.fromJSDate(date).setZone(zone).weekday)
          : (c.event.repeatMonthly || c.event.hijriMonth === h.month) && c.event.hijriDay === h.day) &&
        (c.event.fasting !== "recommended" ||
          voluntaryFastAllowed(h.month, h.day)),
    ),
  };
}
export function calendarReminders(
  events: Content[],
  months: MonthConfirmation[],
  zone: string,
  region: string,
  leadDays: number,
  now = new Date(),
) {
  const start = DateTime.fromJSDate(now).setZone(zone).startOf("day");
  const out: {
    content: Content;
    eventDate: string;
    remindAt: Date;
    confirmed: boolean;
  }[] = [];
  for (let i = 1; i <= 60; i++) {
    const date = start.plus({ days: i });
    const matches = eventsOnDate(date.toJSDate(), zone, region, months, events);
    for (const c of matches.events) {
      const lead = Math.max(1, leadDays, c.event!.leadDays);
      const at = date.minus({ days: lead }).set({ hour: 9 });
      if (at.toMillis() > now.getTime())
        out.push({
          content: c,
          eventDate: date.toISODate()!,
          remindAt: at.toJSDate(),
          confirmed: matches.h.confirmed,
        });
    }
  }
  return out
    .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime())
    .slice(0, 50);
}

// Recurring weekly and white-day fasts are notification rules, not calendar/editor cards.
export function isNotificationOnlyEvent(content: Content) {
  return content.kind === "event" && (!!content.event?.weekdays?.length || isWhiteDaysEvent(content));
}

export function isWhiteDaysEvent(content: Content) {
  return content.kind === "event" && content.event?.repeatMonthly === true &&
    content.event.fasting === "recommended" &&
    [13, 14, 15].includes(content.event.hijriDay);
}

// One occurrence per configured Hijri day. Dates stay estimates until regionally confirmed.
export function eventTimeline(
  events: Content[],
  months: MonthConfirmation[],
  zone: string,
  region: string,
  today: string,
) {
  const start = DateTime.fromISO(today, { zone }).startOf("day");
  const published = events.filter(
    (c) => c.kind === "event" && c.status === "published" && c.verified && !isNotificationOnlyEvent(c),
  );
  const upcoming: { content: Content; date: string; confirmed: boolean }[] = [];
  const past: typeof upcoming = [];
  if (!published.length) return { upcoming, past, highlightedDate: "" };
  for (let offset = -355; offset <= 370; offset++) {
    const date = start.plus({ days: offset });
    const matches = eventsOnDate(
      date.toJSDate(),
      zone,
      region,
      months,
      published,
    );
    for (const content of matches.events) {
      (offset < 0 ? past : upcoming).push({
        content,
        date: date.toISODate()!,
        confirmed: matches.h.confirmed,
      });
    }
  }
  past.reverse();
  return { upcoming, past, highlightedDate: upcoming[0]?.date || "" };
}
