import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ExternalLink,
  Flag, Footprints, Info, LocateFixed, LockKeyhole, MapPin, Plus,
  RotateCcw, ShieldCheck, Undo2, WifiOff,
} from "lucide-react";
import { useApp } from "../store";
import { Modal } from "../components/ui";
import { umrahSteps, umrahSources } from "../umrah/content";
import { umrahMiqats } from "../umrah/miqats";
import { umrahUi, type UmrahCopyKey } from "../umrah/copy";
import {
  loadUmrahProgress, reduceUmrahProgress, saveUmrahProgress,
  type UmrahAction, type UmrahLoadResult,
} from "../umrah/progress";
import { requestUmrahPosition, UMRAH_POSITION_MAX_AGE, type UmrahLocationResult } from "../umrah/location";
import { UmrahReminder, formatReminderTime } from "../umrah/UmrahReminder";
import { cancelUmrahReminder } from "../umrah/reminder";
import { reminderText } from "../umrah/reminder-copy";
import { UMRAH_STAGES, type UmrahAudience, type UmrahInstruction, type UmrahScenario, type UmrahStartMode, type UmrahText } from "../umrah/types";
import "../umrah/umrah.css";

const geoMessages: Partial<Record<UmrahLocationResult["status"], UmrahCopyKey>> = {
  available: "geoAvailable", "consent-required": "geoConsent", denied: "geoDenied",
  unsupported: "geoUnsupported", timeout: "geoTimeout", unavailable: "geoUnavailable",
  stale: "geoStale", invalid: "geoInvalid",
};

export function UmrahPage() {
  const { prefs, online } = useApp();
  const locale = prefs.locale;
  const t = (key: UmrahCopyKey, vars?: Record<string, string | number>) => umrahUi(locale, key, vars);
  const localized = (value?: UmrahText) => value?.[locale] || t("translationMissing");
  const [initial] = useState(() => loadUmrahProgress());
  const [progress, setProgress] = useState(initial.progress);
  const progressRef = useRef(progress);
  const [storageStatus, setStorageStatus] = useState<UmrahLoadResult["status"]>(initial.status);
  const storageBlocked = storageStatus === "corrupt" || storageStatus === "future-version";
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState(false);
  const [reminderRevision, setReminderRevision] = useState(0);
  const [geoConsent, setGeoConsent] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geo, setGeo] = useState<UmrahLocationResult | null>(null);
  const geoRequest = useRef<AbortController | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const [dockHost, setDockHost] = useState<HTMLElement | null>(null);
  const [dockHeight, setDockHeight] = useState(180);
  const previousStage = useRef(progress.stage);
  const previousAcknowledged = useRef(progress.acknowledged);

  useEffect(() => {
    setDockHost(document.querySelector<HTMLElement>(".workspace") ?? document.body);
    return () => { geoRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    if (geo?.status !== "available" || !geo.position) return;
    const expire = () => {
      setGeo(current => {
        if (current?.status !== "available" || !current.position) return current;
        if (Date.now() - current.position.timestamp > UMRAH_POSITION_MAX_AGE)
          return { status: "stale", boundaryGuidanceAvailable: false };
        if (current.position.timestamp > Date.now() + 5_000)
          return { status: "invalid", boundaryGuidanceAvailable: false };
        return current;
      });
    };
    const timer = window.setInterval(expire, 1000);
    document.addEventListener("visibilitychange", expire);
    window.addEventListener("focus", expire);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", expire);
      window.removeEventListener("focus", expire);
    };
  }, [geo?.status, geo?.position?.timestamp]);

  // The dock is outside main's container-query containment, so it stays in the
  // viewport. Its measured height reserves real document space for the last text.
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const measure = () => setDockHeight(Math.ceil(dock.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, [dockHost, progress.acknowledged]);

  useEffect(() => {
    const enteredGuide = !previousAcknowledged.current && progress.acknowledged;
    previousAcknowledged.current = progress.acknowledged;
    if (previousStage.current === progress.stage && !enteredGuide) return;
    previousStage.current = progress.stage;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [progress.stage, progress.acknowledged]);

  function change(action: UmrahAction, explicitReset = false) {
    const next = reduceUmrahProgress(progressRef.current, action);
    progressRef.current = next;
    setProgress(next);
    // Reading/acknowledging in a damaged or newer save must never replace it.
    if (storageBlocked && !explicitReset) return;
    const saved = saveUmrahProgress(next);
    setStorageStatus(saved.ok ? "ok" : "unavailable");
  }

  const step = umrahSteps.find(item => item.id === progress.stage)!;
  const stepIndex = UMRAH_STAGES.indexOf(progress.stage);
  const instructionApplies = (item: UmrahInstruction) =>
    (!item.audience || progress.audience === "all" || item.audience === progress.audience) &&
    (!item.scenarios || item.scenarios.includes(progress.scenario)) &&
    (!item.startModes || item.startModes.includes(progress.startMode));
  // The initial ihram instruction calls for talbiyah. Let the reader access its
  // existing, source-backed text before marking ihram or advancing any step.
  const talbiyahReference = umrahSteps.find(item => item.id === "talbiyah")?.instructions.find(item => item.id === "talbiyah-text");
  const instructions = [
    ...step.instructions.filter(instructionApplies),
    ...(step.id === "ihram" && talbiyahReference && instructionApplies(talbiyahReference) ? [talbiyahReference] : []),
  ];
  const preparation = umrahSteps.find(item => item.id === "preparation");
  const duaInstructions = instructions.filter(item => item.arabic);
  const hasTranslation = !!step.title[locale] && !!step.summary[locale] && instructions.every(item =>
    !!item.text[locale] && (!item.title || !!item.title[locale]) && (!item.meaning || !!item.meaning[locale]),
  );
  const counter = progress.stage === "tawaf" || progress.stage === "sai" ? progress.stage : null;
  const count = counter ? progress[counter] : 0;
  const allMarked = progress.completed.length === UMRAH_STAGES.length;
  const finalStepMarked = allMarked && progress.stage === "completion";
  const warning: UmrahCopyKey | undefined = storageStatus === "corrupt" ? "storageCorrupt"
    : storageStatus === "future-version" ? "storageFuture"
    : storageStatus === "unavailable" ? "storageUnavailable" : undefined;

  async function getPosition() {
    if (!geoConsent || geoBusy) return;
    geoRequest.current?.abort();
    const request = new AbortController();
    geoRequest.current = request;
    setGeo(null);
    setGeoBusy(true);
    const result = await requestUmrahPosition({ consent: true, signal: request.signal });
    if (request.signal.aborted || geoRequest.current !== request) return;
    setGeoBusy(false);
    if (result.status !== "cancelled") setGeo(result);
  }

  const settings = (
    <div className="umrah-settings-fields">
      <label>
        <span>{t("startWhere")}</span>
        <select data-testid="umrah-start-mode" value={progress.startMode}
          onChange={event => {
            const startMode = event.target.value as UmrahStartMode;
            const scenario = startMode === "mecca" ? "mecca" : startMode === "transport" && progressRef.current.scenario === "flight" ? "flight" : "ground";
            change({ type: "configure", startMode, scenario, audience: progressRef.current.audience });
          }}>
          <option value="miqat">{t("atMiqat")}</option>
          <option value="transport">{t("inTransport")}</option>
          <option value="mecca">{t("mecca")}</option>
        </select>
      </label>
      {progress.startMode === "transport" && <label>
        <span>{t("transportType")}</span>
        <select data-testid="umrah-scenario" value={progress.scenario}
          onChange={event => change({ type: "configure", startMode: "transport", scenario: event.target.value as UmrahScenario, audience: progressRef.current.audience })}>
          <option value="ground">{t("ground")}</option>
          <option value="flight">{t("flight")}</option>
        </select>
      </label>}
      <label>
        <span>{t("audience")}</span>
        <select data-testid="umrah-audience" value={progress.audience}
          onChange={event => change({ type: "configure", startMode: progressRef.current.startMode, scenario: progressRef.current.scenario, audience: event.target.value as UmrahAudience })}>
          <option value="all">{t("all")}</option>
          <option value="men">{t("men")}</option>
          <option value="women">{t("women")}</option>
        </select>
      </label>
      <p className="umrah-field-help">{t("routeHelp")}</p>
    </div>
  );

  function jumpToInstruction(id: string) {
    const element = document.getElementById(`umrah-instruction-${id}`);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  const isEntryReference = (item: UmrahInstruction) => step.id === "ihram" && item.id === "talbiyah-text";
  const renderInstruction = (item: UmrahInstruction) => (
    <article className={`umrah-instruction umrah-instruction-${item.kind}`} key={item.id}
      id={`umrah-instruction-${item.id}`} data-instruction={item.id} data-reference-only={isEntryReference(item) || undefined} tabIndex={-1}>
      {/* The recommendation in talbiyah-text describes repetition on the journey,
          not a cross-school ruling on the initial talbiyah when entering ihram. */}
      {!isEntryReference(item) && <span className="umrah-instruction-kind">{t(item.kind)}</span>}
      {item.title && <h3>{isEntryReference(item) ? t("talbiyahReference") : localized(item.title)}</h3>}
      {!isEntryReference(item) && <p>{localized(item.text)}</p>}
      {item.arabic && <p className="umrah-arabic" lang="ar" dir="rtl">{item.arabic}</p>}
      {item.meaning && <div className="umrah-meaning"><span>{t("meaning")}</span><p>{localized(item.meaning)}</p></div>}
      <details className="umrah-sources">
        <summary><BookOpen size={14} aria-hidden="true" />{t("source")}<ChevronDown size={14} aria-hidden="true" /></summary>
        <div>
          {item.sourceIds.map(id => {
            const source = umrahSources.find(record => record.id === id);
            return source ? <a href={source.url} target="_blank" rel="noopener noreferrer" key={id}>
              <span>{localized(source.title)}<small>{source.reference}</small></span><ExternalLink size={14} aria-hidden="true" />
            </a> : <p key={id}>{t("translationMissing")}</p>;
          })}
          <p>{t("sourceOffline")}</p>
        </div>
      </details>
    </article>
  );

  const dock = progress.acknowledged && (
    <section ref={dockRef} className="umrah-dock" data-testid="umrah-dock" aria-label={t("manual")}>
      <div className="umrah-dock-inner">
        {counter ? (
          <>
            <div className="umrah-counter-caption">
              <span>{t(counter === "tawaf" ? "tawafCount" : "saiCount")}</span>
              <span>{t("manualMode")}</span>
            </div>
            <div className="umrah-counter-row">
              <div className="umrah-count-pill" aria-live="polite" aria-atomic="true">
                <output data-testid="umrah-count" aria-label={t(counter === "tawaf" ? "tawafCount" : "saiCount")}>{count}</output>
                <span aria-hidden="true">/ 7</span>
              </div>
              <button className="button primary umrah-increment" data-testid="umrah-increment"
                disabled={count >= 7} onClick={() => change({ type: "increment", counter })}>
                {count < 7 ? <Plus size={20} aria-hidden="true" /> : <Check size={20} aria-hidden="true" />}
                <span>{t(count >= 7 ? "countedSeven" : counter === "tawaf" ? "tawafIncrement" : "saiIncrement")}</span>
              </button>
              <button className="button secondary umrah-undo" data-testid="umrah-undo" title={t("undo")} aria-label={t("undo")}
                disabled={!progress.history.length} onClick={() => change({ type: "undo" })}>
                <Undo2 size={20} aria-hidden="true" />
                <span>{t("undoShort")}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="umrah-manual-row">
            <span><ShieldCheck size={16} aria-hidden="true" />{t("manual")}</span>
            <button className="text-button umrah-undo" data-testid="umrah-undo" title={t("undo")} aria-label={t("undo")}
              disabled={!progress.history.length} onClick={() => change({ type: "undo" })}>
              <Undo2 size={17} aria-hidden="true" />{t("undoShort")}
            </button>
          </div>
        )}
        <div className="umrah-navigation">
          <button className="button secondary" data-testid="umrah-previous" disabled={stepIndex === 0}
            onClick={() => change({ type: "previous-stage" })}>
            <ArrowLeft size={18} aria-hidden="true" /><span>{t("previous")}</span>
          </button>
          <button className="button primary" data-testid="umrah-confirm"
            disabled={!hasTranslation || (!!counter && count !== 7) || finalStepMarked}
            onClick={() => change({ type: "confirm-stage" })}>
            <span>{t(finalStepMarked ? "completionTitle" : progress.stage === "completion" ? "finish" : "confirm")}</span>
            {!finalStepMarked && <ArrowRight size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <div className="umrah-page" ref={pageRef} data-testid="umrah-page"
      style={{ "--umrah-dock-height": `${progress.acknowledged ? dockHeight : 0}px` } as CSSProperties}>
      <header className="umrah-heading">
        <div>
          <span className="umrah-eyebrow"><Footprints size={15} aria-hidden="true" />{t("reviewLabel")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <div className="umrah-heading-symbol" aria-hidden="true"><BookOpen size={30} /></div>
      </header>

      <details className="umrah-about">
        <summary data-testid="umrah-about"><Info size={17} aria-hidden="true" />{t("about")}<ChevronDown size={16} aria-hidden="true" /></summary>
        <div className="umrah-about-body">
          <p>{t("disclaimer")}</p>
          <p>{t("review")}</p>
          <p>{t("rulingNote")}</p>
          <p>{t("privacyNote")}</p>
          <p>{t("sourceOffline")}</p>
        </div>
      </details>

      {warning && (
        <div className="umrah-storage-warning" role="alert" data-testid="umrah-storage-warning">
          <Info size={19} aria-hidden="true" /><div><p>{t(warning)}</p>
            {storageBlocked && <button className="text-button" onClick={() => { setResetError(false); setResetOpen(true); }}>{t("newJourney")}</button>}
          </div>
        </div>
      )}

      {!progress.acknowledged ? (
        <section className="umrah-welcome">
          <div className="umrah-welcome-label"><BookOpen size={20} aria-hidden="true" />{t("about")}</div>
          <p className="umrah-disclaimer">{t("disclaimer")}</p>
          <p className="umrah-review-note">{t("review")}</p>
          {settings}
          <button className="button primary umrah-start" data-testid="umrah-acknowledge"
            onClick={() => change({ type: "acknowledge" })}>
            {t("acknowledge")}<ArrowRight size={18} aria-hidden="true" />
          </button>
          <div className="umrah-local-note"><LockKeyhole size={15} aria-hidden="true" />{t("privacyNote")}</div>
        </section>
      ) : (
        <>
          <div className="umrah-progress-head">
            <span>{t("step", { current: stepIndex + 1, total: UMRAH_STAGES.length })}</span>
            <span data-testid="umrah-save-status">{warning ? <Info size={14} aria-hidden="true" /> : online ? <LockKeyhole size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}{t(warning ? "notSaved" : online ? "saved" : "offline")}</span>
          </div>
          <ol className="umrah-step-rail" aria-label={t("title")}>
            {UMRAH_STAGES.map((id, index) => (
              <li key={id} className={`${progress.completed.includes(id) ? "done" : ""} ${id === progress.stage ? "current" : ""}`}
                aria-current={id === progress.stage ? "step" : undefined}>
                <span>{progress.completed.includes(id) ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
                <span className="sr-only">{localized(umrahSteps.find(item => item.id === id)?.title)}</span>
              </li>
            ))}
          </ol>

          <section className="umrah-stage" key={step.id} data-testid="umrah-stage" data-stage={step.id}>
            <header className="umrah-stage-header">
              <span className="umrah-stage-number" aria-hidden="true">{String(stepIndex + 1).padStart(2, "0")}</span>
              <div><h2 ref={headingRef} tabIndex={-1}>{localized(step.title)}</h2><p>{localized(step.summary)}</p></div>
            </header>
            {!hasTranslation && <p className="umrah-storage-warning" role="alert">{t("translationMissing")}</p>}
            {step.id === "ihram" && <div className="umrah-start-context" data-testid="umrah-start-context">
              <MapPin size={18} aria-hidden="true" />
              <div><strong>{t(progress.startMode === "miqat" ? "atMiqat" : progress.startMode === "transport" ? "inTransport" : "mecca")}</strong><p>{t("entryIsManual")}</p></div>
            </div>}
            <UmrahReminder key={reminderRevision} locale={locale} dockHeight={dockHeight} dockHost={dockHost} showSetup={step.id === "ihram" && progress.scenario !== "mecca"} />
            {step.id === "ihram" && <details className="umrah-details umrah-miqat-directory" data-testid="umrah-miqat-directory">
              <summary><MapPin size={18} aria-hidden="true" /><span>{t("miqatDirectory")}</span><ChevronDown size={17} aria-hidden="true" /></summary>
              <div className="umrah-miqat-directory-body">
                <p className="umrah-field-help">{t("miqatDirectoryNote")}</p>
                <div className="umrah-miqat-list">{umrahMiqats.map(miqat => <article key={miqat.id} data-miqat={miqat.id}>
                  <h3>{localized(miqat.name)}</h3>
                  <p className="umrah-miqat-arabic" lang="ar" dir="rtl">{miqat.arabicName}</p>
                  <p>{localized(miqat.route)}</p><p className="umrah-field-help">{localized(miqat.note)}</p>
                  <details className="umrah-sources"><summary><BookOpen size={14} aria-hidden="true" />{t("source")}<ChevronDown size={14} aria-hidden="true" /></summary>
                    <div>{miqat.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><span>{localized(source.title)}</span><ExternalLink size={14} aria-hidden="true" /></a>)}</div>
                  </details>
                  <a className="umrah-map-search" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(miqat.mapQuery)}`} target="_blank" rel="noopener noreferrer">
                    <MapPin size={15} aria-hidden="true" /><span>{t("miqatMapSearch")}</span><ExternalLink size={14} aria-hidden="true" />
                  </a>
                </article>)}</div>
                <p className="umrah-field-help">{t("miqatMapNote")}</p>
              </div>
            </details>}
            {step.id === "ihram" && preparation && <details className="umrah-details umrah-preparation" data-testid="umrah-preparation">
              <summary><BookOpen size={18} aria-hidden="true" /><span>{t("prepareReference")}</span><ChevronDown size={17} aria-hidden="true" /></summary>
              <div className="umrah-instructions"><p className="umrah-field-help">{t("prepareReferenceNote")}</p>{preparation.instructions.filter(instructionApplies).map(renderInstruction)}</div>
            </details>}
            {duaInstructions.length > 0 && <nav className="umrah-dua-links" aria-label={t("duasThisStep")} data-testid="umrah-dua-links">
              <h3><BookOpen size={18} aria-hidden="true" />{t("duasThisStep")}</h3>
              <div>{duaInstructions.map(item => <button key={item.id} type="button" onClick={() => jumpToInstruction(item.id)}
                data-dua-target={item.id} aria-controls={`umrah-instruction-${item.id}`}>
                <span>{isEntryReference(item) ? t("talbiyahReference") : item.title ? localized(item.title) : t("supplication")}</span><ArrowRight size={17} aria-hidden="true" />
              </button>)}</div>
            </nav>}
            {counter && <div className="umrah-counter-help">
              <p>{t("counterHelp")}</p>
              <p>{t(counter === "sai" ? count === 7 ? "saiSeven" : count % 2 === 0 ? "safatoMarwa" : "marwatoSafa" : "countBeforeConfirm")}</p>
            </div>}
            <div className="umrah-instructions">
              {instructions.map(renderInstruction)}
            </div>
            {finalStepMarked && <div className="umrah-completion" data-testid="umrah-completion" role="status">
              <Flag size={24} aria-hidden="true" /><h3>{t("completionTitle")}</h3><p>{t("completionNote")}</p>
            </div>}
          </section>

          <div className="umrah-secondary">
            <details className="umrah-details">
              <summary><Footprints size={18} aria-hidden="true" />{t("settings")}<ChevronDown size={17} aria-hidden="true" /></summary>
              {settings}
            </details>
            <details className="umrah-details umrah-geolocation">
              <summary><MapPin size={18} aria-hidden="true" /><span>{t("geoTitle")}</span><span className="umrah-mode-badge">{t("manualMode")}</span><ChevronDown size={17} aria-hidden="true" /></summary>
              <div className="umrah-geo-body">
                <p className="umrah-geo-boundary">{t("geoBoundary")}</p>
                {!online && <p className="umrah-network-status" data-testid="umrah-network-status" data-status="offline" role="status"><WifiOff size={17} aria-hidden="true" /><span>{t("geoOffline")}</span></p>}
                {progress.scenario === "flight" && <p>{t("flightHelp")}</p>}
                <p className="umrah-field-help">{t("geoPrivacy")}</p>
                <label className="umrah-geo-consent"><input type="checkbox" data-testid="umrah-geo-consent" checked={geoConsent}
                  onChange={event => {
                    setGeoConsent(event.target.checked);
                    if (!event.target.checked) {
                      geoRequest.current?.abort();
                      setGeo(null);
                      setGeoBusy(false);
                    }
                  }} /><span>{t("geoConsent")}</span></label>
                <button className="button secondary" data-testid="umrah-geo-request" disabled={!geoConsent || geoBusy}
                  onClick={() => void getPosition()}><LocateFixed size={18} aria-hidden="true" />{t(geoBusy ? "geoBusy" : "geoRequest")}</button>
                {geo && <div className="umrah-geo-result" data-testid="umrah-geo-result" data-status={geo.status} role="status">
                  <p>{t(geoMessages[geo.status] ?? "geoUnavailable")}</p>
                  {geo.status === "available" && geo.position && <>
                    <p className="umrah-coordinates" dir="ltr">{geo.position.latitude.toFixed(5)}, {geo.position.longitude.toFixed(5)}</p>
                    <p>{t("geoAccuracy", { meters: Math.ceil(geo.position.accuracy) })}</p>
                    <p>{t("geoSnapshotTime", { time: formatReminderTime(geo.position.timestamp, locale) })}</p>
                    {geo.position.accuracy > 1000 && <p className="umrah-geo-poor" data-testid="umrah-geo-poor">{t("geoPoorAccuracy")}</p>}
                    <p className="umrah-field-help">{t("geoPositionOnly")}</p>
                  </>}
                </div>}
              </div>
            </details>
            <div className="umrah-ending-note">
              <p><LockKeyhole size={15} aria-hidden="true" />{t("privacyNote")}</p>
              <button className="text-button" data-testid="umrah-new-journey" onClick={() => { setResetError(false); setResetOpen(true); }}>
                <RotateCcw size={16} aria-hidden="true" />{t("newJourney")}
              </button>
            </div>
          </div>
        </>
      )}
      {dockHost && dock && createPortal(dock, dockHost)}
      {resetOpen && <Modal label={t("resetTitle")} className="umrah-reset-modal" onClose={() => { if (!resetBusy) setResetOpen(false); }}>
        <p>{t("resetBody")}</p>
        <p>{t("resetReminder")}</p>
        {resetError && <p className="umrah-reminder-error" role="alert">{reminderText(locale, "cancelFailed")}</p>}
        <div className="modal-actions">
          <button className="button secondary" data-testid="umrah-reset-cancel" disabled={resetBusy} onClick={() => setResetOpen(false)}>{t("cancel")}</button>
          <button className="button primary" data-testid="umrah-reset-confirm" disabled={resetBusy} onClick={() => {
            setResetBusy(true); setResetError(false);
            void cancelUmrahReminder().then(result => {
              if (result.status !== "cancelled") { setResetError(true); return; }
              change({ type: "reset" }, true);
              setReminderRevision(value => value + 1);
              setResetOpen(false);
              geoRequest.current?.abort(); setGeo(null); setGeoConsent(false); setGeoBusy(false);
              pageRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
            }).catch(() => setResetError(true)).finally(() => setResetBusy(false));
          }}>{resetBusy ? reminderText(locale, "busy") : t("resetConfirm")}</button>
        </div>
      </Modal>}
    </div>
  );
}
