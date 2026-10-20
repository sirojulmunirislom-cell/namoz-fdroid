import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { DateTime } from "luxon";
import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Cloud,
  CloudRain,
  Snowflake,
  CloudLightning,
  CloudFog,
  MapPin,
  ArrowUpRight,
  Compass,
  CalendarDays,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Navigation,
  LocateFixed,
  Info,
  RefreshCw,
} from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useApp, readLocal, writeLocal } from "../store";
import { adhkarPreviewEnabled } from "../features";
import { readCount, readingDay, nextUnread } from "../adhkar-progress";
import { Content as ContentSchema } from "../../shared/schema";
import { loadMosques } from "../mosques";
import { loadWeather } from "../weather";
import { weatherAtTime } from "../../shared/weather";
import { startMosqueTrip } from "../native";
import { LocationMap } from "../components/LocationMap";
import { dateLabel, monthLabel, weekdayLabel } from "../dates";
import {
  getPrayerDay,
  nextPrayer,
  prayerKeys,
  activeDhikrWindow,
  qiblaDirection,
  angularDistance,
  hijriParts,
  voluntaryFastAllowed,
  distanceKm,
  type PrayerKey,
} from "../../shared/prayer";
import { eventsOnDate, eventTimeline, hijriDate } from "../../shared/calendar";
import type { Content, Mosque, Location } from "../../shared/schema";
import { Empty, Banner, Spinner, Modal } from "../components/ui";
import type { MessageKey } from "../i18n";
const prayerIcons = {
  fajr: Sunrise,
  sunrise: Sun,
  dhuhr: Sun,
  asr: Sunset,
  maghrib: Sunset,
  isha: Moon,
};
export const weatherKind = (code: number): MessageKey =>
  code === 0
    ? "clear"
    : code <= 3
      ? "cloudy"
      : code <= 48
        ? "fog"
        : code <= 67
          ? "rain"
          : code <= 77
            ? "snow"
            : code <= 82
              ? "rain"
              : code <= 86
                ? "snow"
                : "storm";
function WeatherIcon({ code, size = 22 }: { code: number; size?: number }) {
  const Icon = {
    clear: Sun,
    cloudy: Cloud,
    rain: CloudRain,
    snow: Snowflake,
    fog: CloudFog,
    storm: CloudLightning,
  }[weatherKind(code) as "clear"];
  return <Icon size={size} />;
}
export function SetupCard({ onSetup }: { onSetup: () => void }) {
  const { t } = useApp();
  return (
    <div className="setup-card">
      <div className="setup-ornament">
        <Compass size={64} strokeWidth={1} />
      </div>
      <div>
        <span className="eyebrow">01 / NAMOZ</span>
        <h2>{t("setupTitle")}</h2>
        <p>{t("setupBody")}</p>
        <button className="button gold" onClick={onSetup}>
          {t("startSetup")}
        </button>
      </div>
    </div>
  );
}
export function PrayerPage({
  notificationControl,
  onSetup,
  onSection,
  onRead,
}: {
  notificationControl?: ReactNode;
  onSetup: () => void;
  onSection: (s: string) => void;
  onRead: (c: Content) => void;
}) {
  const { t, prefs, prayer, data, now, online } = useApp();
  const key = prayer
    ? `${prayer.location.latitude},${prayer.location.longitude}`
    : "";
  const [weather, setWeather] = useState<{ key: string; value: any } | null>(
    () => readLocal("namoz.weather", null),
  );
  const [weatherRefresh, setWeatherRefresh] = useState(0);
  const forceWeatherRefresh = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!prayer) return;
    setBusy(true);
    const force = forceWeatherRefresh.current;
    forceWeatherRefresh.current = false;
    loadWeather(prayer.location.latitude, prayer.location.longitude, force)
      .then((value) => {
        if (!cancelled) {
          const out = { key, value };
          setWeather(out);
          writeLocal("namoz.weather", out);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("weatherMissing"));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    key,
    online,
    weatherRefresh,
    Math.floor(now.getTime() / (30 * 60_000)),
    prayer
      ? DateTime.fromJSDate(now).setZone(prayer.location.timezone).toISODate()
      : null,
    data.serverTime,
  ]);
  const w = weather?.key === key ? weather.value : null;
  const currentDate = prayer
    ? DateTime.fromJSDate(now).setZone(prayer.location.timezone).toISODate()!
    : undefined;
  const day = getPrayerDay(prayer, currentDate);
  const next = prayer ? nextPrayer(prayer, now) : null;
  const active = activeDhikrWindow(prayer, now);
  const seconds = next
    ? Math.max(
        0,
        Math.floor((new Date(next.time).getTime() - now.getTime()) / 1000),
      )
    : 0;
  const countdown = `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const format = (iso: string) =>
    DateTime.fromISO(iso).setZone(prayer!.location.timezone).toFormat("HH:mm");
  const hourWeather = (iso: string) => (w ? weatherAtTime(w, iso) : null);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("today")} ·{" "}
            {dateLabel(now, prefs.locale, prayer?.location.timezone)}
          </span>
          <h1>{t("prayer")}</h1>
        </div>
        <div className="prayer-heading-actions">
        {notificationControl}
        {prayer && (
          <button className="location-chip" onClick={onSetup}>
            <MapPin size={17} />
            {prayer.location.name}
          </button>
        )}
        </div>
      </div>
      {!prayer ? (
        <SetupCard onSetup={onSetup} />
      ) : !day || !next ? (
        <Banner kind="error">
          {t("setupBody")}{" "}
          <button className="text-button" onClick={onSetup}>
            {t("startSetup")}
          </button>
        </Banner>
      ) : (
        <div className="prayer-hero">
          <div className="hero-arc" aria-hidden="true" />
          <div>
            <span className="eyebrow">{t("nextPrayer")}</span>
            <h2>{t(next.key)}</h2>
            <div className="next-time">{format(next.time)}</div>
            <p>
              <MapPin size={14} />
              {prayer.location.name} · {prayer.location.timezone}
            </p>
          </div>
          <div className="countdown">
            <span>{t("remaining")}</span>
            <strong>{countdown}</strong>
            <span className="hero-date">
              {DateTime.fromISO(next.time)
                .setZone(prayer.location.timezone)
                .toFormat("dd.MM.yyyy")}
            </span>
          </div>
        </div>
      )}
      <div className="prayer-cards">
        {prayerKeys.map((k) => {
          const Icon = prayerIcons[k],
            hw = day ? hourWeather(day.times[k]) : null;
          return (
            <article
              className={`prayer-card ${next?.key === k ? "current" : ""}`}
              key={k}
            >
              <div className="prayer-orbit">
                {hw ? (
                  <WeatherIcon code={hw.code} size={25} />
                ) : (
                  <Icon size={25} strokeWidth={1.5} />
                )}
              </div>
              <span>{t(k)}</span>
              <strong>{day ? format(day.times[k]) : "—"}</strong>
              {hw ? (
                <small>
                  {t(weatherKind(hw.code))} · {Math.round(hw.temperature)}°
                </small>
              ) : (
                <small>{day ? "—" : t("startSetup")}</small>
              )}
            </article>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section className="panel weather-panel">
          <div className="section-heading">
            <h2>{t("weather")}</h2>
            <button
              className="icon-button"
              aria-label={t("refreshWeather")}
              disabled={busy || !prayer}
              onClick={() => {
                forceWeatherRefresh.current = true;
                setWeatherRefresh((v) => v + 1);
              }}
            >
              {busy ? <Spinner /> : <RefreshCw size={20} />}
            </button>
          </div>
          {w ? (
            <>
              <div className="weather-current">
                <WeatherIcon code={w.current.weather_code} size={48} />
                <strong>{Math.round(w.current.temperature_2m)}°</strong>
                <span>{t(weatherKind(w.current.weather_code))}</span>
              </div>
              {next && (hourWeather(next.time)?.rain ?? 0) >= 40 && (
                <p className="weather-tip">{t("umbrella")}</p>
              )}
              <small className="muted">
                {t("updated")}:{" "}
                {DateTime.fromISO(w.fetchedAt)
                  .setZone(prayer?.location.timezone)
                  .toFormat("dd.MM HH:mm")}
              </small>
              {(!!error ||
                !online ||
                Date.now() - new Date(w.fetchedAt).getTime() >
                  2 * 3600_000) && <p className="stale">{t("stale")}</p>}
              <a
                className="attribution"
                href={w.providerUrl || "https://open-meteo.com/"}
                target="_blank"
                rel="noreferrer"
              >
                {w.provider}
              </a>
              {" · "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
            </>
          ) : (
            <div className="weather-empty">
              {busy ? <Spinner /> : <Cloud size={38} strokeWidth={1} />}
              <p>{!prayer ? t("setupBody") : error || t("weatherMissing")}</p>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>{t("adhkar")}</h2>
            <button
              className="icon-button"
              aria-label={t("adhkar")}
              onClick={() => onSection("adhkar")}
            >
              <ArrowUpRight size={20} />
            </button>
          </div>
          {(["morning", "evening"] as const).map((k) => (
            <button
              className={`dhikr-quick ${active === k ? "is-active" : ""}`}
              onClick={() => onSection(`adhkar:${k}`)}
              key={k}
            >
              {k === "morning" ? <Sunrise /> : <Moon />}
              <span>
                <strong>{t(k)}</strong>
                <small>
                  {active === k ? (
                    <>
                      <i className="status-dot" />
                      {t("activeNow")}
                    </>
                  ) : k === "morning" ? (
                    `${t("fajr")} — ${t("sunrise")}`
                  ) : (
                    `${t("asr")} — ${t("maghrib")}`
                  )}
                </small>
              </span>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>{t("sunnah")}</h2>
          <button className="text-button" onClick={() => onSection("sunnah")}>
            {t("read")} <ArrowUpRight size={16} />
          </button>
        </div>
        {data.content.filter((c) => c.kind === "sunnah").length ? (
          <ContentList
            contents={data.content
              .filter((c) => c.kind === "sunnah")
              .slice(0, 2)}
            onRead={onRead}
          />
        ) : (
          <p className="muted empty-inline">{t("emptyContent")}</p>
        )}
      </section>
    </>
  );
}
export function ContentList({
  contents,
  onRead,
}: {
  contents: Content[];
  onRead: (c: Content) => void;
}) {
  const { prefs, t } = useApp();
  return (
    <div className="content-list">
      {contents.map((c, i) => (
        <button className="content-row" key={c.id} onClick={() => onRead(c)}>
          <span className="content-number">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>
            <strong>{c.translations[prefs.locale].title}</strong>
            <small>{c.translations[prefs.locale].body.slice(0, 120)}</small>
          </span>
          <ArrowUpRight size={18} />
        </button>
      ))}
    </div>
  );
}
export function SunnahPage({ onRead }: { onRead: (c: Content) => void }) {
  const { data, t } = useApp();
  const contents = data.content.filter((c) => c.kind === "sunnah");
  return (
    <>
      <div className="page-heading">
        <h1>{t("sunnah")}</h1>
        <BookOpen />
      </div>
      <section className="panel">
        {contents.length ? (
          <ContentList contents={contents} onRead={onRead} />
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
export function AdhkarPage({
  initialCategory,
  onRead,
}: {
  initialCategory?: string;
  onRead: (c: Content, sequence?: Content[]) => void;
}) {
  const { data, prefs, prayer, now, t } = useApp();
  const [selected, setSelected] = useState(initialCategory || "morning");
  const [preview, setPreview] = useState<Content[] | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [, updateProgress] = useState(0);
  useEffect(() => {
    const update = () => updateProgress(v=>v+1);
    window.addEventListener("namoz:reading-progress", update);
    return () => window.removeEventListener("namoz:reading-progress",update);
  }, []);
  useEffect(() => {
    if (initialCategory) setSelected(initialCategory);
  }, [initialCategory]);
  const active = activeDhikrWindow(prayer, now);
  const list = (preview || data.content)
    .filter(
      (c) => ["dhikr", "dua"].includes(c.kind) && c.categoryId === selected,
    )
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const day = readingDay(now, prayer?.location.timezone);
  const resume = nextUnread(list, day, !!preview);
  const completed = list.filter(c=>readCount(c,day,!!preview)>=(c.repetitions??1)).length;
  return (
    <>
      <div className="page-heading">
        <h1>{t("adhkar")}</h1>
        <BookOpen />
      </div>
      {adhkarPreviewEnabled && <div className="adhkar-preview-controls">
        <button className="button secondary" onClick={async()=>{
          if(preview) {setPreview(null);return;}
          try {setPreview((await import("../adhkar-preview.json")).default.map(c=>ContentSchema.parse(c)));setPreviewError(false);}
          catch {setPreviewError(true);}
        }}>{preview ? t("backToList") : t("adhkarPreview")}</button>
        {previewError && <p>{t("retry")}</p>}
        {preview && <Banner>{t("adhkarPreviewNotice")}</Banner>}
      </div>}
      <div className="category-tabs">
        {data.categories
          .filter((c) => c.enabled)
          .sort((a, b) => a.order - b.order)
          .map((c) => (
            <button
              className={c.id === selected ? "active" : ""}
              key={c.id}
              onClick={() => setSelected(c.id)}
            >
              {c.window === "morning" ? (
                <Sunrise size={20} />
              ) : c.window === "evening" ? (
                <Moon size={20} />
              ) : (
                <BookOpen size={20} />
              )}
              <span>
                {c.titles[prefs.locale]}
                {active && c.window === active && (
                  <small>
                    <i className="status-dot" />
                    {t("activeNow")}
                  </small>
                )}
              </span>
            </button>
          ))}
      </div>
      <section className="panel">
        {list.length ? (
          <>
            <div className="adhkar-start">
              <div><strong>{data.categories.find(c=>c.id===selected)?.titles[prefs.locale] || t("adhkar")}</strong><p>{t("readingOrderHelp")}</p></div>
              <span className="badge">{completed} / {list.length}</span>
            </div>
            {!resume && <p className="badge green">{t("readingComplete")}</p>}
            <button className="button primary full" onClick={()=>onRead(resume || list[0],list)}>{t(list.some(c=>readCount(c,day,!!preview)>0) && resume ? "continueReading" : "startReading")}</button>
            <ContentList contents={list} onRead={c=>onRead(c,list)} />
          </>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
export function CalendarPage({ onSetup }: { onSetup: () => void }) {
  const { data, prayer, prefs, t } = useApp();
  const zone =
    prayer?.location.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [month, setMonth] = useState(() =>
    DateTime.now().setZone(zone).startOf("month"),
  );
  const [selected, setSelected] = useState(() =>
    DateTime.now().setZone(zone).toISODate()!,
  );
  const dates = Array.from({ length: 42 }, (_, i) =>
    month.minus({ days: month.weekday - 1 }).plus({ days: i }),
  );
  const events = data.content.filter((c) => c.kind === "event");
  const matching = (date: DateTime) =>
    eventsOnDate(
      DateTime.fromISO(date.toISODate()!, { zone })
        .set({ hour: 12 })
        .toJSDate(),
      zone,
      prayer?.location.country || "",
      data.months,
      events,
    );
  const selectedDay = getPrayerDay(prayer, selected);

  return (
    <>
      <div className="page-heading">
        <h1>{t("calendar")}</h1>
        <CalendarDays />
      </div>
      <Banner>
        <Info size={19} />
        {t("moonNotice")}
      </Banner>
      <div className="calendar-layout">
        <section className="panel">
          <div className="section-heading">
            <button
              className="icon-button"
              aria-label={t("back")}
              onClick={() => setMonth(month.minus({ months: 1 }))}
            >
              <ChevronLeft />
            </button>
            <h2>{monthLabel(month.month, month.year, prefs.locale)}</h2>
            <button
              className="icon-button"
              aria-label={t("next")}
              onClick={() => setMonth(month.plus({ months: 1 }))}
            >
              <ChevronRight />
            </button>
          </div>
          <div className="calendar-grid">
            {Array.from({ length: 7 }, (_, i) =>
              weekdayLabel(i, prefs.locale),
            ).map((d) => (
              <strong className="weekday" key={d}>
                {d}
              </strong>
            ))}
            {dates.map((d) => {
              const { h } = matching(d);
              return (
                <button
                  key={d.toISODate()}
                  className={`calendar-day ${d.month !== month.month ? "outside" : ""} ${selected === d.toISODate() ? "selected" : ""}`}
                  aria-label={d.toISODate()!}
                  onClick={() => setSelected(d.toISODate()!)}
                >
                  <span>{d.day}</span>
                  <small>{h.day}</small>
                </button>
              );
            })}
          </div>
          <p className="calendar-note">{t("expected")} · Hijriy</p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>{DateTime.fromISO(selected).toFormat("dd.MM.yyyy")}</h2>
          </div>
          {!prayer ? (
            <SetupCard onSetup={onSetup} />
          ) : selectedDay ? (
            <>
              <p>
                {prayer.location.name} · {prayer.location.timezone}
              </p>
              <dl className="summary-list calendar-prayers">
                {prayerKeys.map((key) => (
                  <div key={key}>
                    <dt>{t(key)}</dt>
                    <dd>
                      {DateTime.fromISO(selectedDay.times[key])
                        .setZone(selectedDay.timezone)
                        .toFormat("HH:mm")}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <Banner>{t("prayerDateUnavailable")}</Banner>
          )}
        </section>
      </div>
    </>
  );
}
export function EventsPage({ onRead }: { onRead: (c: Content) => void }) {
  const { data, prayer, prefs, t, now } = useApp();
  const zone =
    prayer?.location.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = DateTime.fromJSDate(now).setZone(zone).toISODate()!;
  const region = prayer?.location.country || "";
  const timeline = useMemo(
    () => eventTimeline(data.content, data.months, zone, region, today),
    [data.content, data.months, zone, region, today],
  );
  const cards = (items: typeof timeline.upcoming, past = false) =>
    items.map((item) => {
      const active = !past && item.date === timeline.highlightedDate;
      const lunar = hijriDate(DateTime.fromISO(item.date, {zone}).toJSDate(), zone, region, data.months);
      return (
        <article
          className={`event-card panel ${active ? "event-highlighted" : ""}`}
          key={item.content.id + item.date}
        >
          <div className="section-heading">
            <time dateTime={item.date}>
              {DateTime.fromISO(item.date)
                .setLocale(prefs.locale)
                .toFormat("dd.MM.yyyy")}
            </time>
            <span className="badge">
              {past
                ? t("eventPast")
                : active
                  ? t(item.date === today ? "eventToday" : "eventNearest")
                  : t("eventUpcoming")}
            </span>
          </div>
          <p className="muted">
            {lunar.day}.{lunar.month}.{lunar.year} · {t("hijriCalendar")}<br />
            {t(item.confirmed ? "confirmed" : "expected")}
          </p>
          <ContentList contents={[item.content]} onRead={onRead} />
        </article>
      );
    });
  return (
    <>
      <div className="page-heading">
        <h1>{t("events")}</h1>
        <CalendarDays />
      </div>
      <Banner>{t("moonNotice")} {t("eventSunsetNotice")}</Banner>
      {timeline.upcoming.length ? (
        <div className="event-list">{cards(timeline.upcoming)}</div>
      ) : (
        <Empty title={t("eventsPending")} body={t("eventsPendingBody")} />
      )}
      {!!timeline.past.length && (
        <details className="panel">
          <summary>{t("pastEvents")}</summary>
          {cards(timeline.past, true)}
        </details>
      )}
    </>
  );
}
const NativeCompass = registerPlugin<{
  start(options: { latitude: number; longitude: number }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    name: string,
    callback: (data: { heading: number; accuracy: number }) => void,
  ): Promise<{ remove(): Promise<void> }>;
}>("NamozCompass");
export function QiblaPage({ onSetup }: { onSetup: () => void }) {
  const { prayer, prefs, t } = useApp();
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const wasAligned = useRef(false);
  const lastVibration = useRef(0);
  const cleanup = useRef<(() => void) | null>(null);
  const angle = prayer ? qiblaDirection(prayer.location) : 0;
  const aligned =
    heading !== null &&
    accuracy !== null &&
    accuracy <= 15 &&
    angularDistance(angle, heading) <= 4;
  useEffect(() => {
    if (
      aligned &&
      !wasAligned.current &&
      Date.now() - lastVibration.current > 4000 &&
      prefs.haptics
    ) {
      lastVibration.current = Date.now();
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      wasAligned.current = true;
    }
    if (heading !== null && angularDistance(angle, heading) > 10)
      wasAligned.current = false;
  }, [aligned, heading, angle, prefs.haptics]);
  useEffect(() => () => cleanup.current?.(), []);
  const start = async () => {
    setError("");
    try {
      if (Capacitor.getPlatform() === "android") {
        const listener = await NativeCompass.addListener("heading", (v) => {
          setHeading(v.heading);
          setAccuracy(v.accuracy);
        });
        await NativeCompass.start({
          latitude: prayer!.location.latitude,
          longitude: prayer!.location.longitude,
        });
        cleanup.current = () => {
          void listener.remove();
          void NativeCompass.stop();
        };
      } else {
        const D = DeviceOrientationEvent as any;
        if (D.requestPermission && (await D.requestPermission()) !== "granted")
          throw new Error("Permission denied");
        const listener = (e: DeviceOrientationEvent) => {
          const evt = e as any;
          if (typeof evt.webkitCompassHeading === "number") {
            setHeading(evt.webkitCompassHeading);
            setAccuracy(null);
          } else if (e.absolute && e.alpha !== null) {
            setHeading((360 - e.alpha) % 360);
            setAccuracy(null);
          }
        };
        window.addEventListener("deviceorientationabsolute", listener);
        window.addEventListener("deviceorientation", listener);
        cleanup.current = () => {
          window.removeEventListener("deviceorientationabsolute", listener);
          window.removeEventListener("deviceorientation", listener);
        };
      }
      setEnabled(true);
    } catch {
      setError(t("compassMissing"));
    }
  };
  return (
    <>
      <div className="page-heading">
        <h1>{t("qibla")}</h1>
        <Compass />
      </div>
      {!prayer ? (
        <SetupCard onSetup={onSetup} />
      ) : (
        <section className="panel qibla-panel">
          <div className="qibla-location">
            <MapPin size={17} />
            {prayer.location.name}
            <span className="badge">{angle.toFixed(1)}°</span>
          </div>
          <p className="muted">{t("qiblaHelp")}</p>
          <div className={`compass ${aligned ? "aligned" : ""}`}>
            <div
              className="compass-ring"
              style={{ transform: `rotate(${-1 * (heading || 0)}deg)` }}
            >
              <span className="north">N</span>
              <span className="east">E</span>
              <span className="south">S</span>
              <span className="west">W</span>
              {Array.from({ length: 36 }, (_, i) => (
                <i key={i} style={{ transform: `rotate(${i * 10}deg)` }} />
              ))}
            </div>
            <div
              className="compass-needle"
              style={{ transform: `rotate(${angle - (heading || 0)}deg)` }}
            >
              <div className="needle-tip" />
              <span className="kaaba">◈</span>
            </div>
            <div className="compass-center" />
          </div>
          <h2>{aligned ? t("aligned") : `${angle.toFixed(1)}°`}</h2>
          <p className="muted">{t("north")}</p>
          {!enabled && (
            <button className="button primary" onClick={start}>
              <Compass size={18} />
              {t("enableCompass")}
            </button>
          )}
          {enabled && (heading === null || accuracy === null) && (
            <Banner>{t("compassMissing")}</Banner>
          )}
          {enabled && !aligned && (
            <p className="muted calibration">{t("calibrate")}</p>
          )}
          {error && <Banner kind="error">{error}</Banner>}
          <button
            className="button secondary"
            onClick={() => setShowMap(!showMap)}
          >
            <MapPin size={16} />
            {t("map")}
          </button>
          {showMap && (
            <LocationMap location={prayer.location} bearing={angle} />
          )}
        </section>
      )}
    </>
  );
}
export function MosquesPage({
  onSetup,
  onRead,
}: {
  onSetup: () => void;
  onRead: (c: Content) => void;
}) {
  const { prayer, data, prefs, t } = useApp();
  const [location, setLocation] = useState<Location | null>(
    prayer?.location || null,
  );
  const [updated, setUpdated] = useState("");
  useEffect(() => {
    setLocation(prayer?.location || null);
    setResults([]);
    setUpdated("");
  }, [prayer?.location]);
  const [results, setResults] = useState<Mosque[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [going, setGoing] = useState<Mosque | null>(null);
  const [showMap, setShowMap] = useState(false);
  const alternativeSource = results.some((m) => m.id.startsWith("wikidata-"));
  const list = [
    ...data.mosques.filter((m) => !location || distanceKm(location, m) < 5),
    ...results,
  ]
    .filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i)
    .sort((a, b) =>
      location ? distanceKm(location, a) - distanceKm(location, b) : 0,
    );
  const duas = data.content.filter(
    (c) =>
      c.kind === "dua" && ["mosque-way", "mosque-entry"].includes(c.categoryId),
  );
  return (
    <>
      <div className="page-heading">
        <h1>{t("mosques")}</h1>
        <MapPin />
      </div>
      <section className="panel">
        <div className="mosque-search">
          <span>{location?.name || t("select")}</span>
          <button
            className="button secondary"
            onClick={onSetup}
            disabled={busy}
          >
            {t("changeLocation")}
          </button>
          <button
            className="button primary"
            disabled={!location || busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await loadMosques(location!);
                setResults(result.items);
                setUpdated(result.at);
                setShowMap(true);
                if (result.stale) setError(t("mosqueCached"));
              } catch {
                setError(t("mosqueSearchError"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner /> : <LocateFixed size={18} />} {t("findMosques")}
          </button>
        </div>
        {busy && <p className="muted" role="status">{t("mosqueSearching")}</p>}
        <p className="muted">
          {t(alternativeSource ? "mosqueAlternative" : "mosqueSource")} ·{" "}
          <a
            href={alternativeSource ? "https://www.wikidata.org/wiki/Wikidata:Licensing" : "https://www.openstreetmap.org/copyright"}
            target="_blank"
            rel="noreferrer"
          >
            {alternativeSource ? "Wikidata · CC0" : "© OpenStreetMap"}
          </a>
        </p>
        {updated && (
          <p className="muted">
            {t("mosqueUpdated")}{" "}
            {DateTime.fromISO(updated)
              .setZone(location?.timezone)
              .toFormat("dd.MM.yyyy HH:mm")}
          </p>
        )}
        {location && (
          <>
            <button
              className="text-button"
              onClick={() => setShowMap(!showMap)}
            >
              {t("map")}
            </button>
            {showMap && <LocationMap location={location} mosques={list} />}
          </>
        )}
        {error && <Banner kind="error">{error}</Banner>}
        {error && location && <a className="button secondary" target="_blank" rel="noreferrer" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("mosques near " + location.latitude + "," + location.longitude)}>{t("openMapSearch")}</a>}
        {list.length ? (
          <div className="mosque-list">
            {list.map((m) => (
              <article className="mosque-card" key={m.id}>
                <div className="mosque-symbol">
                  <MapPin />
                </div>
                <div>
                  <h3>{m.name}</h3>
                  <p>{m.address || m.city}</p>
                  <small>
                    {location && `${distanceKm(location, m).toFixed(1)} km`}
                    {m.verified && ` · ${t("confirmed")}`}
                  </small>
                  <div className="inline">
                    <a
                      className="button secondary"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}&travelmode=walking`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("route")}
                    </a>
                    <button
                      className="button primary"
                      onClick={async () => {
                        if (prefs.mosqueDua) setGoing(m);
                        if (
                          prefs.mosqueExitReminder &&
                          Capacitor.getPlatform() === "android"
                        ) {
                          const dua = data.content.find(
                            (c) =>
                              c.kind === "dua" &&
                              c.categoryId === "mosque-exit",
                          );
                          if (!dua) {
                            setError(t("emptyContent"));
                            return;
                          }
                          try {
                            await startMosqueTrip(m, dua, prefs.locale);
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }
                      }}
                    >
                      {t("going")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          !busy && !error && updated ? <Empty title={t("noMosques")} body={t("mosqueSource")} /> : null
        )}
      </section>
      {going && (
        <Modal label={t("mosqueDua")} onClose={() => setGoing(null)}>
          <p className="muted">{going.name}</p>
          {duas.length ? (
            <ContentList
              contents={duas}
              onRead={(c) => {
                setGoing(null);
                onRead(c);
              }}
            />
          ) : (
            <Empty />
          )}
        </Modal>
      )}
    </>
  );
}
