import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ native: vi.fn(), check: vi.fn(), request: vi.fn(), position: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: mocks.native } }));
vi.mock("../src/native-location", () => ({
  checkLocationPermissions: mocks.check,
  requestLocationPermissions: mocks.request,
  currentDevicePosition: mocks.position,
}));
import { requestUmrahPosition, UMRAH_POSITION_MAX_AGE } from "../src/umrah/location";

const NOW = new Date("2026-10-26T10:00:00Z").getTime();
const fresh = () => ({ coords: { latitude: 21.4225, longitude: 39.8262, accuracy: 25 }, timestamp: NOW });
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.native.mockReturnValue(false);
  mocks.position.mockResolvedValue(fresh());
  vi.stubGlobal("navigator", { geolocation: {} });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("explicit Umrah location snapshot", () => {
  it("never accesses location without separate consent", async () => {
    expect(await requestUmrahPosition({ consent: false })).toEqual({ status: "consent-required", boundaryGuidanceAvailable: false });
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.position).not.toHaveBeenCalled();
  });

  it("does one foreground browser request and does not promise a miqat boundary", async () => {
    expect(await requestUmrahPosition({ consent: true })).toEqual({ status: "available", boundaryGuidanceAvailable: false, position: { latitude: 21.4225, longitude: 39.8262, accuracy: 25, timestamp: NOW } });
    expect(mocks.position).toHaveBeenCalledExactlyOnceWith({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it("returns unsupported in a browser without a geolocation API", async () => {
    vi.stubGlobal("navigator", {});
    expect((await requestUmrahPosition({ consent: true })).status).toBe("unsupported");
    expect(mocks.position).not.toHaveBeenCalled();
  });

  it("accepts approximate Android permission without asking for precise permission", async () => {
    mocks.native.mockReturnValue(true);
    mocks.check.mockResolvedValue({ location: "denied", coarseLocation: "granted" });
    mocks.position.mockResolvedValue({ ...fresh(), coords: { ...fresh().coords, accuracy: 3000 } });
    const p = await requestUmrahPosition({ consent: true });
    expect(p.position?.accuracy).toBe(3000);
    expect(p.boundaryGuidanceAvailable).toBe(false);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("requests native permission only after mode consent and stops on denial", async () => {
    mocks.native.mockReturnValue(true);
    mocks.check.mockResolvedValue({ location: "prompt", coarseLocation: "prompt" });
    mocks.request.mockResolvedValue({ location: "denied", coarseLocation: "denied" });
    expect((await requestUmrahPosition({ consent: true })).status).toBe("denied");
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith(false);
    expect(mocks.position).not.toHaveBeenCalled();
  });

  it.each([
    [1, "denied"], ["OS-PLUG-GLOC-0003", "denied"],
    [3, "timeout"], ["OS-PLUG-GLOC-0010", "timeout"],
    [2, "unavailable"], ["OS-PLUG-GLOC-0007", "unavailable"],
    ["UNIMPLEMENTED", "unsupported"],
  ])("normalizes positioning error %s to %s without retry loops", async (code, status) => {
    mocks.position.mockRejectedValue({ code });
    expect(await requestUmrahPosition({ consent: true })).toEqual({ status, boundaryGuidanceAvailable: false });
    expect(mocks.position).toHaveBeenCalledTimes(1);
  });

  it("does not display a stale fix as current", async () => {
    mocks.position.mockResolvedValue({ ...fresh(), timestamp: NOW - UMRAH_POSITION_MAX_AGE - 1 });
    expect(await requestUmrahPosition({ consent: true })).toEqual({ status: "stale", boundaryGuidanceAvailable: false });
  });

  it.each([
    { latitude: NaN }, { longitude: 181 }, { latitude: 91 },
    { accuracy: -1 }, { accuracy: 0 }, { accuracy: Infinity },
  ])("rejects invalid coordinate or accuracy data %j", async patch => {
    mocks.position.mockResolvedValue({ ...fresh(), coords: { ...fresh().coords, ...patch } });
    expect((await requestUmrahPosition({ consent: true })).status).toBe("invalid");
  });

  it("rejects missing or future timestamps instead of inventing acquisition time", async () => {
    mocks.position.mockResolvedValue({ coords: fresh().coords });
    expect((await requestUmrahPosition({ consent: true })).status).toBe("invalid");
    mocks.position.mockResolvedValue({ ...fresh(), timestamp: NOW + 60_000 });
    expect((await requestUmrahPosition({ consent: true })).status).toBe("invalid");
  });

  it("bounds a hung provider even when the provider ignores its own timeout", async () => {
    mocks.position.mockImplementation(() => new Promise(() => {}));
    const pending = requestUmrahPosition({ consent: true });
    await vi.advanceTimersByTimeAsync(23_000);
    expect(await pending).toEqual({ status: "timeout", boundaryGuidanceAvailable: false });
  });

  it("does not open permission prompts when consent is cancelled before the request", async () => {
    mocks.native.mockReturnValue(true);
    const controller = new AbortController();
    controller.abort();
    expect((await requestUmrahPosition({ consent: true, signal: controller.signal })).status).toBe("cancelled");
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.position).not.toHaveBeenCalled();
  });

  it("never starts GPS after a native permission prompt resolves following cancellation", async () => {
    mocks.native.mockReturnValue(true);
    mocks.check.mockResolvedValue({ location: "prompt", coarseLocation: "prompt" });
    let allow: (value: unknown) => void = () => {};
    mocks.request.mockImplementation(() => new Promise(resolve => { allow = resolve; }));
    const controller = new AbortController();
    const pending = requestUmrahPosition({ consent: true, signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.request).toHaveBeenCalledOnce();
    controller.abort();
    expect((await pending).status).toBe("cancelled");
    allow({ location: "granted", coarseLocation: "granted" });
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.position).not.toHaveBeenCalled();
  });

  it("discards a late fix after leaving the mode instead of presenting it as active tracking", async () => {
    let provide: (value: unknown) => void = () => {};
    mocks.position.mockImplementation(() => new Promise(resolve => { provide = resolve; }));
    const controller = new AbortController();
    const pending = requestUmrahPosition({ consent: true, signal: controller.signal });
    controller.abort();
    expect(await pending).toEqual({ status: "cancelled", boundaryGuidanceAvailable: false });
    provide(fresh());
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.position).toHaveBeenCalledTimes(1);
  });

  it("does not store or send coordinates, and notification refusal cannot block manual location", async () => {
    const fetch = vi.fn(), setItem = vi.fn(), notificationRequest = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("localStorage", { setItem, getItem: vi.fn() });
    vi.stubGlobal("Notification", { permission: "denied", requestPermission: notificationRequest });
    expect((await requestUmrahPosition({ consent: true })).status).toBe("available");
    expect(fetch).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(notificationRequest).not.toHaveBeenCalled();
  });
});
