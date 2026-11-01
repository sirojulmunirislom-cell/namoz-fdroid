import { Capacitor } from "@capacitor/core";
import {
  checkLocationPermissions,
  currentDevicePosition,
  requestLocationPermissions,
} from "../native-location";

export type UmrahLocationStatus = "available" | "consent-required" | "denied" | "unsupported" | "timeout" | "unavailable" | "stale" | "invalid" | "cancelled";
export interface UmrahLocationResult {
  status: UmrahLocationStatus;
  // There is deliberately no boundary or nearest-miqat calculation. Coordinates
  // alone do not establish the route's miqat, crossing, or completion of a rite.
  boundaryGuidanceAvailable: false;
  position?: { latitude: number; longitude: number; accuracy: number; timestamp: number };
}

export const UMRAH_POSITION_MAX_AGE = 60_000;
const POSITION_DEADLINE = 23_000;

function result(status: UmrahLocationStatus): UmrahLocationResult {
  return { status, boundaryGuidanceAvailable: false };
}

async function deadline<T>(operation: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject({ code: "OS-PLUG-GLOC-0010" }), ms);
        onAbort = () => reject({ code: "UMRAH_ABORTED" });
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) onAbort();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

function errorStatus(error: unknown): UmrahLocationStatus {
  const code = String((error as { code?: unknown })?.code ?? "");
  if (code === "UMRAH_ABORTED") return "cancelled";
  if (["1", "OS-PLUG-GLOC-0003"].includes(code)) return "denied";
  if (["3", "OS-PLUG-GLOC-0010"].includes(code)) return "timeout";
  if (["UNIMPLEMENTED", "UNAVAILABLE", "NOT_IMPLEMENTED"].includes(code)) return "unsupported";
  return "unavailable";
}

/** Call only from an explicit, mode-specific user action. No storage or network. */
export async function requestUmrahPosition(options: { consent: boolean; signal?: AbortSignal }): Promise<UmrahLocationResult> {
  if (!options.consent) return result("consent-required");
  if (options.signal?.aborted) return result("cancelled");
  try {
    if (Capacitor.isNativePlatform()) {
      let permissions = await deadline(checkLocationPermissions(), 10_000, options.signal);
      if (options.signal?.aborted) return result("cancelled");
      if (permissions.location !== "granted" && permissions.coarseLocation !== "granted") {
        permissions = await deadline(requestLocationPermissions(false), 60_000, options.signal);
      }
      if (options.signal?.aborted) return result("cancelled");
      if (permissions.location !== "granted" && permissions.coarseLocation !== "granted") return result("denied");
    } else if (typeof navigator === "undefined" || !navigator.geolocation) {
      return result("unsupported");
    }
    if (options.signal?.aborted) return result("cancelled");
    const fix = await deadline(currentDevicePosition({
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    }), POSITION_DEADLINE, options.signal);
    if (options.signal?.aborted) return result("cancelled");
    const { latitude, longitude, accuracy } = fix.coords ?? {};
    const timestamp = fix.timestamp;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        !Number.isFinite(accuracy) || accuracy <= 0 ||
        !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now() + 5_000) return result("invalid");
    if (Date.now() - timestamp > UMRAH_POSITION_MAX_AGE) return result("stale");
    return {
      ...result("available"),
      position: { latitude, longitude, accuracy, timestamp },
    };
  } catch (error) {
    return result(errorStatus(error));
  }
}
