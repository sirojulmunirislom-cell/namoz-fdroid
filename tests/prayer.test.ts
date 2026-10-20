import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  cities,
  getPrayerDay,
  nextPrayer,
  activeDhikrWindow,
  qiblaDirection,
  angularDistance,
  voluntaryFastAllowed,
} from "../shared/prayer";
import { PrayerSettings } from "../shared/schema";
const s = PrayerSettings.parse({
  location: cities[0],
  method: "Karachi",
  madhab: "hanafi",
  highLatitudeRule: "middle",
  confirmed: true,
  version: 1,
});
describe("prayer safety and astronomical functions", () => {
  it("never returns prayer times for missing or unconfirmed settings", () => {
    for (const input of [
      null,
      {},
      { ...s, confirmed: false },
      { ...s, method: "" },
      { ...s, madhab: "" },
      { ...s, location: { ...s.location, timezone: "Invalid/Zone" } },
    ])
      expect(getPrayerDay(input)).toBeNull();
  });
  it("calculates a chronological Tashkent day in the selected zone", () => {
    const d = getPrayerDay(s, "2026-10-04")!;
    const times = Object.values(d.times).map((t) => new Date(t).getTime());
    expect(times.every(Number.isFinite)).toBe(true);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(
      DateTime.fromISO(d.times.fajr).setZone(s.location.timezone).hour,
    ).toBeGreaterThanOrEqual(4);
    expect(
      DateTime.fromISO(d.times.fajr).setZone(s.location.timezone).hour,
    ).toBeLessThanOrEqual(6);
  });
  it("Hanafi asr is later while other prayers remain unchanged", () => {
    const a = getPrayerDay(s, "2026-10-04")!,
      b = getPrayerDay({ ...s, madhab: "shafi" }, "2026-10-04")!;
    expect(a.times.fajr).toBe(b.times.fajr);
    expect(new Date(a.times.asr).getTime()).toBeGreaterThan(
      new Date(b.times.asr).getTime(),
    );
  });
  it("selects next-day fajr after isha, not sunrise or a past prayer", () => {
    const d = getPrayerDay(s, "2026-10-04")!;
    const now = new Date(new Date(d.times.isha).getTime() + 60000);
    const n = nextPrayer(s, now)!;
    expect(n.key).toBe("fajr");
    expect(n.time).toBe(getPrayerDay(s, "2026-10-05")!.times.fajr);
  });
  it("uses the configured location date when the UTC date differs", () => {
    const now = new Date("2026-10-04T23:00:00Z");
    const n = nextPrayer(s, now)!;
    expect(n.time).toBe(getPrayerDay(s, "2026-10-05")!.times.fajr);
  });
  it("turns adhkar lights on and off at exact boundaries", () => {
    const p = getPrayerDay(s, "2026-10-04")!;
    expect(activeDhikrWindow(s, new Date(p.times.fajr))).toBe("morning");
    expect(activeDhikrWindow(s, new Date(p.times.sunrise))).toBeNull();
    expect(activeDhikrWindow(s, new Date(p.times.asr))).toBe("evening");
    expect(activeDhikrWindow(s, new Date(p.times.maghrib))).toBeNull();
    expect(activeDhikrWindow(null)).toBeNull();
  });
  it("computes true-north qibla bearing and handles compass wraparound", () => {
    expect(qiblaDirection(cities[0])).toBeGreaterThan(230);
    expect(qiblaDirection(cities[0])).toBeLessThan(245);
    expect(angularDistance(359, 1)).toBe(2);
  });
  it("excludes Ramadan, Eid and tashriq from voluntary fasting prompts", () => {
    expect(voluntaryFastAllowed(9, 13)).toBe(false);
    expect(voluntaryFastAllowed(10, 1)).toBe(false);
    expect(voluntaryFastAllowed(12, 13)).toBe(false);
    expect(voluntaryFastAllowed(12, 14)).toBe(true);
  });
});
