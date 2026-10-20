import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const mocks = vi.hoisted(() => ({
  native: vi.fn(),
  check: vi.fn(),
  request: vi.fn(),
  position: vi.fn(),
  platform: vi.fn(),
  androidCheck: vi.fn(),
  androidRequest: vi.fn(),
  androidPosition: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.native, getPlatform: mocks.platform },
  CapacitorHttp: { get: vi.fn() },
  registerPlugin: () => ({
    checkPermissions: mocks.androidCheck,
    requestPermissions: mocks.androidRequest,
    getCurrentPosition: mocks.androidPosition,
  }),
}));
import {
  devicePosition,
  locationErrorKey,
  withDeadline,
  searchWorldCities,
  resolvePosition,
} from "../src/location";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.native.mockReturnValue(true);
  mocks.platform.mockReturnValue("android");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("device location", () => {
  it("uses Android system positioning and approximate permission without Google services", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.androidCheck.mockResolvedValue({
      location: "denied",
      coarseLocation: "granted",
    });
    mocks.androidPosition.mockResolvedValue({
      coords: { latitude: 38.72, longitude: 35.49 },
    });
    expect((await devicePosition()).coords.latitude).toBe(38.72);
    expect(mocks.androidRequest).not.toHaveBeenCalled();
    expect(mocks.androidCheck).toHaveBeenCalledOnce();
  });
  it("does not bypass an Android system permission denial", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.androidCheck.mockResolvedValue({
      location: "prompt",
      coarseLocation: "prompt",
    });
    mocks.androidRequest.mockResolvedValue({
      location: "denied",
      coarseLocation: "denied",
    });
    await expect(devicePosition()).rejects.toMatchObject({
      code: "OS-PLUG-GLOC-0003",
    });
    expect(mocks.androidPosition).not.toHaveBeenCalled();
  });
  it("keeps disabled GPS distinct from a timeout on AOSP", async () => {
    mocks.platform.mockReturnValue("android");
    mocks.androidCheck.mockResolvedValue({
      location: "granted",
      coarseLocation: "granted",
    });
    mocks.androidPosition.mockRejectedValue({ code: "OS-PLUG-GLOC-0007" });
    await expect(devicePosition()).rejects.toMatchObject({
      code: "OS-PLUG-GLOC-0007",
    });
    expect(mocks.androidPosition).toHaveBeenCalledTimes(1);
  });
  it("accepts approximate permission without asking again", async () => {
    mocks.androidCheck.mockResolvedValue({
      location: "denied",
      coarseLocation: "granted",
    });
    mocks.androidPosition.mockResolvedValue({
      coords: { latitude: 38.72, longitude: 35.49 },
    });
    expect((await devicePosition()).coords.latitude).toBe(38.72);
    expect(mocks.androidRequest).not.toHaveBeenCalled();
  });
  it("requests permission then rejects denial without fetching location", async () => {
    mocks.androidCheck.mockResolvedValue({
      location: "prompt",
      coarseLocation: "prompt",
    });
    mocks.androidRequest.mockResolvedValue({
      location: "denied",
      coarseLocation: "denied",
    });
    await expect(devicePosition()).rejects.toMatchObject({
      code: "OS-PLUG-GLOC-0003",
    });
  });
  it("retries a timed out GPS request using approximate network positioning", async () => {
    mocks.androidCheck.mockResolvedValue({ location: "granted" });
    mocks.androidPosition
      .mockRejectedValueOnce({ code: "OS-PLUG-GLOC-0010" })
      .mockResolvedValueOnce({ coords: { latitude: 38.72 } });
    await devicePosition();
    expect(mocks.androidPosition.mock.calls[0][0].enableHighAccuracy).toBe(true);
    expect(mocks.androidPosition.mock.calls[1][0].enableHighAccuracy).toBe(false);
  });
  it("bounds a native call that never resolves", async () => {
    vi.useFakeTimers();
    const result = expect(
      withDeadline(new Promise(() => {}), 200),
    ).rejects.toMatchObject({ code: "OS-PLUG-GLOC-0010" });
    await vi.advanceTimersByTimeAsync(201);
    await result;
  });
  it("explains disabled services and permission errors correctly", () => {
    expect(locationErrorKey({ code: 1 })).toBe("locationDenied");
    expect(locationErrorKey({ code: "OS-PLUG-GLOC-0007" })).toBe(
      "locationDisabled",
    );
    expect(locationErrorKey({ code: "OS-PLUG-GLOC-0015" })).toBe(
      "locationServicesError",
    );
  });
  it("searches beyond the local directory, preserving country and timezone", async () => {
    mocks.native.mockReturnValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              {
                name: "Osaka",
                country: "Japan",
                latitude: 34.69,
                longitude: 135.5,
                timezone: "Asia/Tokyo",
              },
              { name: "Invalid", latitude: 300, longitude: 0 },
            ],
          }),
        ),
      ),
    );
    expect(await searchWorldCities("Osaka", "en")).toEqual([
      {
        name: "Osaka",
        country: "Japan",
        latitude: 34.69,
        longitude: 135.5,
        timezone: "Asia/Tokyo",
      },
    ]);
  });
  it("reverse geocoding keeps actual coordinates", async () => {
    mocks.native.mockReturnValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            lat: "0",
            lon: "0",
            address: { city: "Кайсери", country: "Турция" },
          }),
        ),
      ),
    );
    const result = await resolvePosition(
      38.72251,
      35.48751,
      "ru",
      "Местоположение",
    );
    expect(result).toMatchObject({
      named: true,
      location: {
        name: "Кайсери",
        country: "Турция",
        latitude: 38.72251,
        longitude: 35.48751,
        timezone: "Europe/Istanbul",
      },
    });
  });
});
