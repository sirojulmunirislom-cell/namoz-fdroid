import { describe, it, expect } from "vitest";
import { Content, emptyTranslations } from "../shared/schema";
import { hijriDate, eventsOnDate, calendarReminders } from "../shared/calendar";
const months = [
  {
    region: "Test region",
    year: 1448,
    month: 9,
    start_date: "2027-02-08",
    source: "Test fixture, not production",
  },
];
describe("calendar date confidence and advance-only reminders", () => {
  it("confirms only the selected region and known month length", () => {
    expect(
      hijriDate(
        new Date("2027-02-08T07:00Z"),
        "Asia/Tashkent",
        "Test region",
        months,
      ),
    ).toEqual({ day: 1, month: 9, year: 1448, confirmed: true });
    expect(
      hijriDate(
        new Date("2027-02-08T07:00Z"),
        "Asia/Tashkent",
        "Another region",
        months,
      ).confirmed,
    ).toBe(false);
    expect(
      hijriDate(
        new Date("2027-03-09T07:00Z"),
        "Asia/Tashkent",
        "Test region",
        months,
      ).confirmed,
    ).toBe(false);
  });
  it("suppresses recurring voluntary white-day prompts in Ramadan", () => {
    const c = Content.parse({
      id: "test-monthly",
      kind: "event",
      translations: emptyTranslations(),
      event: {
        hijriMonth: 1,
        hijriDay: 13,
        repeatMonthly: true,
        fasting: "recommended",
        leadDays: 1,
      },
    });
    expect(
      eventsOnDate(
        new Date("2027-02-20T07:00Z"),
        "Asia/Tashkent",
        "Test region",
        months,
        [c],
      ).events,
    ).toHaveLength(0);
  });
  it("schedules Ramadan in advance in the selected time zone", () => {
    const c = Content.parse({
      id: "test-ramadan",
      kind: "event",
      translations: emptyTranslations(),
      event: { hijriMonth: 9, hijriDay: 1, fasting: "obligatory", leadDays: 7 },
    });
    const r = calendarReminders(
      [c],
      months,
      "Asia/Tashkent",
      "Test region",
      1,
      new Date("2027-02-01T00:00:00Z"),
    );
    expect(r).toHaveLength(1);
    expect(r[0].remindAt.toISOString()).toBe("2027-02-01T04:00:00.000Z");
    expect(r[0].eventDate).toBe("2027-02-08");
    expect(r[0].confirmed).toBe(true);
  });
  it("does not send a late reminder on the event day", () => {
    const c = Content.parse({
      id: "test-ramadan",
      kind: "event",
      translations: emptyTranslations(),
      event: { hijriMonth: 9, hijriDay: 1, fasting: "obligatory", leadDays: 1 },
    });
    expect(
      calendarReminders(
        [c],
        months,
        "Asia/Tashkent",
        "Test region",
        1,
        new Date("2027-02-08T00:00:00Z"),
      ),
    ).toHaveLength(0);
  });
});
