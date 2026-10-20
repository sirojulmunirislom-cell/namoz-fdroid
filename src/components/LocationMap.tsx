import { useEffect, useRef } from "react";
import type { Location, Mosque } from "../../shared/schema";
export function LocationMap({
  location,
  mosques = [],
  bearing,
}: {
  location: Location;
  mosques?: Mosque[];
  bearing?: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  const markerKey = JSON.stringify(mosques);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !element.current) return;
      map = L.map(element.current).setView(
        [location.latitude, location.longitude],
        bearing === undefined ? 12 : 13,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        // OSM requires a valid Referer. Override the site's private default
        // only for these tiles, sending the origin without location/query data.
        referrerPolicy: "strict-origin",
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.circleMarker([location.latitude, location.longitude], {
        radius: 7,
        color: "#123e35",
        fillOpacity: 1,
      }).addTo(map);
      for (const m of mosques) {
        const text = document.createElement("span");
        text.textContent = m.name;
        L.circleMarker([m.latitude, m.longitude], {
          radius: 7,
          color: "#a17d3b",
          fillColor: "#dfba73",
          fillOpacity: 1,
        })
          .bindTooltip(text)
          .addTo(map);
      }
      if (bearing === undefined && mosques.length) {
        const bounds = L.latLngBounds([
          [location.latitude, location.longitude],
          ...mosques.map((m): [number, number] => [m.latitude, m.longitude]),
        ]);
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
      }
      if (bearing !== undefined) {
        const rad = (n: number) => (n * Math.PI) / 180,
          deg = (n: number) => (n * 180) / Math.PI;
        const lat = rad(location.latitude),
          lon = rad(location.longitude),
          b = rad(bearing),
          d = 8 / 6371;
        const lat2 = Math.asin(
          Math.sin(lat) * Math.cos(d) +
            Math.cos(lat) * Math.sin(d) * Math.cos(b),
        );
        const lon2 =
          lon +
          Math.atan2(
            Math.sin(b) * Math.sin(d) * Math.cos(lat),
            Math.cos(d) - Math.sin(lat) * Math.sin(lat2),
          );
        const end: [number, number] = [deg(lat2), deg(lon2)];
        const line = L.polyline(
          [[location.latitude, location.longitude], end],
          { color: "#123e35", weight: 4 },
        ).addTo(map);
        const label = document.createElement("span");
        label.textContent = "Qibla";
        L.circleMarker(end, { radius: 5, color: "#123e35" })
          .bindTooltip(label, { permanent: true })
          .addTo(map);
        map.fitBounds(line.getBounds(), { padding: [30, 30] });
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [location.latitude, location.longitude, bearing, markerKey]);
  return <div ref={element} className="qibla-map" aria-label="OpenStreetMap" />;
}
