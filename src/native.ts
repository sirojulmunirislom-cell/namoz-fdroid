import { Capacitor, registerPlugin } from "@capacitor/core";
import { DateTime } from "luxon";
import { getPrayerDay, prayerKeys } from "../shared/prayer";
import type { PrayerSettings, Locale } from "../shared/schema";
import { translate } from "./i18n";
import { requestLocationPermissions } from "./native-location";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  locales,
  hasTranslation,
  type Content,
  type Mosque,
} from "../shared/schema";
const Widgets = registerPlugin<{
  update(options: { snapshot: unknown }): Promise<void>;
  consumeLaunchIntent(): Promise<{ section?: string; contentId?: string }>;
}>("NamozWidgets");
const Trip = registerPlugin<{
  start(options: unknown): Promise<void>;
  stop(): Promise<void>;
  setLocale(options: { locale: Locale }): Promise<void>;
}>("NamozTrip");
export async function syncNativeLocale(locale: Locale) {
  if (Capacitor.getPlatform() === "android") await Trip.setLocale({ locale });
}
export async function stopMosqueTrip() {
  if (Capacitor.getPlatform() === "android") await Trip.stop();
}
export async function startMosqueTrip(
  mosque: Mosque,
  dua: Content,
  locale: Locale,
) {
  if (Capacitor.getPlatform() !== "android") return;
  const loc = await requestLocationPermissions(true);
  if (loc.location !== "granted")
    throw new Error(
      "Precise location permission is required for an exit reminder.",
    );
  const n = await LocalNotifications.requestPermissions();
  if (n.display !== "granted")
    throw new Error("Notification permission is required.");
  await syncNativeLocale(locale);
  await Trip.start({
    latitude: mosque.latitude,
    longitude: mosque.longitude,
    contentId: dua.id,
    tripTitle: translate(locale, "going"),
    tripBody: translate(locale, "tripDisclosure"),
    exitTitles: JSON.stringify(
      Object.fromEntries(
        locales.map((l) => [
          l,
          hasTranslation(dua, l) ? dua.translations[l].title : "",
        ]),
      ),
    ),
    exitBodies: JSON.stringify(
      Object.fromEntries(locales.map((l) => [l, translate(l, "read")])),
    ),
    exitTitle: dua.translations[locale].title,
    exitBody: translate(locale, "read"),
  });
}
export async function updateWidgets(
  settings: PrayerSettings | null,
  locale: Locale,
  brand: string,
) {
  if (Capacitor.getPlatform() !== "android") return;
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const prayers: any[] = [],
    windows: any[] = [];
  if (settings) {
    const start = DateTime.now().setZone(settings.location.timezone);
    for (let i = 0; i < 7; i++) {
      const p = getPrayerDay(settings, start.plus({ days: i }).toISODate()!);
      if (!p) continue;
      for (const k of prayerKeys.filter((k) => k !== "sunrise"))
        prayers.push({
          at: new Date(p.times[k]).getTime(),
          title: t(k),
          time: DateTime.fromISO(p.times[k])
            .setZone(settings.location.timezone)
            .toFormat("HH:mm"),
        });
      windows.push(
        {
          start: new Date(p.times.fajr).getTime(),
          end: new Date(p.times.sunrise).getTime(),
          title: t("morning"),
        },
        {
          start: new Date(p.times.asr).getTime(),
          end: new Date(p.times.maghrib).getTime(),
          title: t("evening"),
        },
      );
    }
  }
  await Widgets.update({
    snapshot: {
      confirmed: !!settings,
      brand,
      city: settings?.location.name || "",
      location: settings?.location ?? null,
      setup: t("setupTitle"),
      adhkarTitle: t("adhkar"),
      morningTitle: t("morning"),
      eveningTitle: t("evening"),
      activeLabel: t("activeNow"),
      prayers,
      windows,
    },
  });
}

export async function consumeNativeLaunch() {
  if (Capacitor.getPlatform() !== "android") return;
  const d = await Widgets.consumeLaunchIntent();
  if (d.contentId && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(d.contentId))
    location.href = `/?material=${d.contentId}`;
  else if (d.section && ["prayer", "adhkar", "mosques"].includes(d.section))
    location.href = `/?section=${d.section}`;
}
