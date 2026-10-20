import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  JamaatState,
  emptyJamaatState,
  planJamaat,
  jamaatMessage,
} from "../shared/jamaat";
import type {
  Content,
  PrayerSettings,
  UserPreferences,
} from "../shared/schema";
import { send } from "./api";

import { replaceScheduled } from "./inbox-db";
import type { InboxItem } from "../shared/inbox";
import type { Appearance } from "../shared/schema";
const key = "namoz.jamaat-queue.v1";
let queue: Promise<unknown> = Promise.resolve();
export function syncJamaatReminders(
  content: Content[],
  prayer: PrayerSettings | null,
  prefs: UserPreferences,
  appearance?: Appearance,
) {
  const next = queue.then(() => apply(content, prayer, prefs, appearance));
  queue = next.catch(() => {});
  return next;
}
async function apply(
  content: Content[],
  prayer: PrayerSettings | null,
  prefs: UserPreferences,
  appearance?: Appearance,
) {
  let previous = emptyJamaatState();
  try {
    previous = JamaatState.parse(JSON.parse(localStorage.getItem(key) || "{}"));
  } catch {
    /* Older/corrupt cache */
  }
  const native = Capacitor.isNativePlatform();
  let permitted = true;
  if (native)
    permitted =
      (await LocalNotifications.checkPermissions()).display === "granted";
  const state = planJamaat(
    content,
    prayer,
    { ...prefs, jamaatNotifications: prefs.jamaatNotifications && permitted },
    previous,
  );
  const persist = () => localStorage.setItem(key, JSON.stringify(state));
  if (native) {
    const pending = (await LocalNotifications.getPending()).notifications;
    const old = pending.filter((n) => n.id >= 22000 && n.id < 22100);
    if (Capacitor.getPlatform() === "ios")
      state.pending = state.pending.slice(
        0,
        Math.max(0, 64 - (pending.length - old.length)),
      );
    const signature = JSON.stringify([
      state.pending,
      prefs.locale,
      appearance?.prayerNotificationIntro,
      state.pending.map(
        (s) =>
          content.find((c) => c.id === s.contentId)?.translations[prefs.locale],
      ),
    ]);
    const same =
      localStorage.getItem(`${key}.signature`) === signature &&
      old.length === state.pending.length;
    if (!same) {
      if (old.length)
        await LocalNotifications.cancel({
          notifications: old.map((n) => ({ id: n.id })),
        });
      const entries: InboxItem[] = state.pending.map(slot => ({
        id: 'jamaat-'+slot.key, kind: 'prayer', at: slot.at, contentId: slot.contentId,
        ...jamaatMessage(slot,content.find(c=>c.id===slot.contentId)!,prefs.locale,appearance?.prayerNotificationIntro[prefs.locale]),
      }));
      try {
        if (state.pending.length)
          await LocalNotifications.schedule({
            notifications: state.pending.map((slot, i) => ({
              id: 22000 + i,
              ...jamaatMessage(
                slot,
                content.find((c) => c.id === slot.contentId)!,
                prefs.locale,
                appearance?.prayerNotificationIntro[prefs.locale],
              ),
              schedule: { at: new Date(slot.at), allowWhileIdle: true },
              isExactNotification: false,
              smallIcon: "ic_stat_namoz",
              extra: {
                inbox: entries[i],
                section: "prayer",
                jamaatId: slot.contentId,
                expiresAt: slot.prayerAt,
              },
            })),
          });
        await replaceScheduled("jamaat", entries);
        localStorage.setItem(`${key}.signature`, signature);
      } catch (error) {
        state.pending = [];
        persist();
        localStorage.removeItem(`${key}.signature`);
        throw error;
      }
    }
    persist();
    return;
  }
  if (!prefs.jamaatNotifications) {
    persist();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) {
    state.pending = [];
    persist();
    return;
  }
  // Send only prayer timestamps and material IDs; no coordinates or ticket data.
  await send("/push/jamaat", { endpoint: sub.endpoint, slots: state.pending });
  persist();
}
