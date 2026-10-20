import type { Location } from "./schema";
const rows: [string, string, number, number, string, string][] = [
  ["ASR", "Kayseri ASR", 38.7704, 35.4954, "Europe/Istanbul", "Türkiye"],
  ["IST", "Istanbul IST", 41.2753, 28.7519, "Europe/Istanbul", "Türkiye"],
  ["SAW", "Istanbul SAW", 40.8986, 29.3092, "Europe/Istanbul", "Türkiye"],
  ["TAS", "Toshkent TAS", 41.2579, 69.2812, "Asia/Tashkent", "O‘zbekiston"],
  ["DXB", "Dubai DXB", 25.2532, 55.3657, "Asia/Dubai", "UAE"],
  ["JED", "Jeddah JED", 21.6796, 39.1565, "Asia/Riyadh", "Saudi Arabia"],
  ["MED", "Madinah MED", 24.5534, 39.7051, "Asia/Riyadh", "Saudi Arabia"],
  ["LHR", "London LHR", 51.47, -0.4543, "Europe/London", "United Kingdom"],
  ["FRA", "Frankfurt FRA", 50.0379, 8.5622, "Europe/Berlin", "Germany"],
  ["CDG", "Paris CDG", 49.0097, 2.5479, "Europe/Paris", "France"],
  [
    "JFK",
    "New York JFK",
    40.6413,
    -73.7781,
    "America/New_York",
    "United States",
  ],
  ["NRT", "Tokyo NRT", 35.772, 140.3929, "Asia/Tokyo", "Japan"],
];
export const airports = rows.map(
  ([code, name, latitude, longitude, timezone, country]) => ({
    code,
    name,
    latitude,
    longitude,
    timezone,
    country,
  }),
);
export function ticketHints(text: string): {
  from?: Location;
  to?: Location;
  departure?: string;
  arrival?: string;
} {
  const codes = [...text.toUpperCase().matchAll(/\b[A-Z]{3}\b/g)]
    .map((m) => airports.find((a) => a.code === m[0]))
    .filter((x): x is (typeof airports)[number] => !!x);
  const distinct = codes.filter(
    (c, i) => codes.findIndex((x) => x.code === c.code) === i,
  );
  const dates = [
    ...text.matchAll(/\b(20\d{2}-\d{2}-\d{2})[ T]+(\d{2}:\d{2})\b/g),
  ].map((m) => m[1] + "T" + m[2]);
  return {
    from: distinct[0],
    to: distinct[1],
    departure: dates[0],
    arrival: dates[1],
  };
}
