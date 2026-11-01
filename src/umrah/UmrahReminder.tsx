import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { BellRing, Clock3, Info, Settings2, X } from "lucide-react";
import type { Locale } from "../../shared/schema";
import {
  acknowledgeUmrahReminder, cancelUmrahReminder, inspectUmrahReminder, invalidateUmrahReminderVerification,
  loadUmrahReminder, openUmrahExactAlarmSettings, scheduleUmrahReminder,
  UMRAH_REMINDER_KEY, type UmrahReminderInspection, type UmrahReminderOperationResult,
} from "./reminder";
import { reminderText, type ReminderCopyKey } from "./reminder-copy";

const operationMessages: Partial<Record<UmrahReminderOperationResult["status"], ReminderCopyKey>> = {
  "invalid-input": "invalid", exists: "changeHelp", "storage-unavailable": "storageUnavailable",
  "storage-blocked": "storageBlocked", "permission-denied": "permissionDenied",
  "exact-permission-required": "exactRequired", "schedule-failed": "scheduleFailed",
  "cancel-failed": "cancelFailed", unsupported: "unsupported",
};
const statusMessages: Partial<Record<UmrahReminderInspection["deliveryStatus"], ReminderCopyKey>> = {
  "web-open": "webOpen", pending: "pending", due: "due", acknowledged: "acknowledged",
  "permission-denied": "permissionDenied", "exact-permission-required": "exactRequired",
  missing: "missing", unverified: "unverified",
};

export function formatReminderTime(timestamp: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    timeZoneName: "short",
  }).format(new Date(timestamp));
}

/** A user-entered local timer. It never interprets GPS or confirms a rite. */
export function UmrahReminder({ locale, showSetup, dockHeight, dockHost }: { locale: Locale; showSetup: boolean; dockHeight: number; dockHost: HTMLElement | null }) {
  const t = (key: ReminderCopyKey, vars?: Record<string, string | number>) => reminderText(locale, key, vars);
  const nativeAndroid = Capacitor.getPlatform() === "android";
  const [inspection, setInspection] = useState<UmrahReminderInspection>(() => ({ ...loadUmrahReminder(), deliveryStatus: "none" }));
  const [until, setUntil] = useState("");
  const [lead, setLead] = useState("30");
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UmrahReminderOperationResult["status"] | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<ReminderCopyKey | null>(null);
  const alive = useRef(false);
  const request = useRef(0);
  const busyRef = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [dueVisible, setDueVisible] = useState(false);

  async function refresh() {
    if (busyRef.current) return;
    const generation = ++request.current;
    const result = await inspectUmrahReminder();
    if (alive.current && generation === request.current) setInspection(result);
  }

  useEffect(() => {
    alive.current = true;
    void refresh();
    const tick = () => setNow(Date.now());
    const resume = () => {
      tick();
      if (document.visibilityState === "visible") void refresh();
      else invalidateUmrahReminderVerification();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === UMRAH_REMINDER_KEY || event.key === null) void refresh();
    };
    // Browser timers pause while sleeping; re-read the absolute saved timestamp
    // on resumption instead of claiming a background alarm was delivered.
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", resume);
    window.addEventListener("pagehide", invalidateUmrahReminderVerification);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("storage", storage);
    return () => {
      alive.current = false;
      request.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pagehide", invalidateUmrahReminderVerification);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("storage", storage);
    };
  }, []);

  const reminder = inspection.reminder;
  const blocked = inspection.status === "corrupt" || inspection.status === "future-version";
  const due = !!reminder && !reminder.acknowledgedAt && now >= reminder.remindAt;
  const effectiveStatus = reminder?.acknowledgedAt ? "acknowledged" : due ? "due" : inspection.deliveryStatus;
  const statusKey = statusMessages[effectiveStatus];
  const hasPending = !!reminder && !reminder.acknowledgedAt;
  const validPreview = /^\d+$/.test(until) && /^\d+$/.test(lead) && Number(until) <= 1440 && Number(lead) >= 5 && Number(until) - Number(lead) >= 2;
  const preview = validPreview ? now + (Number(until) - Number(lead)) * 60_000 : null;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const exactRequired = error === "exact-permission-required" || effectiveStatus === "exact-permission-required";

  useEffect(() => {
    const status = statusRef.current;
    if (!due || !status) { setDueVisible(false); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setDueVisible(entry.isIntersecting && entry.intersectionRatio > 0.5);
    }, { threshold: [0, 0.5, 1], rootMargin: `-80px 0px -${dockHeight}px 0px` });
    observer.observe(status);
    return () => observer.disconnect();
  }, [due, dockHeight]);

  async function run(operation: () => Promise<UmrahReminderOperationResult>) {
    if (busyRef.current) return;
    busyRef.current = true;
    request.current++;
    setBusy(true); setError(null); setSettingsMessage(null);
    try {
      const result = await operation();
      const inspected = await inspectUmrahReminder();
      if (!alive.current) return;
      setInspection(inspected);
      setNow(Date.now());
      if (operationMessages[result.status]) setError(result.status);
      if (result.status === "cancelled") setUntil("");
    } catch {
      if (alive.current) setError("schedule-failed");
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function schedule(event: FormEvent) {
    event.preventDefault();
    if (!validPreview) { setError("invalid-input"); return; }
    void run(() => scheduleUmrahReminder({ minutesUntilMiqat: Number(until), leadMinutes: Number(lead), locale }));
  }

  async function openSettings() {
    if (busyRef.current) return;
    busyRef.current = true;
    request.current++;
    setBusy(true);
    try {
      const result = await openUmrahExactAlarmSettings();
      if (alive.current) {
        setSettingsMessage(result === "granted" ? "settingsReady" : result === "denied" ? "exactRequired" : "settingsUnavailable");
        if (result === "granted") setError(null);
      }
    } finally {
      busyRef.current = false;
      if (alive.current) { setBusy(false); void refresh(); }
    }
  }

  if (!showSetup && !reminder && inspection.status === "empty" && !error) return null;
  return (
    <section className={`umrah-reminder${due ? " umrah-reminder-due" : ""}`} data-testid="umrah-reminder" aria-labelledby="umrah-reminder-heading">
      <header><BellRing size={20} aria-hidden="true" /><h3 id="umrah-reminder-heading">{t("title")}</h3></header>
      {!hasPending && <p>{t("intro")}</p>}
      <p className="umrah-reminder-platform" data-testid="umrah-reminder-platform"><Info size={16} aria-hidden="true" /><span>{t(nativeAndroid ? "nativeHint" : "webHint")}</span></p>
      {reminder && <div className="umrah-reminder-saved">
        <span>{t("time")}</span>
        <time data-testid="umrah-reminder-time" dateTime={new Date(reminder.remindAt).toISOString()}>{formatReminderTime(reminder.remindAt, locale)}</time>
        <small>{t("timezone", { zone })}</small>
      </div>}
      {statusKey && <div className="umrah-reminder-status" data-testid="umrah-reminder-status" data-status={effectiveStatus} ref={statusRef} tabIndex={-1} role={due ? "alert" : "status"}>
        <strong>{t(statusKey)}</strong>
        {due && <p>{t("dueBody")}</p>}
      </div>}
      {inspection.status === "unavailable" && <p role="alert" className="umrah-reminder-error">{t("storageUnavailable")}</p>}
      {blocked && <p role="alert" className="umrah-reminder-error">{t("storageBlocked")}</p>}
      {error && operationMessages[error] && <p role="alert" className="umrah-reminder-error" data-testid="umrah-reminder-error" data-status={error}>{t(operationMessages[error]!)}</p>}
      {settingsMessage && <p role="status" className="umrah-reminder-error">{t(settingsMessage)}</p>}
      {exactRequired && <button type="button" className="button secondary" data-testid="umrah-reminder-settings" disabled={busy} onClick={() => void openSettings()}><Settings2 size={17} aria-hidden="true" />{t("exactSettings")}</button>}
      {!hasPending && !blocked && <form onSubmit={schedule} noValidate>
        <div className="umrah-reminder-inputs">
          <label><span>{t("until")}</span><input type="number" inputMode="numeric" min="7" max="1440" step="1" required value={until} disabled={busy} data-testid="umrah-reminder-until" onChange={event => setUntil(event.target.value)} /></label>
          <label><span>{t("lead")}</span><input type="number" inputMode="numeric" min="5" max="1438" step="1" required value={lead} disabled={busy} data-testid="umrah-reminder-lead" onChange={event => setLead(event.target.value)} /></label>
        </div>
        {preview && <p className="umrah-field-help" data-testid="umrah-reminder-preview">{t("preview", { time: formatReminderTime(preview, locale) })}<br />{t("timezone", { zone })}</p>}
        <button type="submit" className="button primary" data-testid="umrah-reminder-schedule" disabled={busy || inspection.status === "unavailable"}><Clock3 size={18} aria-hidden="true" />{t(busy ? "busy" : "schedule")}</button>
      </form>}
      <div className="umrah-reminder-actions">
        {due && <button type="button" className="button primary" data-testid="umrah-reminder-acknowledge" disabled={busy} onClick={() => void run(acknowledgeUmrahReminder)}>{t("acknowledge")}</button>}
        {(reminder || blocked) && <button type="button" className="button secondary" data-testid="umrah-reminder-cancel" disabled={busy} onClick={() => void run(cancelUmrahReminder)}><X size={17} aria-hidden="true" />{t(blocked ? "clear" : "cancel")}</button>}
      </div>
      {hasPending && !due && <p className="umrah-field-help">{t("changeHelp")}</p>}
      <p className="umrah-field-help umrah-reminder-boundary">{t("boundary")}</p>
      {reminder && <p className="umrah-field-help">{t("clock")}</p>}
      {due && !dueVisible && dockHost && createPortal(
        <aside className="umrah-reminder-notice" data-testid="umrah-reminder-notice" style={{ bottom: dockHeight + 8 }} aria-label={t("due")}>
          <button type="button" onClick={() => {
            statusRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
            statusRef.current?.focus({ preventScroll: true });
          }}>
            <BellRing size={20} aria-hidden="true" /><span><strong>{t("due")}</strong><small>{t("openReminder")}</small></span>
          </button>
        </aside>, dockHost)}
    </section>
  );
}
