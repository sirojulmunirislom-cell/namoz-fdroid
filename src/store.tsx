import { analyticsMetadata } from "./analytics-preferences";
import { APP_NAME } from "./app-name";
import { applyTheme, resolveTheme } from "./theme";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  hasTranslation,
  PrayerSettings,
  UserPreferences,
  defaultPreferences,
  defaultAppearance,
  type Content,
  type Category,
  Appearance,
  type Mosque,
} from "../shared/schema";
import { translate, type MessageKey } from "./i18n";
import { api, send, API_BASE } from "./api";
import bundledContent from "./bundled-content.json";
import { Content as ContentSchema } from "../shared/schema";
import { contentCacheKey, initialContentSnapshot } from "./content-cache";
const bundledEnabled = import.meta.env.VITE_BUNDLED_CONTENT === "1";
const cacheKey = contentCacheKey(API_BASE, bundledEnabled);
import { Capacitor } from "@capacitor/core";
import { updateWidgets, syncNativeLocale } from "./native";
import { syncJamaatReminders } from "./jamaat-notifications";
import { syncCalendarReminders, syncWebPushPreferences } from "./notifications";
type Snapshot = {
  appearance: Appearance;
  categories: Category[];
  content: Content[];
  mosques: Mosque[];
  months: {
    region: string;
    year: number;
    month: number;
    start_date: string;
    source: string;
  }[];
  recommendations: any[];
  serverTime?: string;
  pushPublicKey?: string | null;
  nativePushConfigured?: boolean;
};
const empty: Snapshot = {
  appearance: defaultAppearance,
  categories: [
    {
      id: "morning",
      titles: {
        "uz-Latn": "Tonggi azkorlar",
        "uz-Cyrl": "Тонгги азкорлар",
        ru: "Утренние азкары",
        en: "Morning adhkar",
      },
      window: "morning",
      order: 0,
      enabled: true,
    },
    {
      id: "evening",
      titles: {
        "uz-Latn": "Kechki azkorlar",
        "uz-Cyrl": "Кечки азкорлар",
        ru: "Вечерние азкары",
        en: "Evening adhkar",
      },
      window: "evening",
      order: 1,
      enabled: true,
    },
  ],
  content: bundledEnabled ? bundledContent.map(c=>ContentSchema.parse(c)) : [],
  mosques: [],
  months: [],
  recommendations: [],
};
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing and full storage must not crash the app. */
  }
}
type AppState = {
  prefs: UserPreferences;
  setPrefs: (p: Partial<UserPreferences>) => void;
  prayer: PrayerSettings | null;
  setPrayer: (p: PrayerSettings | null) => void;
  data: Snapshot;
  refresh: () => Promise<void>;
  online: boolean;
  syncError: string;
  pushSyncError: boolean;
  t: (k: MessageKey) => string;
  user: any;
  setUser: (u: any) => void;
  now: Date;
};
const Context = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [prefs, setPreferences] = useState(() => {
    const p = UserPreferences.safeParse(readLocal("namoz.preferences", {}));
    return p.success ? p.data : defaultPreferences;
  });
  const [prayer, setPrayerState] = useState<PrayerSettings | null>(() => {
    const p = PrayerSettings.safeParse(readLocal("namoz.prayer", null));
    return p.success ? p.data : null;
  });
  const [data, setData] = useState<Snapshot>(() => {
    const cached = initialContentSnapshot(readLocal<Snapshot|null>(cacheKey, null), empty);
    return { ...cached, appearance: Appearance.parse(cached.appearance) };
  });
  const [syncError, setSyncError] = useState("");
  const [pushSyncError, setPushSyncError] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState<any>(null);
  const [now, setNow] = useState(new Date());
  const refresh = useCallback(async () => {
    try {
      const d = await api<Snapshot>("/bootstrap");
      d.appearance = Appearance.parse(d.appearance);
      setData(d);
      writeLocal(cacheKey, d);
      setSyncError("");
    } catch (e) {
      setSyncError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    api("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {});
    const on = () => {
        setOnline(true);
        void refresh();
      },
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const timer = setInterval(() => setNow(new Date()), 1000);
    const syncTimer = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible")
        void refresh();
    }, 60000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(timer);
      clearInterval(syncTimer);
    };
  }, [refresh]);
  useEffect(() => {
    void syncNativeLocale(prefs.locale).catch(() => {});
    void updateWidgets(prayer, prefs.locale, APP_NAME).catch(
      () => {},
    );
  }, [prayer, prefs.locale]);
  useEffect(() => {
    void syncCalendarReminders(
      data.content,
      data.months,
      prayer,
      prefs.locale,
      prefs.calendarNotifications,
      prefs.calendarLeadDays,
    ).catch(() => {});
  }, [
    data.content,
    data.months,
    prayer,
    prefs.locale,
    prefs.calendarNotifications,
    prefs.calendarLeadDays,
  ]);
  const minute = Math.floor(now.getTime() / 60000);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void syncJamaatReminders(data.content, prayer, prefs, data.appearance)
      .then(() => setPushSyncError(false))
      .catch(() => setPushSyncError(true));
  }, [
    data.content,
    prayer,
    prefs.locale,
    data.appearance,
    prefs.jamaatNotifications,
    prefs.jamaatLeadMinutes,
    prefs.jamaatPrayers,
    minute,
  ]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !online) return;
    const token = localStorage.getItem("namoz.push-token");
    if (token)
      void send("/push/native", {
        token,
        locale: prefs.locale,
        platform: Capacitor.getPlatform(),
        topics: prefs.contentNotifications ? ["content"] : [],
      }).catch(() => setPushSyncError(true));
  }, [user?.id, online, prefs.locale, prefs.contentNotifications]);
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !user || !online) return;
    let current = true;
    void syncWebPushPreferences(prefs, prayer, data.pushPublicKey)
      .then(() => syncJamaatReminders(data.content, prayer, prefs, data.appearance))
      .then(() => {
        if (current) setPushSyncError(false);
      })
      .catch(() => {
        if (current) setPushSyncError(true);
      });
    return () => {
      current = false;
    };
  }, [
    user?.id,
    online,
    prefs.locale,
    prefs.contentNotifications,
    prefs.calendarNotifications,
    prefs.calendarLeadDays,
    prefs.jamaatNotifications,
    prefs.jamaatLeadMinutes,
    prefs.jamaatPrayers,
    minute,
    prayer,
    data.pushPublicKey,
    data.serverTime,
  ]);
  const setPrefs = (v: Partial<UserPreferences>) =>
    setPreferences((old) => {
      const p = UserPreferences.parse({ ...old, ...v });
      writeLocal("namoz.preferences", p);
      return p;
    });
  const setPrayer = (value: PrayerSettings | null) => {
    const p = value ? PrayerSettings.parse(value) : null;
    writeLocal("namoz.prayer", p);
    setPrayerState(p);
  };
  useEffect(() => {
    document.documentElement.lang = prefs.locale;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyTheme(resolveTheme(prefs.theme, mq.matches));
    apply();
    mq.addEventListener("change", apply);
    document.documentElement.style.setProperty(
      "--font-scale",
      String(prefs.fontScale),
    );
    return () => mq.removeEventListener("change", apply);
  }, [prefs.locale, prefs.theme, prefs.fontScale]);
  useEffect(() => {
    if (user && prayer)
      void send(
        "/account",
        {
          locale: prefs.locale,
          city: prayer.location.name,
          country: prayer.location.country,
        },
        "PUT",
      ).catch(() => {});
  }, [user?.id, prefs.locale, prayer]);
  return (
    <Context.Provider
      value={{
        prefs,
        setPrefs,
        prayer,
        setPrayer,
        data: {
          ...data,
          content: data.content.filter((c) => hasTranslation(c, prefs.locale)),
        },
        refresh,
        online,
        syncError,
        pushSyncError,
        t: (k) => translate(prefs.locale, k),
        user,
        setUser,
        now,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const c = useContext(Context);
  if (!c) throw new Error("App provider required");
  return c;
}
export function useAnalytics(section: string) {
  const { prefs } = useApp();
  useEffect(() => {
    // Umrah progress, route choices and location stay in this device-only mode.
    if (!prefs.analytics || section === "umrah") return;
    let start = Date.now();
    let active = document.visibilityState === "visible";
    const emit = async () => {
      const elapsed = Math.min(300, Math.floor((Date.now() - start) / 1000));
      start = Date.now();
      if (
        !active ||
        elapsed < 1 ||
        !readLocal("namoz.preferences", defaultPreferences).analytics
      )
        return;
      const day = new Date().toISOString().slice(0, 10);
      let seed = sessionStorage.getItem(`namoz.analytics.${day}`);
      if (!seed) {
        seed = crypto.randomUUID();
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith("namoz.analytics."))
            sessionStorage.removeItem(key);
        }
        sessionStorage.setItem(`namoz.analytics.${day}`, seed);
      }
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(seed),
      );
      const dayId = Array.from(new Uint8Array(hash))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      const latest = UserPreferences.parse(readLocal("namoz.preferences", defaultPreferences));
      if (!latest.analytics) return;
      void api("/analytics", {
        method: "POST",
        credentials: "omit",
        keepalive: true,
        body: JSON.stringify({
          consent: true,
          ...analyticsMetadata(latest),
          section,
          platform: Capacitor.getPlatform(),
          duration: elapsed,
          dayId,
          hour: new Date().getHours(),
        }),
      }).catch(() => {});
    };
    const visibility = () => {
      void emit();
      active = document.visibilityState === "visible";
      start = Date.now();
    };
    const timer = setInterval(() => void emit(), 60_000);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      void emit();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [section, prefs.analytics, prefs.locale, prefs.audienceStatistics, prefs.audienceAgeGroup, prefs.audienceGender]);
}
