import { inboxFromPush, type InboxItem } from "../shared/inbox";
import { saveNotification, replaceScheduled, readNotification } from "./inbox-db";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { calendarReminders } from "../shared/calendar";
import {
  hasTranslation,
  type Content,
  type PrayerSettings,
  type Locale,
} from "../shared/schema";
import type { MonthConfirmation } from "../shared/calendar";
import { translate } from "./i18n";
import { api, send } from "./api";
import { nativeCloudPushAvailable } from "./native-device";
export async function enableContentPush(_key:string|null|undefined,locale:string,_nativeConfigured=false){
 throw new Error(translate(locale as Locale,'cloudPushUnavailable'));
}
export async function disableContentPush(){localStorage.removeItem('namoz.push-token');}
export async function requestLocalNotifications() {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }
  return (
    "Notification" in window &&
    (await Notification.requestPermission()) === "granted"
  );
}
let calendarQueue: Promise<unknown> = Promise.resolve();
export function syncCalendarReminders(
  ...args: Parameters<typeof applyCalendarReminders>
) {
  const work = () => applyCalendarReminders(...args);
  const next = calendarQueue.then(work, work);
  calendarQueue = next.catch(() => {});
  return next;
}
async function applyCalendarReminders(
  content: Content[],
  months: MonthConfirmation[],
  settings: PrayerSettings | null,
  locale: Locale,
  enabled: boolean,
  leadDays: number,
) {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  const old = pending.notifications.filter(
    (n) => n.id >= 20000 && n.id < 21000,
  );
  if (old.length)
    await LocalNotifications.cancel({
      notifications: old.map((n) => ({ id: n.id })),
    });
  if (
    !enabled ||
    !settings ||
    (await LocalNotifications.checkPermissions()).display !== "granted"
  ) {
    await replaceScheduled("calendar", []);
    return;
  }
  const reminders = calendarReminders(
    content.filter((c) => hasTranslation(c, locale)),
    months,
    settings.location.timezone,
    settings.location.country,
    leadDays,
  );
  if (reminders.length)
    await LocalNotifications.schedule({
      notifications: reminders
        .slice(0, Capacitor.getPlatform() === "ios" ? 29 : 1000)
        .map((r, i) => ({
          id: 20000 + i,
          title: r.content.translations[locale].title,
          body: `${translate(locale, r.confirmed ? "confirmed" : "expected")}: ${r.eventDate}. ${!r.confirmed ? translate(locale, "moonNotice") : ""}`,
          schedule: { at: r.remindAt },
          isExactNotification: false,
          extra: { contentId: r.content.id, inbox: {
            id: `calendar-${r.content.id}-${r.eventDate}-${r.remindAt.toISOString()}`, kind: 'content', at: r.remindAt.toISOString(), contentId: r.content.id,
            title: r.content.translations[locale].title,
            body: `${translate(locale, r.confirmed ? "confirmed" : "expected")}: ${r.eventDate}. ${!r.confirmed ? translate(locale, "moonNotice") : ""}`,
          } },
          smallIcon: "ic_stat_namoz",
        })),
    });
  await replaceScheduled('calendar',reminders.slice(0,Capacitor.getPlatform()==='ios'?29:1000).map(r=>({
    id:`calendar-${r.content.id}-${r.eventDate}-${r.remindAt.toISOString()}`,kind:'content',at:r.remindAt.toISOString(),contentId:r.content.id,
    title:r.content.translations[locale].title,
    body:`${translate(locale,r.confirmed?'confirmed':'expected')}: ${r.eventDate}. ${!r.confirmed?translate(locale,'moonNotice'):''}`,
  })));
}
function nativeEntry(n: any, local = false): InboxItem {
  const extra = local ? n.extra : n.data;
  if (extra?.inbox) return extra.inbox;
  return inboxFromPush({...extra, id: extra?.notificationId || n.tag || String(n.id), title: n.title || extra?.title, body: n.body || extra?.body,
    at: extra?.at || (extra?.section === "prayer" ? extra?.expiresAt : undefined),
    kind: extra?.section === 'prayer' ? 'prayer' : extra?.kind,
    contentId: extra?.contentId || extra?.jamaatId});
}
async function rememberNative(n: any, local: boolean, open = false) {
  // This device-local preparation reminder is kept by My Umrah, not the
  // ordinary notification inbox. Opening it never confirms a ritual or marks
  // the reminder as read; the reader acknowledges it in the guide.
  if (local && n.extra?.umrahReminder === true && n.extra?.section === "umrah") {
    if (open) {
      history.replaceState({}, "", "/?section=umrah");
      window.dispatchEvent(new Event("namoz-umrah-reminder"));
    } else {
      window.dispatchEvent(new Event("namoz-umrah-reminder-received"));
    }
    return;
  }

  const entry=nativeEntry(n,local);
  if(!open && await readNotification(entry.id).catch(()=>undefined))return;
  await saveNotification(entry).catch(()=>{});
  if(open) {
    const url=new URL(location.href);url.searchParams.delete('material');url.searchParams.set('notification',entry.id);
    history.replaceState({},'',url.pathname+url.search);
    window.dispatchEvent(new CustomEvent('namoz-notification',{detail:entry}));
  }
}
export async function collectNativeNotifications() {}
export async function initializeNotificationLinks() {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.addListener('localNotificationActionPerformed',e=>void rememberNative(e.notification,true,true));
  await LocalNotifications.addListener('localNotificationReceived',n=>void rememberNative(n,true));
}

// F-Droid edition uses local notifications only, including in the browser preview.
export async function syncWebPushPreferences(_prefs:import('../shared/schema').UserPreferences,_prayer:PrayerSettings|null,_key:string|null|undefined,_requestPermission=false) {}

export async function notificationPermission(): Promise<string> {
  if (Capacitor.isNativePlatform())
    return (await LocalNotifications.checkPermissions()).display;
  return "Notification" in window ? Notification.permission : "unavailable";
}
