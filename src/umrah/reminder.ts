import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { z } from "zod";
import { locales, type Locale } from "../../shared/schema";
import { reminderText } from "./reminder-copy";

// This reminder is a user-entered preparation timer. It never determines a
// miqat, a boundary crossing, or whether entering ihram is complete.
export const UMRAH_REMINDER_KEY = "namoz.umrah.reminder.v1";
export const UMRAH_REMINDER_NOTIFICATION_ID = 23001;
export const UMRAH_REMINDER_CHANNEL = "namoz_umrah_preparation";
const MINUTE = 60_000;
const MAX_DATE = 8_640_000_000_000_000;

const reminderSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^umrah-[a-z0-9-]{1,70}$/),
  createdAt: z.number().int().positive().max(MAX_DATE),
  estimatedMiqatAt: z.number().int().positive().max(MAX_DATE),
  remindAt: z.number().int().positive().max(MAX_DATE),
  locale: z.enum(locales),
  delivery: z.enum(["android-exact", "web-open"]),
  acknowledgedAt: z.number().int().positive().max(MAX_DATE).optional(),
}).strict().refine(value =>
  value.remindAt - value.createdAt >= 2 * MINUTE &&
  value.estimatedMiqatAt - value.remindAt >= 5 * MINUTE &&
  value.estimatedMiqatAt - value.createdAt <= 1440 * MINUTE &&
  (value.acknowledgedAt === undefined || value.acknowledgedAt >= value.remindAt),
);

export type UmrahReminder = z.infer<typeof reminderSchema>;
export interface UmrahReminderLoadResult {
  status: "ok" | "empty" | "corrupt" | "future-version" | "unavailable";
  reminder: UmrahReminder | null;
}
export interface UmrahReminderOperationResult {
  status: "scheduled" | "cancelled" | "acknowledged" | "invalid-input" | "exists" |
    "storage-unavailable" | "storage-blocked" | "permission-denied" |
    "exact-permission-required" | "schedule-failed" | "cancel-failed" | "unsupported";
  reminder: UmrahReminder | null;
}
export interface UmrahReminderInspection extends UmrahReminderLoadResult {
  // "due" means the chosen time passed; it is not proof of OS delivery.
  deliveryStatus: "none" | "web-open" | "pending" | "due" | "acknowledged" |
    "permission-denied" | "exact-permission-required" | "missing" | "unverified";
}
export interface UmrahReminderInput {
  minutesUntilMiqat: number;
  leadMinutes: number;
  locale: Locale;
}

function decode(raw: string | null): UmrahReminderLoadResult {
  if (raw === null) return { status: "empty", reminder: null };
  try {
    const value = JSON.parse(raw);
    if (typeof value?.schemaVersion === "number" && value.schemaVersion > 1)
      return { status: "future-version", reminder: null };
    const parsed = reminderSchema.safeParse(value);
    return parsed.success ? { status: "ok", reminder: parsed.data } : { status: "corrupt", reminder: null };
  } catch { return { status: "corrupt", reminder: null }; }
}

/** Read-only. Unsupported/corrupt saves are preserved until explicit clearing. */
export function loadUmrahReminder(): UmrahReminderLoadResult {
  try { return decode(localStorage.getItem(UMRAH_REMINDER_KEY)); }
  catch { return { status: "unavailable", reminder: null }; }
}

function persistRaw(raw: string | null) {
  if (raw === null) localStorage.removeItem(UMRAH_REMINDER_KEY);
  else localStorage.setItem(UMRAH_REMINDER_KEY, raw);
  if (localStorage.getItem(UMRAH_REMINDER_KEY) !== raw) throw new Error("Reminder storage did not retain the write");
}

let queue: Promise<unknown> = Promise.resolve();
// The plugin's getPending() reads its stored metadata, not AlarmManager's live
// registration. A cold-start restore therefore cannot prove a still-active OS
// alarm (e.g. following force-stop or exact-access revocation and regrant).
const verifiedNativeIds = new Set<string>();
/** Losing foreground can hide permission revocation/regrant; never guess. */
export function invalidateUmrahReminderVerification() {
  verifiedNativeIds.clear();
}
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => {});
  return next;
}

function validInput(input: UmrahReminderInput) {
  return Number.isInteger(input.minutesUntilMiqat) && Number.isInteger(input.leadMinutes) &&
    input.minutesUntilMiqat <= 1440 && input.leadMinutes >= 5 &&
    input.minutesUntilMiqat - input.leadMinutes >= 2 && locales.includes(input.locale);
}

async function cancelNative() {
  verifiedNativeIds.clear();
  await LocalNotifications.cancel({ notifications: [{ id: UMRAH_REMINDER_NOTIFICATION_ID }] });
  // v8.3 retains already-triggered notification metadata after cancel(); clear
  // delivered history before checking, otherwise acknowledgement always fails.
  await LocalNotifications.removeDeliveredNotificationsById({ ids: [UMRAH_REMINDER_NOTIFICATION_ID] });
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.some(item => item.id === UMRAH_REMINDER_NOTIFICATION_ID))
    throw new Error("Reminder cancellation was not confirmed");
}

function legacyChannelApi(error: unknown) {
  // In the installed Android plugin these two channel methods return precisely
  // UNAVAILABLE below SDK 26. Other errors still prevent a success claim.
  return (error as { code?: unknown })?.code === "UNAVAILABLE";
}

async function channelAllowed() {
  try {
    const channels = await LocalNotifications.listChannels();
    const channel = channels.channels.find(item => item.id === UMRAH_REMINDER_CHANNEL);
    return !!channel && channel.importance !== 0;
  } catch (error) {
    if (legacyChannelApi(error)) return true;
    throw error;
  }
}

/** Explicit button action only. No location, network, push, or background track. */
export function scheduleUmrahReminder(input: UmrahReminderInput): Promise<UmrahReminderOperationResult> {
  const requestedAt = Date.now();
  return serialize(async () => {
    const loaded = loadUmrahReminder();
    const outcome = (status: UmrahReminderOperationResult["status"], reminder = loaded.reminder): UmrahReminderOperationResult => ({ status, reminder });
    if (!validInput(input)) return outcome("invalid-input");
    if (loaded.status === "unavailable") return outcome("storage-unavailable");
    if (loaded.status === "corrupt" || loaded.status === "future-version") return outcome("storage-blocked");
    // Replacement is deliberately a separate explicit cancel action. A stale
    // estimate is not silently replaced by a form submission or mount effect.
    if (loaded.reminder && !loaded.reminder.acknowledgedAt) return outcome("exists");
    const platform = Capacitor.getPlatform();
    if (platform !== "android" && platform !== "web") return outcome("unsupported");
    const native = platform === "android";
    let previousRaw: string | null;
    try { previousRaw = localStorage.getItem(UMRAH_REMINDER_KEY); }
    catch { return outcome("storage-unavailable"); }

    if (native) {
      try {
        // Never open the exact-alarm settings implicitly. Inexact alarms may
        // be delayed too far for this purpose, so no inexact fallback is used.
        if ((await LocalNotifications.checkExactNotificationSetting()).exact_alarm !== "granted")
          return outcome("exact-permission-required");
        let permission = await LocalNotifications.checkPermissions();
        if (permission.display !== "granted") permission = await LocalNotifications.requestPermissions();
        if (permission.display !== "granted") return outcome("permission-denied");
        try {
          await LocalNotifications.createChannel({
            id: UMRAH_REMINDER_CHANNEL,
            name: reminderText(input.locale, "notificationTitle"),
            importance: 4, vibration: true, visibility: 0,
          });
        } catch (error) { if (!legacyChannelApi(error)) throw error; }
        if (!await channelAllowed()) return outcome("permission-denied");
      } catch { return outcome("schedule-failed"); }
    }

    // Anchor the estimate to the button press, not the end of a permission
    // dialog. Both timestamps are epoch instants; timezone changes do not
    // recalculate them, and a slow prompt must not move the alarm later.
    const now = requestedAt;
    const reminder: UmrahReminder = {
      schemaVersion: 1,
      id: `umrah-${now}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: now,
      estimatedMiqatAt: now + input.minutesUntilMiqat * MINUTE,
      remindAt: now + (input.minutesUntilMiqat - input.leadMinutes) * MINUTE,
      locale: input.locale,
      delivery: native ? "android-exact" : "web-open",
    };
    if (reminder.remindAt - Date.now() < MINUTE) return outcome("invalid-input");
    try { persistRaw(JSON.stringify(reminder)); }
    catch {
      try { persistRaw(previousRaw); } catch { /* Keep storage failure visible. */ }
      return outcome("storage-unavailable");
    }
    if (!native) return outcome("scheduled", reminder);
    try {
      const scheduled = await LocalNotifications.schedule({ notifications: [{
        id: UMRAH_REMINDER_NOTIFICATION_ID,
        title: reminderText(input.locale, "notificationTitle"),
        body: reminderText(input.locale, "notificationBody"),
        channelId: UMRAH_REMINDER_CHANNEL,
        schedule: { at: new Date(reminder.remindAt), allowWhileIdle: true },
        isExactNotification: true,
        isExactMandatory: true,
        smallIcon: "ic_stat_namoz",
        foreground: true,
        extra: { section: "umrah", umrahReminder: true, umrahReminderId: reminder.id },
      }] });
      if (scheduled.warning) throw new Error("Exact reminder was not scheduled as requested");
      const pending = await LocalNotifications.getPending();
      const ours = pending.notifications.find(item => item.id === UMRAH_REMINDER_NOTIFICATION_ID);
      if (!ours || ours.extra?.umrahReminderId !== reminder.id)
        throw new Error("Scheduled reminder was not confirmed");
      // A setting can change while an OS dialog is open. Do not call an
      // inexact result exact or leave a fallback alarm silently active.
      if ((await LocalNotifications.checkExactNotificationSetting()).exact_alarm !== "granted")
        throw new Error("Exact reminder permission changed");
      verifiedNativeIds.add(reminder.id);
      return outcome("scheduled", reminder);
    } catch {
      try { await cancelNative(); }
      catch { return outcome("cancel-failed", reminder); }
      try { persistRaw(previousRaw); }
      catch { return outcome("storage-unavailable", reminder); }
      return outcome("schedule-failed");
    }
  });
}

/** Explicit cancellation also allows clearing an unreadable/newer reminder. */
export function cancelUmrahReminder(): Promise<UmrahReminderOperationResult> {
  return serialize(async () => {
    const loaded = loadUmrahReminder();
    if (Capacitor.getPlatform() === "android") {
      try { await cancelNative(); }
      catch { return { status: "cancel-failed", reminder: loaded.reminder }; }
    }
    try { persistRaw(null); }
    catch { return { status: "storage-unavailable", reminder: loaded.reminder }; }
    return { status: "cancelled", reminder: null };
  });
}

/** Reading a preparation reminder never marks any religious stage complete. */
export function acknowledgeUmrahReminder(): Promise<UmrahReminderOperationResult> {
  return serialize(async () => {
    const loaded = loadUmrahReminder();
    if (loaded.status === "unavailable") return { status: "storage-unavailable", reminder: null };
    if (loaded.status === "corrupt" || loaded.status === "future-version") return { status: "storage-blocked", reminder: null };
    if (!loaded.reminder || Date.now() < loaded.reminder.remindAt) return { status: "invalid-input", reminder: loaded.reminder };
    if (Capacitor.getPlatform() === "android") {
      try { await cancelNative(); }
      catch { return { status: "cancel-failed", reminder: loaded.reminder }; }
    }
    const reminder = { ...loaded.reminder, acknowledgedAt: Date.now() };
    try { persistRaw(JSON.stringify(reminder)); }
    catch { return { status: "storage-unavailable", reminder: loaded.reminder }; }
    return { status: "acknowledged", reminder };
  });
}

/** Foreground/resume check only; never asks permission or schedules an alarm. */
export function inspectUmrahReminder(): Promise<UmrahReminderInspection> {
  return serialize(async () => {
    const loaded = loadUmrahReminder();
    const result = (deliveryStatus: UmrahReminderInspection["deliveryStatus"]): UmrahReminderInspection => ({ ...loaded, deliveryStatus });
    const reminder = loaded.reminder;
    if (!reminder) return result("none");
    if (reminder.acknowledgedAt) return result("acknowledged");
    if (Date.now() >= reminder.remindAt) return result("due");
    if (reminder.delivery === "web-open") return result("web-open");
    if (Capacitor.getPlatform() !== "android") return result("unverified");
    try {
      if ((await LocalNotifications.checkPermissions()).display !== "granted") {
        verifiedNativeIds.delete(reminder.id);
        return result("permission-denied");
      }
      if ((await LocalNotifications.checkExactNotificationSetting()).exact_alarm !== "granted") {
        verifiedNativeIds.delete(reminder.id);
        return result("exact-permission-required");
      }
      if (!await channelAllowed()) {
        verifiedNativeIds.delete(reminder.id);
        return result("permission-denied");
      }
      const pending = await LocalNotifications.getPending();
      if (!pending.notifications.some(item => item.id === UMRAH_REMINDER_NOTIFICATION_ID && item.extra?.umrahReminderId === reminder.id)) {
        verifiedNativeIds.delete(reminder.id);
        return result("missing");
      }
      return result(verifiedNativeIds.has(reminder.id) ? "pending" : "unverified");
    } catch {
      verifiedNativeIds.delete(reminder.id);
      return result("unverified");
    }
  });
}

/** Call from a separate, explicitly labelled settings button only. */
export async function openUmrahExactAlarmSettings(): Promise<"granted" | "denied" | "unavailable"> {
  if (Capacitor.getPlatform() !== "android") return "unavailable";
  try {
    const result = await LocalNotifications.changeExactNotificationSetting();
    return result.exact_alarm === "granted" ? "granted" : "denied";
  } catch { return "unavailable"; }
}
