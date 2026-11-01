import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callbacks: new Map<string, (event: any) => unknown>(),
  save: vi.fn(), read: vi.fn(), replace: vi.fn(), dispatch: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: {
  addListener: vi.fn(async (name, callback) => { mocks.callbacks.set(name, callback); }),
} }));
vi.mock("../src/inbox-db", () => ({
  saveNotification: mocks.save, readNotification: mocks.read, replaceScheduled: vi.fn(),
}));
vi.mock("../src/native-device", () => ({ nativeCloudPushAvailable: vi.fn() }));
import { initializeNotificationLinks } from "../src/notifications";

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.callbacks.clear();
  vi.stubGlobal("history", { replaceState: mocks.replace });
  vi.stubGlobal("window", { dispatchEvent: mocks.dispatch });
  mocks.save.mockResolvedValue(undefined);
  mocks.read.mockResolvedValue(undefined);
  await initializeNotificationLinks();
});
afterEach(() => vi.unstubAllGlobals());

const reminder = { id: 23001, title: "Prepare before the miqat", extra: {
  umrahReminder: true, umrahReminderId: "local-plan", section: "umrah",
} };

it("opens the guide from a local reminder without using the ordinary inbox or acknowledging progress", async () => {
  mocks.callbacks.get("localNotificationActionPerformed")!({ notification: reminder });
  await Promise.resolve();
  expect(mocks.replace).toHaveBeenCalledExactlyOnceWith({}, "", "/?section=umrah");
  expect(mocks.dispatch.mock.calls[0][0].type).toBe("namoz-umrah-reminder");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.read).not.toHaveBeenCalled();
});

it("receiving a preparation reminder does not force navigation away from another task", async () => {
  mocks.callbacks.get("localNotificationReceived")!(reminder);
  await Promise.resolve();
  expect(mocks.replace).not.toHaveBeenCalled();
  expect(mocks.dispatch.mock.calls[0][0].type).toBe("namoz-umrah-reminder-received");
  expect(mocks.save).not.toHaveBeenCalled();
});

it("continues to save ordinary prayer notifications in the existing inbox", async () => {
  mocks.callbacks.get("localNotificationReceived")!({ id: 10001, title: "Fajr", body: "Prayer time", extra: { section: "prayer" } });
  await Promise.resolve(); await Promise.resolve();
  expect(mocks.save).toHaveBeenCalledOnce();
  expect(mocks.dispatch).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});
