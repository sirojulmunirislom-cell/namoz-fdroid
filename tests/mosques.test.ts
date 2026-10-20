import { it, expect } from "vitest";
import { parseMosques } from "../src/mosques";
const location = { name: "Kayseri", country: "Türkiye", latitude: 38.72, longitude: 35.49, timezone: "Europe/Istanbul" };
it("accepts OSM nodes and building centres, rejects invalid positions", () => {
 const result = parseMosques({ elements: [
  { type: "node", id: 1, lat: 38.72, lon: 35.49, tags: { name: "Test mosque" } },
  { type: "way", id: 2, center: { lat: 38.73, lon: 35.5 } },
  { type: "node", id: 3, lat: 400, lon: 0 }
 ] }, location);
 expect(result).toHaveLength(2);
 expect(result[0]).toMatchObject({ city: "Kayseri", verified: false, name: "Test mosque" });
});
it("does not display partial server responses as a complete search", () => {
 expect(() => parseMosques({ elements: [], remark: "Runtime timeout" }, location)).toThrow();
});
