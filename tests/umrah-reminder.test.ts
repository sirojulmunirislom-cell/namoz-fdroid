import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: vi.fn(), check: vi.fn(), request: vi.fn(), exact: vi.fn(), settings: vi.fn(),
  createChannel: vi.fn(), listChannels: vi.fn(), schedule: vi.fn(), pending: vi.fn(),
  cancel: vi.fn(), removeDelivered: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: mocks.platform } }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: {
  checkPermissions: mocks.check, requestPermissions: mocks.request,
  checkExactNotificationSetting: mocks.exact, changeExactNotificationSetting: mocks.settings,
  createChannel: mocks.createChannel, listChannels: mocks.listChannels,
  schedule: mocks.schedule, getPending: mocks.pending, cancel: mocks.cancel,
  removeDeliveredNotificationsById: mocks.removeDelivered,
} }));
import {
  UMRAH_REMINDER_KEY, UMRAH_REMINDER_NOTIFICATION_ID, UMRAH_REMINDER_CHANNEL,
  loadUmrahReminder, scheduleUmrahReminder, cancelUmrahReminder,
  acknowledgeUmrahReminder, inspectUmrahReminder, openUmrahExactAlarmSettings,
  invalidateUmrahReminderVerification,
  type UmrahReminder,
} from "../src/umrah/reminder";

const NOW = Date.parse("2026-10-29T10:00:00Z");
const input = { minutesUntilMiqat: 90, leadMinutes: 30, locale: "ru" as const };
let values: Map<string, string>;
let pending: Array<{ id: number; extra?: Record<string, unknown> }>;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.resetAllMocks();
  invalidateUmrahReminderVerification();
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  values = new Map(); pending = [];
  storage = {
    getItem: vi.fn(key => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn(key => values.delete(key)),
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("fetch", vi.fn());
  mocks.platform.mockReturnValue("web");
  mocks.check.mockResolvedValue({ display: "granted" });
  mocks.request.mockResolvedValue({ display: "granted" });
  mocks.exact.mockResolvedValue({ exact_alarm: "granted" });
  mocks.settings.mockResolvedValue({ exact_alarm: "granted" });
  mocks.createChannel.mockResolvedValue(undefined);
  mocks.listChannels.mockResolvedValue({ channels: [{ id: UMRAH_REMINDER_CHANNEL, importance: 4 }] });
  mocks.schedule.mockImplementation(async ({ notifications }) => {
    pending.push(...notifications);
    return { notifications: notifications.map((n: { id: number }) => ({ id: n.id })) };
  });
  mocks.pending.mockImplementation(async () => ({ notifications: pending }));
  mocks.cancel.mockImplementation(async ({ notifications }) => {
    const ids = notifications.map((n: { id: number }) => n.id);
    pending = pending.filter(n => !ids.includes(n.id));
  });
  mocks.removeDelivered.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("local Umrah preparation reminder", () => {
  it("loads without permission, network or scheduling side effects", async () => {
    expect(loadUmrahReminder()).toEqual({ status: "empty", reminder: null });
    expect(await inspectUmrahReminder()).toEqual({ status: "empty", reminder: null, deliveryStatus: "none" });
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses offline epoch deadlines and never requests web notification permission", async () => {
    const notificationPermission = vi.fn();
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubGlobal("Notification", { requestPermission: notificationPermission });
    const result = await scheduleUmrahReminder(input);
    expect(result.status).toBe("scheduled");
    expect(result.reminder).toMatchObject({
      createdAt: NOW, estimatedMiqatAt: NOW + 90 * 60_000,
      remindAt: NOW + 60 * 60_000, delivery: "web-open", locale: "ru",
    });
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("web-open");
    expect(notificationPermission).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    const restored = loadUmrahReminder();
    expect(restored.reminder).toEqual(result.reminder);
    vi.setSystemTime(NOW + 61 * 60_000);
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("due");
    expect(loadUmrahReminder().reminder?.remindAt).toBe(NOW + 60 * 60_000);
  });

  it.each([
    { minutesUntilMiqat: NaN }, { minutesUntilMiqat: Infinity },
    { minutesUntilMiqat: 1441 }, { minutesUntilMiqat: 30 },
    { minutesUntilMiqat: 31 }, { leadMinutes: 4 }, { leadMinutes: 5.5 },
  ])("rejects unsafe or ambiguous duration %j before any mutation", async patch => {
    expect((await scheduleUmrahReminder({ ...input, ...patch })).status).toBe("invalid-input");
    expect(values.size).toBe(0);
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("requires explicit cancellation before replacing an unread reminder", async () => {
    const first = await scheduleUmrahReminder(input);
    expect((await scheduleUmrahReminder({ ...input, minutesUntilMiqat: 120 })).status).toBe("exists");
    expect(loadUmrahReminder().reminder).toEqual(first.reminder);
    expect((await cancelUmrahReminder()).status).toBe("cancelled");
    expect((await scheduleUmrahReminder({ ...input, minutesUntilMiqat: 120 })).status).toBe("scheduled");
  });

  it.each([
    ["{", "corrupt"], [JSON.stringify({ schemaVersion: 7 }), "future-version"],
    [JSON.stringify({ schemaVersion: 1, latitude: 22 }), "corrupt"],
  ])("preserves unreadable save %s until explicit clearing", async (raw, status) => {
    values.set(UMRAH_REMINDER_KEY, raw);
    expect(loadUmrahReminder().status).toBe(status);
    expect((await scheduleUmrahReminder(input)).status).toBe("storage-blocked");
    expect((await acknowledgeUmrahReminder()).status).toBe("storage-blocked");
    expect(values.get(UMRAH_REMINDER_KEY)).toBe(raw);
    expect((await cancelUmrahReminder()).status).toBe("cancelled");
    expect(values.has(UMRAH_REMINDER_KEY)).toBe(false);
  });

  it("does not schedule an Android alarm when local storage refuses the write", async () => {
    mocks.platform.mockReturnValue("android");
    storage.setItem.mockImplementation(() => { throw new Error("quota"); });
    expect((await scheduleUmrahReminder(input)).status).toBe("storage-unavailable");
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(values.has(UMRAH_REMINDER_KEY)).toBe(false);
  });

  it("does not silently accept storage that discards writes", async () => {
    storage.setItem.mockImplementation(() => {});
    expect((await scheduleUmrahReminder(input)).status).toBe("storage-unavailable");
    expect(loadUmrahReminder().status).toBe("empty");
  });

  it("schedules only the dedicated Android exact alarm after permission and readback", async () => {
    mocks.platform.mockReturnValue("android");
    pending = [{ id: 20000 }, { id: 22000 }];
    const result = await scheduleUmrahReminder(input);
    expect(result.status).toBe("scheduled");
    expect(result.reminder?.delivery).toBe("android-exact");
    const notification = mocks.schedule.mock.calls[0][0].notifications[0];
    expect(notification).toMatchObject({
      id: UMRAH_REMINDER_NOTIFICATION_ID, isExactNotification: true, isExactMandatory: true,
      schedule: { at: new Date(NOW + 60 * 60_000), allowWhileIdle: true },
      extra: { section: "umrah", umrahReminder: true, umrahReminderId: result.reminder!.id },
    });
    expect(notification.body).not.toContain("GPS");
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("pending");
    expect(mocks.settings).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    await cancelUmrahReminder();
    expect(pending).toEqual([{ id: 20000 }, { id: 22000 }]);
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith({ notifications: [{ id: 23001 }] });
  });

  it("does not use inexact fallback or open settings when exact access is missing", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.exact.mockResolvedValue({ exact_alarm: "denied" });
    expect((await scheduleUmrahReminder(input)).status).toBe("exact-permission-required");
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.settings).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
    expect(await openUmrahExactAlarmSettings()).toBe("granted");
    expect(mocks.settings).toHaveBeenCalledOnce();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("does not promise a reminder after notification permission refusal", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.check.mockResolvedValue({ display: "prompt" });
    mocks.request.mockResolvedValue({ display: "denied" });
    expect((await scheduleUmrahReminder(input)).status).toBe("permission-denied");
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(loadUmrahReminder().status).toBe("empty");
  });

  it("handles a disabled reminder channel separately from global permission", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.listChannels.mockResolvedValue({ channels: [{ id: UMRAH_REMINDER_CHANNEL, importance: 0 }] });
    expect((await scheduleUmrahReminder(input)).status).toBe("permission-denied");
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("supports Android 7 where only channel APIs report UNAVAILABLE", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.createChannel.mockRejectedValue({ code: "UNAVAILABLE" });
    mocks.listChannels.mockRejectedValue({ code: "UNAVAILABLE" });
    expect((await scheduleUmrahReminder(input)).status).toBe("scheduled");
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("pending");
  });

  it("does not mistake a different channel failure for old Android support", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.createChannel.mockRejectedValue({ code: "UNIMPLEMENTED" });
    expect((await scheduleUmrahReminder(input)).status).toBe("schedule-failed");
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("does not move the selected deadline later while a permission prompt is open", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.check.mockResolvedValue({ display: "prompt" });
    mocks.request.mockImplementation(async () => {
      vi.setSystemTime(NOW + 5 * 60_000);
      return { display: "granted" };
    });
    const result = await scheduleUmrahReminder(input);
    expect(result.reminder?.createdAt).toBe(NOW);
    expect(result.reminder?.remindAt).toBe(NOW + 60 * 60_000);
  });

  it("rejects a deadline that passes during a permission prompt", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.check.mockResolvedValue({ display: "prompt" });
    mocks.request.mockImplementation(async () => {
      vi.setSystemTime(NOW + 61 * 60_000);
      return { display: "granted" };
    });
    expect((await scheduleUmrahReminder(input)).status).toBe("invalid-input");
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
  });

  it.each(["reject", "warning", "missing", "wrong-id"])("rolls back when native schedule is %s", async failure => {
    mocks.platform.mockReturnValue("android");
    if (failure === "reject") mocks.schedule.mockRejectedValue(new Error("OS error"));
    if (failure === "warning") mocks.schedule.mockResolvedValue({ notifications: [{ id: 23001 }], warning: { code: "INEXACT" } });
    if (failure === "missing") mocks.schedule.mockResolvedValue({ notifications: [{ id: 23001 }] });
    if (failure === "wrong-id") mocks.schedule.mockImplementation(async () => {
      pending = [{ id: 23001, extra: { umrahReminderId: "old-reminder" } }];
      return { notifications: [{ id: 23001 }] };
    });
    expect((await scheduleUmrahReminder(input)).status).toBe("schedule-failed");
    expect(loadUmrahReminder().status).toBe("empty");
    expect(pending).toEqual([]);
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: 23001 }] });
  });

  it("retains visible state if failed scheduling cannot be cancelled", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.schedule.mockRejectedValue(new Error("uncertain OS failure"));
    mocks.cancel.mockRejectedValue(new Error("OS cancellation failed"));
    expect((await scheduleUmrahReminder(input)).status).toBe("cancel-failed");
    expect(loadUmrahReminder().status).toBe("ok");
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("missing");
  });

  it("rechecks permission and missing native schedules without prompting or replacing", async () => {
    mocks.platform.mockReturnValue("android");
    await scheduleUmrahReminder(input);
    mocks.check.mockResolvedValue({ display: "denied" });
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("permission-denied");
    mocks.check.mockResolvedValue({ display: "granted" });
    mocks.exact.mockResolvedValue({ exact_alarm: "denied" });
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("exact-permission-required");
    mocks.exact.mockResolvedValue({ exact_alarm: "granted" });
    pending = [];
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("missing");
    expect(mocks.schedule).toHaveBeenCalledOnce();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.settings).not.toHaveBeenCalled();
  });

  it("due and acknowledgement are timestamp-based, not delivery or rite-completion claims", async () => {
    mocks.platform.mockReturnValue("android");
    await scheduleUmrahReminder(input);
    expect((await acknowledgeUmrahReminder()).status).toBe("invalid-input");
    vi.setSystemTime(NOW + 61 * 60_000);
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("due");
    expect(loadUmrahReminder().reminder?.acknowledgedAt).toBeUndefined();
    expect((await acknowledgeUmrahReminder()).status).toBe("acknowledged");
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("acknowledged");
    expect(pending).toEqual([]);
    expect([...values.keys()]).toEqual([UMRAH_REMINDER_KEY]);
  });

  it("clears already-delivered plugin history before verifying cancellation", async () => {
    mocks.platform.mockReturnValue("android");
    await scheduleUmrahReminder(input);
    vi.setSystemTime(NOW + 61 * 60_000);
    // Capacitor8.3 retains triggered records on cancel; clearing delivered
    // notifications is what removes that history from getPending().
    mocks.cancel.mockResolvedValue(undefined);
    mocks.removeDelivered.mockImplementation(async ({ ids }) => {
      pending = pending.filter(n => !ids.includes(n.id));
    });
    expect((await acknowledgeUmrahReminder()).status).toBe("acknowledged");
    expect(mocks.removeDelivered).toHaveBeenCalledWith({ ids: [23001] });
    expect(pending).toEqual([]);
  });

  it("does not treat restored plugin metadata as live Android alarm proof", async () => {
    mocks.platform.mockReturnValue("android");
    const result = await scheduleUmrahReminder(input);
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("pending");
    invalidateUmrahReminderVerification();
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("unverified");
    expect(loadUmrahReminder().reminder).toEqual(result.reminder);
    expect(mocks.schedule).toHaveBeenCalledOnce();
  });

  it("does not re-confirm a revoked then regranted alarm from old metadata", async () => {
    mocks.platform.mockReturnValue("android");
    await scheduleUmrahReminder(input);
    mocks.exact.mockResolvedValue({ exact_alarm: "denied" });
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("exact-permission-required");
    mocks.exact.mockResolvedValue({ exact_alarm: "granted" });
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("unverified");
    expect(mocks.schedule).toHaveBeenCalledOnce();
  });

  it("serializes a schedule followed by cancellation so no late orphan remains", async () => {
    mocks.platform.mockReturnValue("android");
    const scheduled = scheduleUmrahReminder(input);
    const cancelled = cancelUmrahReminder();
    expect((await scheduled).status).toBe("scheduled");
    expect((await cancelled).status).toBe("cancelled");
    expect(pending).toEqual([]);
    expect(loadUmrahReminder().status).toBe("empty");
  });

  it("keeps a record when cancellation cannot be verified", async () => {
    mocks.platform.mockReturnValue("android");
    await scheduleUmrahReminder(input);
    mocks.cancel.mockResolvedValue(undefined);
    expect((await cancelUmrahReminder()).status).toBe("cancel-failed");
    expect(loadUmrahReminder().status).toBe("ok");
    expect((await inspectUmrahReminder()).deliveryStatus).toBe("unverified");
  });

  it("rejects impossible persisted intervals and additional coordinate fields", async () => {
    const result = await scheduleUmrahReminder(input);
    const reminder = result.reminder as UmrahReminder;
    values.set(UMRAH_REMINDER_KEY, JSON.stringify({ ...reminder, remindAt: reminder.createdAt }));
    expect(loadUmrahReminder().status).toBe("corrupt");
    values.set(UMRAH_REMINDER_KEY, JSON.stringify({ ...reminder, latitude: 21 }));
    expect(loadUmrahReminder().status).toBe("corrupt");
    values.set(UMRAH_REMINDER_KEY, JSON.stringify({ ...reminder,
      createdAt: 8_650_000_000_000_000, remindAt: 8_650_000_003_600_000,
      estimatedMiqatAt: 8_650_000_005_400_000,
    }));
    expect(loadUmrahReminder().status).toBe("corrupt");
  });
});
