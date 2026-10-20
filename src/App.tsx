import { useEffect, useState, useRef } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import {
  MoonStar,
  Clock3,
  Plane,
  BookOpen,
  Compass,
  MapPin,
  Settings2,
  ShieldCheck,
  WifiOff,
  Menu,
  X,
  Globe,
  RefreshCw,
} from "lucide-react";
import { useApp, useAnalytics, readLocal, writeLocal } from "./store";
import { locales, type Locale, type Content } from "../shared/schema";
import { languageNames, type MessageKey } from "./i18n";
import { mediaUrl } from "./api";
import { Onboarding } from "./components/Onboarding";
import { Reader } from "./components/Reader";
import { Banner } from "./components/ui";
import {
  PrayerPage,
  EventsPage,
  SunnahPage,
  AdhkarPage,
  QiblaPage,
  MosquesPage,
} from "./pages/PublicPages";
import { SettingsPage, Account } from "./pages/Settings";

import { sectionAvailable, travelEnabled } from "./features";
import { NotificationInbox } from "./components/NotificationInbox";
import { ThemeToggle } from "./components/ThemeToggle";

import { version as appVersion } from "../package.json";
const icons = {
  prayer: Clock3,
  calendar: Plane,
  events: MoonStar,
  sunnah: BookOpen,
  qibla: Compass,
  adhkar: MoonStar,
  mosques: MapPin,
  settings: Settings2,
  admin: ShieldCheck,
};
const initial = () => {
  const requested = location.pathname.startsWith("/admin")
    ? "admin"
    : new URLSearchParams(location.search).get("section") || "prayer";
  return sectionAvailable(requested) ? requested : "prayer";
};
type ReaderHistory = {
  namozReader?: { sequenceIds: string[] };
  namozPage?: { category?: string };
};
export function App() {
  const { t, prefs, setPrefs, prayer, data, online, refresh, syncError } =
    useApp();
  const [section, setSection] = useState(initial);
  const [category, setCategory] = useState<string | undefined>(
    () => (history.state as ReaderHistory | null)?.namozPage?.category,
  );
  const [setup, setSetup] = useState(
    () => !location.pathname.startsWith("/admin") && !prayer,
  );
  const [reader, setReader] = useState<Content | null>(null);
  const [readerSequence, setReaderSequence] = useState<Content[]>([]);
  const [nav, setNav] = useState(false);
  const [account, setAccount] = useState(
    location.pathname === "/delete-account",
  );
  const autoShown = useRef(false);
  const readerOpen = useRef(false);
  const readerClosing = useRef(false);
  useAnalytics(section === "admin" ? "settings" : section);
  const navigate = (s: string) => {
    const [requested, cat] = s.split(":");
    const page = sectionAvailable(requested) ? requested : "prayer";
    setSection(page);
    setCategory(cat);
    setNav(false);
    setReader(null);
    setReaderSequence([]);
    readerOpen.current = false;
    readerClosing.current = false;
    const url = page === "admin" ? "/admin" : `/?section=${page}`;
    history.pushState({ namozPage: { category: cat } }, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openReader = (c: Content, sequence?: Content[]) => {
    if (readerClosing.current) return;
    const replacing = readerOpen.current;
    if (!replacing) {
      // Keep the list's history entry intact, including a tab selected in the
      // page itself. Closing a reader must return here, not to the prior page.
      history.replaceState(
        { ...history.state, namozPage: { category: section === "adhkar" && sequence?.length ? c.categoryId : category } },
        "",
        location.href,
      );
    }
    readerOpen.current = true;
    setReaderSequence(sequence || []);
    setReader(c);
    const seen = readLocal<string[]>("namoz.seen-sunnahs", []);
    if (!seen.includes(c.id)) {
      writeLocal("namoz.seen-sunnahs", [...seen, c.id]);
    }
    const url = new URL(location.href);
    url.searchParams.delete("notification");
    url.searchParams.set("material", c.id);
    const state: ReaderHistory = { ...history.state };
    if (!replacing || state.namozReader) {
      state.namozReader = { sequenceIds: (sequence || []).map(item => item.id) };
    }
    // Next/previous cards share one history entry. A direct material link has
    // no list entry behind it, so do not invent a back destination for it.
    if (replacing) history.replaceState(state, "", url.pathname + url.search + url.hash);
    else history.pushState(state, "", url.pathname + url.search + url.hash);
  };
  const closeReader = () => {
    if (readerClosing.current) return;
    if ((history.state as ReaderHistory | null)?.namozReader) {
      readerClosing.current = true;
      history.back();
      return;
    }
    readerOpen.current = false;
    setReader(null);
    setReaderSequence([]);
    const url = new URL(location.href);
    url.searchParams.delete("material");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  };
  const closeReaderRef = useRef(closeReader);
  closeReaderRef.current = closeReader;
  useEffect(() => {
    if (!reader || Capacitor.getPlatform() !== "android") return;
    let disposed = false;
    let listener: PluginListenerHandle | undefined;
    // Only intercept Android Back while reading. Outside the reader Capacitor
    // retains its existing back-button behavior.
    void NativeApp.addListener("backButton", () => closeReaderRef.current()).then(handle => {
      if (disposed) void handle.remove();
      else listener = handle;
    }).catch(() => {});
    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, [!!reader]);
  useEffect(() => {
    const pop = () => {
      setSection(initial());
      const state = history.state as ReaderHistory | null;
      setCategory(state?.namozPage?.category);
      const id = new URLSearchParams(location.search).get("material");
      const content = data.content.find((c) => c.id === id) || null;
      readerOpen.current = !!content;
      readerClosing.current = false;
      setReader(content);
      setReaderSequence((state?.namozReader?.sequenceIds || []).flatMap(id => {
        const item = data.content.find(c => c.id === id);
        return item ? [item] : [];
      }));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [data.content]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("material");
    if (new URLSearchParams(location.search).has("notification")) return;
    if (id) {
      const c = data.content.find((c) => c.id === id);
      if (c) {
        readerOpen.current = true;
        setReader(c);
      }
      return;
    }
    if (
      !setup &&
      !reader &&
      !autoShown.current &&
      section !== "admin" &&
      prefs.fullScreenNewSunnah
    ) {
      const seen = readLocal<string[]>("namoz.seen-sunnahs", []);
      const c = data.content.find(
        (c) => c.kind === "sunnah" && !seen.includes(c.id),
      );
      if (c) {
        autoShown.current = true;
        openReader(c);
      }
    }
  }, [data.content, setup]);
  useEffect(() => {
    document.title = `${t(section in icons ? (section as MessageKey) : "prayer")} · ${data.appearance.brandName}`;
  }, [section, prefs.locale, data.appearance.brandName]);
  const props = { onSetup: () => setSetup(true), onRead: openReader };
  return (
    <div
      className="app-shell"
      style={
        {
          "--brand": data.appearance.primaryColor,
          "--gold": data.appearance.accentColor,
        } as React.CSSProperties
      }
    >
      <button
        className="mobile-nav-toggle icon-button"
        aria-label="Menu"
        onClick={() => setNav(!nav)}
      >
        {nav ? <X /> : <Menu />}
      </button>
      {nav && (
        <button
          className="nav-backdrop"
          aria-label={t("close")}
          onClick={() => setNav(false)}
        />
      )}
      <aside className={`sidebar ${nav ? "open" : ""}`}>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("prayer");
          }}
        >
          {data.appearance.logoUrl ? (
            <img src={mediaUrl(data.appearance.logoUrl)} alt="" />
          ) : (
            <span className="brand-icon">
              <MoonStar size={27} />
            </span>
          )}
          <strong>{data.appearance.brandName}</strong>
        </a>
        <nav>
          {(data.appearance.sectionOrder.includes("events")
            ? data.appearance.sectionOrder
            : data.appearance.sectionOrder.flatMap((id) =>
                id === "calendar" ? [id, "events" as const] : [id],
              )
          )
            .filter(
              (id) =>
                sectionAvailable(id) &&
                !data.appearance.hiddenSections.includes(id as any),
            )
            .map((id) => {
              const Icon = icons[id];
              return (
                <button
                  className={section === id ? "active" : ""}
                  onClick={() => navigate(id)}
                  key={id}
                >
                  <Icon size={20} />
                  <span>{t(id)}</span>
                </button>
              );
            })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={section === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={20} />
            {t("settings")}
          </button>

          <div className="sidebar-foot">
            <span className={`connection-dot ${online ? "" : "offline"}`} />
            {t(online ? "online" : "offline")}
            <span>v{appVersion}</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            {data.appearance.brandName}
            <span>/</span>
            {t(section in icons ? (section as MessageKey) : "prayer")}
          </span>
          <div className="topbar-actions">
            {!online && <WifiOff size={17} />}
            <button
              className="icon-button"
              title={t("refresh")}
              aria-label={t("refresh")}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} />
            </button>
            <Globe size={16} />
            <select
              aria-label={t("language")}
              value={prefs.locale}
              onChange={(e) => setPrefs({ locale: e.target.value as Locale })}
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {languageNames[l]}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main id="main">
          <div className="page-utilities">
            <ThemeToggle />
            <NotificationInbox onRead={openReader} />
          </div>
          {syncError && <Banner>{t("serverUnavailable")}</Banner>}
          {section === "prayer" ? (
            <PrayerPage {...props} onSection={navigate} />

          ) : section === "events" ? (
            <EventsPage onRead={openReader} />
          ) : section === "sunnah" ? (
            <SunnahPage onRead={openReader} />
          ) : section === "qibla" ? (
            <QiblaPage onSetup={props.onSetup} />
          ) : section === "adhkar" ? (
            <AdhkarPage initialCategory={category} onRead={openReader} />
          ) : section === "mosques" ? (
            <MosquesPage {...props} />

          ) : (
            <SettingsPage onSetup={props.onSetup} />
          )}
        </main>
        <footer className="app-footer">
          <span>{data.appearance.brandName}</span>
          <button className="text-button" onClick={() => navigate("settings")}>
            {t("privacy")}
          </button>
        </footer>
      </div>
      {setup && <Onboarding onClose={() => setSetup(false)} />}{" "}
      {reader && (
        <Reader
          content={reader}
          sequence={readerSequence.length ? readerSequence : data.content.filter(c => ["dhikr", "dua"].includes(c.kind) && c.categoryId === reader.categoryId).sort((a,b) => a.order-b.order || a.id.localeCompare(b.id))}
          onNavigate={(c) => openReader(c, readerSequence)}
          onClose={closeReader}
        />
      )}
      {account && <Account onClose={() => setAccount(false)} />}
    </div>
  );
}
