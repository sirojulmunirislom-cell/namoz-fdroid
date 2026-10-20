import { z } from "zod";
import { Mosque } from "./schema";
// OSM features often omit addr:city. The client fills it from the chosen city.
export const SearchedMosque = Mosque.extend({ city: z.string().max(120) });

const responseSchema = z.object({
  elements: z.array(
    z.object({
      type: z.enum(["node", "way", "relation"]),
      id: z.number().int().positive(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      center: z.object({ lat: z.number(), lon: z.number() }).optional(),
      tags: z.record(z.string(), z.string()).optional(),
    }),
  ),
  remark: z.string().optional(),
});

export function parseMosques(
  raw: unknown,
  location: { name: string; country: string } = { name: "", country: "" },
): Mosque[] {
  const response = responseSchema.parse(raw);
  // Overpass can return HTTP 200 with incomplete data after a query timeout.
  if (response.remark) throw Error("Incomplete map response");
  return response.elements.flatMap((element) => {
    const tags = element.tags || {};
    const parsed = SearchedMosque.safeParse({
      id: `osm-${element.type}-${element.id}`,
      name: tags.name || tags["name:en"] || "Masjid",
      latitude: element.lat ?? element.center?.lat,
      longitude: element.lon ?? element.center?.lon,
      city: tags["addr:city"] || location.name,
      country: location.country,
      address: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
      verified: false,
      source: "© OpenStreetMap contributors · ODbL",
      updatedAt: new Date().toISOString(),
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export class MosqueRateLimitError extends Error {
  constructor() {
    super("Please wait before searching again");
  }
}

export async function fetchNearbyMosques(lat: number, lon: number, contact: string) {
  z.number().finite().min(-90).max(90).parse(lat);
  z.number().finite().min(-180).max(180).parse(lon);
  const query = `[out:json][timeout:20];nwr["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat.toFixed(3)},${lon.toFixed(3)});out center tags 150;`;
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": `Namoz (+${contact})`, Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }),
      // Allow the provider's queue (up to 15s) plus query execution time.
      signal: AbortSignal.timeout(40_000),
    });
    if (response.status === 429 || response.status === 406) throw new MosqueRateLimitError();
    if (!response.ok) throw Error("Mosque provider unavailable");
    return parseMosques(await response.json());
  } catch (error) {
    if (error instanceof MosqueRateLimitError) throw error;
    // The independent fallback is openly labelled and has less coverage.
    // No coordinates, query, response body or user information in logs.
    console.warn("OSM mosque search unavailable; trying Wikidata");
    return fetchWikidataMosques(lat, lon, contact);
  }
}

const bindingValue = z.object({ value: z.string() });
const wikidataResponse = z.object({ results: z.object({ bindings: z.array(z.object({
  item: bindingValue, itemLabel: bindingValue, location: bindingValue, distance: bindingValue,
})) }) });
export function parseWikidataMosques(raw: unknown): Mosque[] {
  return wikidataResponse.parse(raw).results.bindings.flatMap(row => {
    const id = row.item.value.match(/^https?:\/\/www\.wikidata\.org\/entity\/(Q\d+)$/)?.[1];
    const point = row.location.value.match(/^Point\(([-\d.e+]+) ([-\d.e+]+)\)$/i);
    const distance = Number(row.distance.value);
    if (!id || !point || !Number.isFinite(distance) || distance < 0 || distance > 5 || row.itemLabel.value === id) return [];
    const parsed = SearchedMosque.safeParse({
      id: "wikidata-" + id, name: row.itemLabel.value,
      latitude: Number(point[2]), longitude: Number(point[1]),
      city: "", country: "", address: "", verified: false,
      source: "Wikidata · CC0", updatedAt: new Date().toISOString(),
    });
    return parsed.success ? [parsed.data] : [];
  }).filter((item, i, items) => items.findIndex(other => other.id === item.id) === i);
}
async function fetchWikidataMosques(lat: number, lon: number, contact: string) {
  const query = `SELECT DISTINCT ?item ?itemLabel ?location ?distance WHERE {
    SERVICE wikibase:around { ?item wdt:P625 ?location .
      bd:serviceParam wikibase:center "Point(${lon.toFixed(3)} ${lat.toFixed(3)})"^^geo:wktLiteral;
        wikibase:radius "5"; wikibase:distance ?distance. }
    ?item wdt:P31/wdt:P279* wd:Q32815 .
    FILTER NOT EXISTS { ?item wdt:P576 ?closed }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ru,uz". }
  } ORDER BY ?distance LIMIT 50`;
  const response = await fetch("https://query.wikidata.org/sparql?" + new URLSearchParams({ query, format: "json" }), {
    headers: { "User-Agent": `Namoz (+${contact})`, Accept: "application/sparql-results+json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw Error("Mosque providers unavailable");
  const items = parseWikidataMosques(await response.json());
  // Absence in this smaller dataset is not evidence that no mosques exist.
  if (!items.length) throw Error("Mosque providers unavailable");
  return items;
}
