import { DateTime } from "luxon";
import { z } from "zod";
import { Location, PrayerSettings } from "./schema";
import { getPrayerDay, prayerKeys, qiblaDirection } from "./prayer";
import { detectedTimezone } from "./setup-defaults";
export const Journey = z.object({
  transport: z.enum(["plane", "train", "ship"]),
  from: Location,
  to: Location,
  departure: z.string(),
  arrival: z.string(),
  checked: z.literal(true),
});
export type Journey = z.infer<typeof Journey>;
export function localInstant(text: string, zone: string) {
  const d = DateTime.fromISO(text, { zone });
  // Reject silent spring-forward normalization and ambiguous fall-back local times.
  if (
    !d.isValid ||
    d.toFormat("yyyy-MM-dd'T'HH:mm") !== text ||
    d.getPossibleOffsets().length !== 1
  )
    throw Error("travelDatesError");
  return d;
}
export function routePoint(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  f: number,
) {
  const rad = Math.PI / 180;
  const vec = (p: typeof a) => [
    Math.cos(p.latitude * rad) * Math.cos(p.longitude * rad),
    Math.cos(p.latitude * rad) * Math.sin(p.longitude * rad),
    Math.sin(p.latitude * rad),
  ];
  const x = vec(a),
    y = vec(b),
    angle = Math.acos(
      Math.max(
        -1,
        Math.min(
          1,
          x.reduce((s, v, i) => s + v * y[i], 0),
        ),
      ),
    );
  if (angle < 1e-7) return { ...a };
  if (Math.PI - angle < 1e-5) throw Error("travelRouteError");
  const v = x.map(
    (n, i) =>
      (Math.sin((1 - f) * angle) * n + Math.sin(f * angle) * y[i]) /
      Math.sin(angle),
  );
  return {
    latitude: Math.atan2(v[2], Math.hypot(v[0], v[1])) / rad,
    longitude: Math.atan2(v[1], v[0]) / rad,
  };
}
export function planJourney(raw: unknown, rawSettings: unknown) {
  const journey = Journey.parse(raw),
    settings = PrayerSettings.parse(rawSettings);
  const start = localInstant(journey.departure, journey.from.timezone),
    end = localInstant(journey.arrival, journey.to.timezone);
  const minutes = Math.round(end.diff(start, "minutes").minutes);
  if (minutes <= 0 || minutes > 72 * 60) throw Error("travelDatesError");
  // Hourly checkpoints, not moving-horizon prayer boundaries. No altitude model or route feed.
  const offsets = [
    ...Array.from({ length: Math.ceil(minutes / 60) }, (_, i) => i * 60),
    minutes,
  ];
  const points = offsets.map((elapsed) => {
    const coords = routePoint(journey.from, journey.to, elapsed / minutes);
    const zone = detectedTimezone(coords.latitude, coords.longitude);
    const at = start.plus({ minutes: elapsed }).setZone(zone);
    let next: { key: string; at: string } | null = null;
    for (let day = 0; day < 2 && !next; day++) {
      const times = getPrayerDay(
        {
          ...settings,
          location: { ...journey.from, ...coords, timezone: zone },
        },
        at.plus({ days: day }).toISODate()!,
      );
      if (times)
        for (const key of prayerKeys.filter((k) => k !== "sunrise")) {
          if (Date.parse(times.times[key]) >= at.toMillis()) {
            next = { key, at: times.times[key] };
            break;
          }
        }
    }
    return {
      elapsed,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: zone,
      at: at.toISO()!,
      bearing: qiblaDirection(coords),
      next,
    };
  });
  return {
    journey,
    minutes,
    points,
    departureDay: getPrayerDay(
      { ...settings, location: journey.from },
      start.toISODate()!,
    ),
    arrivalDay: getPrayerDay(
      { ...settings, location: journey.to },
      end.toISODate()!,
    ),
  };
}
