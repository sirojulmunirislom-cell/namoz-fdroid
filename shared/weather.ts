import { z } from "zod";
const codes = new Set([
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
]);
const number = z.number().finite();
const code = number.int().refine((v) => codes.has(v));
const response = z.object({
  current: z.object({
    time: number,
    temperature_2m: number,
    weather_code: code,
  }),
  hourly: z
    .object({
      time: z.array(number).min(1),
      temperature_2m: z.array(number.nullable()),
      weather_code: z.array(code.nullable()),
      precipitation_probability: z.array(number.min(0).max(100).nullable()),
    })
    .refine(
      (h) =>
        [h.temperature_2m, h.weather_code, h.precipitation_probability].every(
          (a) => a.length === h.time.length,
        ),
      "Mismatched hourly forecast arrays",
    ),
});
export function openMeteoUrl(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    throw new Error("Invalid weather coordinates");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
    hourly: "temperature_2m,precipitation_probability,weather_code",
    current: "temperature_2m,weather_code",
    timezone: "UTC",
    timeformat: "unixtime",
    temperature_unit: "celsius",
    past_days: "1",
    forecast_days: "3",
  }).toString();
  return url.href;
}
export function normalizeOpenMeteo(raw: unknown, now = new Date()) {
  const parsed = response.parse(raw);
  const rows = parsed.hourly.time
    .map((time, i) => ({
      time,
      temperature: parsed.hourly.temperature_2m[i],
      code: parsed.hourly.weather_code[i],
      rain: parsed.hourly.precipitation_probability[i],
    }))
    .filter((r) => r.temperature !== null && r.code !== null)
    .sort((a, b) => a.time - b.time);
  if (!rows.length) throw new Error("Hourly forecast is unavailable");
  return {
    current: parsed.current,
    hourly: {
      time: rows.map((r) => r.time),
      temperature_2m: rows.map((r) => r.temperature!),
      weather_code: rows.map((r) => r.code!),
      precipitation_probability: rows.map((r) => r.rain),
    },
    fetchedAt: now.toISOString(),
    provider: "Open-Meteo",
    providerUrl: "https://open-meteo.com/",
    license: "CC BY 4.0; non-commercial API use",
  };
}
export type WeatherSnapshot = ReturnType<typeof normalizeOpenMeteo>;
export function weatherAtTime(snapshot: WeatherSnapshot, iso: string) {
  const stamp = Date.parse(iso) / 1000;
  if (!Number.isFinite(stamp)) return null;
  let index = -1,
    distance = Infinity;
  snapshot.hourly.time.forEach((time, i) => {
    const d = Math.abs(time - stamp);
    if (d < distance) {
      index = i;
      distance = d;
    }
  });
  if (index < 0 || distance > 3600) return null;
  const temperature = snapshot.hourly.temperature_2m[index],
    weatherCode = snapshot.hourly.weather_code[index],
    rain = snapshot.hourly.precipitation_probability[index];
  if (
    typeof temperature !== "number" ||
    !Number.isFinite(temperature) ||
    !codes.has(weatherCode)
  )
    return null;
  return {
    temperature,
    code: weatherCode,
    rain: typeof rain === "number" ? rain : null,
  };
}
