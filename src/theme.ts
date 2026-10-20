import { syncNativeTheme } from "./native-device";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  // Keep the pre-React background and browser/PWA chrome in the same mode.
  const background = theme === "dark" ? "#111d19" : "#f3f5f2";
  root.style.backgroundColor = background;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
  void syncNativeTheme(theme);
}
