import { useEffect, useState, useRef } from "react";
import { MapPin, LocateFixed, Check, CheckCircle2, Clock3 } from "lucide-react";
import {
  devicePosition,
  resolvePosition,
  searchWorldCities,
  locationErrorKey,
} from "../location";
import { Capacitor } from "@capacitor/core";
import { Modal, Banner, Spinner } from "./ui";
import { useApp, readLocal, writeLocal } from "../store";
import { detectedTimezone, setupDefaults } from "../../shared/setup-defaults";
import { requestLocalNotifications } from "../notifications";
import { cities } from "../../shared/prayer";
import {
  methods,
  PrayerSettings,
  Location,
  locales,
  type Locale,
} from "../../shared/schema";
import { languageNames } from "../i18n";
export function Onboarding({ onClose }: { onClose: () => void }) {
  const { t, prefs, setPrefs, prayer, setPrayer, data } = useApp();
  const draft = readLocal<any>("namoz.setup-draft", {});
  const [step, setStep] = useState(
    readLocal("namoz.notice-seen", false)
      ? !prayer && draft.step >= 1 && draft.step <= 5
        ? draft.step
        : 1
      : 0,
  );
  const [location, setLocation] = useState<Location | null>(
    prayer?.location || draft.location || null,
  );
  const defaults = location
    ? setupDefaults(location, data.recommendations)
    : null;
  const [method, setMethod] = useState(prayer?.method || draft.method || "");
  const [madhab, setMadhab] = useState(prayer?.madhab || draft.madhab || "");
  const [highLatitudeRule, setHigh] = useState(
    prayer?.highLatitudeRule || draft.highLatitudeRule || "",
  );
  const [query, setQuery] = useState(
    [location?.name, location?.country].filter(Boolean).join(", "),
  );
  const [remote, setRemote] = useState<Location[]>([]);
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const searchVersion = useRef(0);
  const [customZone, setCustomZone] = useState(false);
  const selectedMethod = method || defaults?.method || "";
  const selectedMadhab = madhab || defaults?.madhab || "";
  const selectedHigh =
    highLatitudeRule || defaults?.highLatitudeRule || "middle";
  const timezones = Array.from(
    new Set([location?.timezone || "", ...Intl.supportedValuesOf("timeZone")]),
  )
    .filter(Boolean)
    .sort();
  useEffect(
    () =>
      writeLocal("namoz.setup-draft", {
        location,
        method,
        madhab,
        highLatitudeRule,
        step,
      }),
    [location, method, madhab, highLatitudeRule, step],
  );
  const labels = [
    t("location"),
    t("timezone"),
    t("method"),
    t("asrMethod"),
    t("confirm"),
  ];
  useEffect(() => {
    const version = ++searchVersion.current;
    if (!searchActive || query.trim().length < 2) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      void searchWorldCities(query, prefs.locale)
        .then((results) => {
          if (version !== searchVersion.current) return;
          setRemote(results);
          setSearchMessage(results.length ? "" : t("cityNotFound"));
        })
        .catch(() => {
          if (version !== searchVersion.current) return;
          setRemote(
            cities.filter((c) =>
              `${c.name} ${c.country} ${c.name === "Kayseri" ? "Кайсери" : ""}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ),
          );
          setSearchMessage(t("citySearchOffline"));
        })
        .finally(() => {
          if (version === searchVersion.current) setSearching(false);
        });
    }, 600);
    return () => {
      clearTimeout(timer);
      searchVersion.current++;
    };
  }, [query, searchActive, prefs.locale]);
  const locate = async () => {
    setBusy(true);
    setError("");
    setSearchActive(false);
    searchVersion.current++;
    setRemote([]);
    setSearchMessage("");
    try {
      const p = await devicePosition();
      const result = await resolvePosition(
        p.coords.latitude,
        p.coords.longitude,
        prefs.locale,
        t("location"),
      );
      choose(result.location);
      if (!result.named) setError(t("cityNameUnavailable"));
      setManual(false);
    } catch (error) {
      setError(t(locationErrorKey(error)));
    } finally {
      setBusy(false);
    }
  };
  const canContinue =
    step === 1
      ? !!location &&
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude) &&
        !!location.name
      : step === 2
        ? Location.safeParse(location).success
        : step === 3
          ? methods.includes(selectedMethod)
          : step === 4
            ? !!selectedMadhab && !!selectedHigh
            : true;
  const choose = (l: Location) => {
    searchVersion.current++;
    setSearchActive(false);
    setRemote([]);
    setSearchMessage("");
    setQuery([l.name, l.country].filter(Boolean).join(", "));
    setError("");
    setLocation({
      ...l,
      timezone: l.timezone || detectedTimezone(l.latitude, l.longitude),
    });
    setMethod("");
    setMadhab("");
    setHigh("");
    setCustomZone(false);
  };
  return (
    <Modal
      label={step === 0 ? t("aboutPrayer") : t("setupTitle")}
      onClose={step === 0 ? undefined : onClose}
      wide
    >
      <div className="wizard-language">
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
      {step === 0 ? (
        <div className="notice-content">
          <div className="notice-symbol">
            <Clock3 size={42} />
          </div>
          <p>{t("prayerNotice")}</p>
          <button
            className="button primary full"
            onClick={() => {
              writeLocal("namoz.notice-seen", true);
              setStep(1);
            }}
          >
            {t("understood")}
          </button>
        </div>
      ) : (
        <>
          <ol className="steps">
            {labels.map((label, i) => (
              <li
                key={label}
                className={
                  step === i + 1 ? "active" : step > i + 1 ? "done" : ""
                }
              >
                <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
                <small>{label}</small>
              </li>
            ))}
          </ol>
          {error && <Banner kind="error">{error}</Banner>}
          <div className="wizard-body">
            {step === 1 && (
              <>
                <h3>{t("location")}</h3>
                <p className="muted">{t("locationHelp")}</p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={locate}
                >
                  {busy ? <Spinner /> : <LocateFixed size={18} />}{" "}
                  {busy ? t("locating") : t("useLocation")}
                </button>
                <label className="field">
                  <span>{t("city")}</span>
                  <div className="inline">
                    <input
                      placeholder={t("enterCity")}
                      aria-label={t("city")}
                      disabled={busy}
                      maxLength={100}
                      autoComplete="off"
                      value={query}
                      onChange={(e) => {
                        searchVersion.current++;
                        setQuery(e.target.value);
                        setError("");
                        setLocation(null);
                        setRemote([]);
                        setSearchMessage("");
                        setSearchActive(true);
                      }}
                    />
                  </div>
                </label>
                <div role="status" aria-live="polite">
                  {searching ? t("searchingCities") : searchMessage}
                </div>
                <div className="city-grid">
                  {remote.map((c, i) => (
                    <button
                      key={`${c.name}-${i}`}
                      className={`city-option ${location?.name === c.name ? "selected" : ""}`}
                      onClick={() => choose(c)}
                    >
                      <MapPin size={16} />
                      <span>
                        {c.name}
                        <small>{c.country}</small>
                      </span>
                      {location?.name === c.name && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <p className="muted">
                  <small>
                    ©{" "}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OpenStreetMap
                    </a>{" "}
                    ·{" "}
                    <a
                      href="https://open-meteo.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open-Meteo / GeoNames
                    </a>
                  </small>
                </p>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setManual(!manual)}
                >
                  {t("manualLocation")}
                </button>
                {manual && (
                  <div className="form-grid">
                    {(
                      ["name", "country", "latitude", "longitude"] as const
                    ).map((k) => (
                      <label className="field" key={k}>
                        <span>{k === "name" ? t("city") : t(k)}</span>
                        <input
                          type={
                            k === "latitude" || k === "longitude"
                              ? "number"
                              : "text"
                          }
                          step="any"
                          value={
                            typeof location?.[k] === "number" &&
                            !Number.isFinite(location?.[k])
                              ? ""
                              : (location?.[k] ?? "")
                          }
                          onChange={(e) =>
                            choose({
                              ...(location || {
                                name: "",
                                country: "",
                                latitude: NaN,
                                longitude: NaN,
                                timezone: "",
                              }),
                              ...(k === "latitude" || k === "longitude"
                                ? { timezone: "" }
                                : {}),
                              [k]:
                                k === "latitude" || k === "longitude"
                                  ? e.target.value === ""
                                    ? NaN
                                    : Number(e.target.value)
                                  : e.target.value,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <h3>{t("timezone")}</h3>
                <div className="location-summary">
                  <MapPin />
                  <span>
                    {location?.name}
                    <small>
                      {location?.latitude.toFixed(4)},{" "}
                      {location?.longitude.toFixed(4)}
                    </small>
                  </span>
                </div>
                <div className="timezone-card">
                  <Clock3 size={22} />
                  <div>
                    <strong>{location?.timezone.replaceAll("_", " ")}</strong>
                    <p>
                      {location?.timezone &&
                      Location.safeParse(location).success
                        ? new Intl.DateTimeFormat(prefs.locale, {
                            timeZone: location.timezone,
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZoneName: "shortOffset",
                          }).format(new Date())
                        : t("select")}
                    </p>
                  </div>
                </div>
                <p className="muted">{t("timezoneAutomatic")}</p>
                <button
                  className="text-button"
                  onClick={() => setCustomZone(!customZone)}
                >
                  {t("changeTimezone")}
                </button>
                {customZone && (
                  <label className="field">
                    <span>{t("timezone")}</span>
                    <select
                      value={location?.timezone || ""}
                      onChange={(e) =>
                        setLocation({ ...location!, timezone: e.target.value })
                      }
                    >
                      {timezones.map((z) => (
                        <option key={z} value={z}>
                          {z.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            {step === 3 && (
              <>
                <h3>{t("method")}</h3>
                <p className="muted">{t("automaticSetupHelp")}</p>
                <div className="setup-selected">
                  <CheckCircle2 size={20} />
                  <span>
                    {selectedMethod.replace(/([a-z])([A-Z])/g, "$1 $2")}
                    <small>
                      {t(
                        selectedMethod === defaults?.method
                          ? defaults?.source === "verified"
                            ? "recommended"
                            : "automaticPreset"
                          : "selectedManually",
                      )}
                    </small>
                  </span>
                </div>
                <details className="setup-details">
                  <summary>{t("changeCalculationMethod")}</summary>
                  <div className="choice-grid">
                    {methods.map((m) => (
                      <label
                        key={m}
                        className={`choice ${selectedMethod === m ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="method"
                          value={m}
                          checked={selectedMethod === m}
                          onChange={() => setMethod(m)}
                        />
                        <span>
                          {m.replace(/([a-z])([A-Z])/g, "$1 $2")}
                          {data.recommendations
                            .filter(
                              (r: any) =>
                                r.method === m &&
                                r.country === location?.country &&
                                (!r.city || r.city === location?.name),
                            )
                            .map((r: any) => (
                              <small className="recommendation" key={r.id}>
                                {t("recommended")} · {r.source}
                              </small>
                            ))}
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
              </>
            )}
            {step === 4 && (
              <>
                <h3>{t("asrMethod")}</h3>
                <p className="muted">{t("asrExplain")}</p>
                <div className="choice-grid asr-choices">
                  {[
                    ["hanafi", t("hanafi")],
                    ["shafi", t("majority")],
                  ].map(([id, label]) => (
                    <label
                      className={`choice ${selectedMadhab === id ? "selected" : ""}`}
                      key={id}
                    >
                      <input
                        type="radio"
                        name="asr"
                        checked={selectedMadhab === id}
                        onChange={() => setMadhab(id)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <details className="setup-details">
                  <summary>{t("advancedSettings")}</summary>
                  <p className="muted">{t("highLatitudeHelp")}</p>
                  <label className="field">
                    <span>{t("highLatitude")}</span>
                    <select
                      value={selectedHigh}
                      onChange={(e) => setHigh(e.target.value)}
                    >
                      {(["middle", "seventh", "angle"] as const).map((k) => (
                        <option key={k} value={k}>
                          {t(k)}
                        </option>
                      ))}
                    </select>
                  </label>
                </details>
              </>
            )}
            {step === 5 && (
              <>
                <div className="confirmation-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h3>{t("confirm")}</h3>
                <dl className="summary-list">
                  {[
                    [t("city"), location?.name],
                    [t("timezone"), location?.timezone],
                    [t("method"), selectedMethod],
                    [
                      t("asrMethod"),
                      selectedMadhab === "hanafi" ? t("hanafi") : t("majority"),
                    ],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
          <div className="wizard-footer">
            <button
              className="button ghost"
              disabled={step === 1}
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
            >
              {t("back")}
            </button>
            <button
              className="button primary"
              disabled={!canContinue || busy}
              onClick={async () => {
                (document.activeElement as HTMLElement)?.blur();
                if (step < 5) {
                  setError("");
                  setStep(step + 1);
                } else {
                  try {
                    const s = PrayerSettings.parse({
                      location,
                      method: selectedMethod,
                      madhab: selectedMadhab,
                      highLatitudeRule: selectedHigh,
                      version: 1,
                      confirmed: true,
                    });
                    setBusy(true);
                    if (
                      Capacitor.isNativePlatform() &&
                      !readLocal(
                        "namoz.notification-permission-requested",
                        false,
                      ) &&
                      (prefs.contentNotifications ||
                        prefs.calendarNotifications)
                    ) {
                      writeLocal(
                        "namoz.notification-permission-requested",
                        true,
                      );
                      await requestLocalNotifications().catch(() => false);
                    }
                    setPrayer(s);
                    localStorage.removeItem("namoz.setup-draft");
                    onClose();
                  } catch {
                    setBusy(false);
                    setError(t("setupBody"));
                  }
                }
              }}
            >
              {step === 5 ? t("finish") : t("next")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
