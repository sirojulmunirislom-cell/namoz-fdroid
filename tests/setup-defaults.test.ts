import { describe, it, expect } from "vitest";
import {
  setupDefaults,
  detectedTimezone,
  locationFromCoordinates,
} from "../shared/setup-defaults";
import { cities } from "../shared/prayer";
import { UserPreferences } from "../shared/schema";
const tashkent = cities[0];
describe("location-based first-run defaults", () => {
  it("fills every setting for Tashkent and detects its time zone offline", () => {
    expect(detectedTimezone(tashkent.latitude, tashkent.longitude)).toBe(
      "Asia/Tashkent",
    );
    expect(setupDefaults(tashkent)).toMatchObject({
      method: "Karachi",
      madhab: "hanafi",
      highLatitudeRule: "middle",
      source: "regional",
    });
    expect(
      locationFromCoordinates(
        tashkent.latitude,
        tashkent.longitude,
        "Location",
      ),
    ).toMatchObject({
      name: tashkent.name,
      country: tashkent.country,
      timezone: tashkent.timezone,
    });
  });
  it("recognizes Kayseri GPS and selects Turkish initial settings", () => {
    const location = locationFromCoordinates(38.7225, 35.4875, "Location");
    expect(location).toMatchObject({
      name: "Kayseri",
      timezone: "Europe/Istanbul",
      country: "Türkiye",
    });
    expect(setupDefaults(location)).toMatchObject({
      method: "Turkey",
      madhab: "hanafi",
    });
  });
  it("uses a different starting profile for Makkah", () => {
    expect(
      setupDefaults(cities.find((c) => c.name === "Makkah")!),
    ).toMatchObject({
      method: "UmmAlQura",
      madhab: "shafi",
      highLatitudeRule: "middle",
    });
  });
  it("selects the high-latitude rule geographically in both hemispheres", () => {
    expect(
      setupDefaults({ ...tashkent, latitude: 55, timezone: "Europe/London" })
        .highLatitudeRule,
    ).toBe("seventh");
    expect(
      setupDefaults({
        ...tashkent,
        latitude: -55,
        timezone: "America/Punta_Arenas",
      }).highLatitudeRule,
    ).toBe("seventh");
  });
  it("prefers a verified city recommendation over a country preset and ignores unverified records", () => {
    const base = {
      id: "region",
      country: tashkent.country,
      city: "",
      method: "Egyptian",
      madhab: "shafi",
      source: "Fixture reference",
      verified: true,
    };
    expect(
      setupDefaults(tashkent, [
        base,
        {
          ...base,
          id: "city",
          city: tashkent.name,
          method: "MuslimWorldLeague",
        },
        {
          ...base,
          id: "unverified",
          city: tashkent.name,
          method: "Dubai",
          verified: false,
        },
      ]),
    ).toMatchObject({ method: "MuslimWorldLeague", source: "verified" });
  });
  it("never supplies a time zone for invalid coordinates and keeps unknown regions editable", () => {
    expect(detectedTimezone(NaN, 69)).toBe("");
    expect(detectedTimezone(120, 69)).toBe("");
    expect(
      setupDefaults({ ...tashkent, country: "", timezone: "Pacific/Auckland" })
        .source,
    ).toBe("standard");
  });
  it("defaults to both reminder types and one day, preserving explicit opt-outs", () => {
    expect(UserPreferences.parse({})).toMatchObject({
      contentNotifications: true,
      calendarNotifications: true,
      calendarLeadDays: 1,
    });
    expect(
      UserPreferences.parse({
        contentNotifications: false,
        calendarNotifications: false,
        calendarLeadDays: 7,
      }),
    ).toMatchObject({
      contentNotifications: false,
      calendarNotifications: false,
      calendarLeadDays: 7,
    });
  });
});
