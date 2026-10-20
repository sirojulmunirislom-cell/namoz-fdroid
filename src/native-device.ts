import { Capacitor, registerPlugin } from "@capacitor/core";

const Device = registerPlugin<{
  getCapabilities(): Promise<{ googlePlayServicesAvailable: boolean }>;
  setAppearance(options: { theme: "light" | "dark" }): Promise<void>;
}>("NamozDevice");

export async function syncNativeTheme(theme: "light" | "dark"): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await Device.setAppearance({ theme });
  } catch {
    // An older installed APK may not expose this method yet. Its web content
    // still uses the selected theme; appearance never blocks the app opening.
  }
}

export async function nativeCloudPushAvailable(): Promise<boolean> { return false; }
