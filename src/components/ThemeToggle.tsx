import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useApp } from "../store";
import { resolveTheme } from "../theme";

/** A quick day/night switch. The full System option remains in Settings. */
export function ThemeToggle() {
  const { prefs, setPrefs, t } = useApp();
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dark = resolveTheme(prefs.theme, systemDark) === "dark";
  const label = t(dark ? "themeLightAction" : "themeDarkAction");
  return <button className="icon-button theme-toggle" aria-label={label} title={label}
    onClick={() => setPrefs({ theme: dark ? "light" : "dark" })}>
    {dark ? <Sun size={21} aria-hidden="true" /> : <Moon size={21} aria-hidden="true" />}
  </button>;
}
