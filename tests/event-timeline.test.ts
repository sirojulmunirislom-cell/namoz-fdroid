import { it, expect } from "vitest";
import { Content, emptyTranslations, Appearance } from "../shared/schema";
import { eventTimeline } from "../shared/calendar";
const months = [{ region: "Test", year: 1448, month: 9, start_date: "2027-02-08", source: "Test fixture" }];
const event = (id: string, day: number) => Content.parse({ id, kind: "event", translations: emptyTranslations(), status: "published", verified: true, event: { hijriMonth: 9, hijriDay: day } });
it("moves highlight to next occurrence after local day ends, keeps past neutral", () => {
 const events = [event("one", 1), event("two", 3)];
 const first = eventTimeline(events, months, "Europe/Istanbul", "Test", "2027-02-08");
 expect(first.highlightedDate).toBe("2027-02-08");
 const next = eventTimeline(events, months, "Europe/Istanbul", "Test", "2027-02-09");
 expect(next.highlightedDate).toBe("2027-02-10");
 expect(next.upcoming[0].content.id).toBe("two");
 expect(next.past[0]).toMatchObject({ date: "2027-02-08", confirmed: true });
 expect(eventTimeline(events, months, "Europe/Istanbul", "Other", "2027-02-09").upcoming[0].confirmed).toBe(false);
});
it("excludes drafts and highlights all events on the nearest shared date", () => {
 const events = [event("one", 3), event("two", 3), { ...event("draft", 2), status: "draft" as const }];
 const result = eventTimeline(events, months, "Europe/Istanbul", "Test", "2027-02-09");
 expect(result.upcoming.filter(e => e.date === result.highlightedDate)).toHaveLength(2);
 expect(result.upcoming.some(e => e.content.id === "draft")).toBe(false);
});
it("migrates existing menu order and preserves hidden sections", () => {
 const result = Appearance.parse({ sectionOrder: ["prayer", "mosques", "calendar", "sunnah", "adhkar", "qibla"], hiddenSections: ["calendar"] });
 expect(result.sectionOrder.slice(2,4)).toEqual(["calendar", "events"]);
 expect(result.hiddenSections).toEqual(["calendar"]);
});
