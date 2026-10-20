import { JamaatSettings } from "../components/JamaatSettings";
import { syncJamaatReminders } from "../jamaat-notifications";
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { stopMosqueTrip } from "../native";
import { nativeCloudPushAvailable } from "../native-device";
import { Settings2, LogIn, User, Shield, Download } from "lucide-react";
import { useApp } from "../store";
import { locales, type Locale, type UserPreferences } from "../../shared/schema";
import { languageNames } from "../i18n";
import { api, send } from "../api";
import { Modal, Toggle, Banner } from "../components/ui";
import {
  enableContentPush,
  disableContentPush,
  requestLocalNotifications,
  notificationPermission,
  syncWebPushPreferences,
  syncCalendarReminders,
} from "../notifications";
export function Account({ onClose }: { onClose: () => void }) {
  const { t, user, setUser, setPrefs, prefs, prayer, data } = useApp();
  const [mode, setMode] = useState<"login" | "register" | "recover" | "delete">(
    "login",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authConfig, setAuthConfig] = useState({
    provider: "password",
    configured: false,
  });
  const [resetSent, setResetSent] = useState(false);
  useEffect(() => {
    let active = true;
    api("/auth/config")
      .then((value) => {
        if (active) {
          setAuthConfig(value);
          if (!value.configured) setError(t("authUnavailable"));
        }
      })
      .catch(() => {
        if (active) setError(t("authUnavailable"));
      });
    return () => {
      active = false;
    };
  }, []);
  const firebase = authConfig.provider === "firebase";
  return (
    <Modal label={t("account")} onClose={onClose}>
      {error && <Banner kind="error">{error}</Banner>}
      {firebase && (
        <p className="muted">
          {t(mode === "delete" ? "firebaseDeleteInfo" : "firebaseAuthInfo")}
        </p>
      )}
      {resetSent && <Banner kind="success">{t("resetEmailSent")}</Banner>}
      {code ? (
        <>
          <Banner kind="success">{t("saved")}</Banner>
          <p>
            {t("source")}: Recovery code — save privately / Сохраните код
            восстановления:
          </p>
          <code className="recovery-code">{code}</code>
          <button className="button primary full" onClick={onClose}>
            {t("close")}
          </button>
        </>
      ) : user && mode !== "delete" ? (
        <>
          <div className="account-card">
            <User />
            <strong>{user.username}</strong>
          </div>
          <button
            className="button secondary full"
            onClick={async () => {
              try {
                setError("");
                if (Capacitor.isNativePlatform()) await disableContentPush();
                else
                  await syncWebPushPreferences(
                    {
                      ...prefs,
                      contentNotifications: false,
                      calendarNotifications: false,
                      jamaatNotifications: false,
                    },
                    prayer,
                    data.pushPublicKey,
                  );
                if (!Capacitor.isNativePlatform())
                  await syncJamaatReminders(data.content, prayer, {
                    ...prefs,
                    jamaatNotifications: false,
                  });
                await send("/auth/logout", {});
                setPrefs({
                  contentNotifications: false,
                  ...(!Capacitor.isNativePlatform()
                    ? {
                        calendarNotifications: false,
                        jamaatNotifications: false,
                      }
                    : {}),
                });
                setUser(null);
                onClose();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {t("logout")}
          </button>
          <button
            className="text-button danger"
            onClick={() => setMode("delete")}
          >
            {t("deleteAccount")}
          </button>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              if (mode === "delete") {
                await send(
                  "/account",
                  { password, ...(firebase ? { username } : {}) },
                  "DELETE",
                );
                for (const key of Object.keys(localStorage))
                  if (key.startsWith("namoz.")) localStorage.removeItem(key);
                setUser(null);
                location.assign("/");
              } else {
                const result = await send(`/auth/${mode}`, {
                  username,
                  password,
                  ...(mode === "recover" && !firebase
                    ? { recoveryCode: recovery }
                    : {}),
                  ...(mode === "recover" && firebase
                    ? { locale: prefs.locale }
                    : {}),
                });
                if (result.resetSent) {
                  setResetSent(true);
                  return;
                }
                setUser(result.user);
                if (result.recoveryCode) setCode(result.recoveryCode);
                else onClose();
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {(mode !== "delete" || firebase) && (
            <label className="field">
              <span>{t(firebase ? "email" : "username")}</span>
              <input
                autoComplete={firebase ? "email" : "username"}
                type={firebase ? "email" : "text"}
                minLength={3}
                maxLength={firebase ? 254 : 40}
                pattern={firebase ? undefined : "[a-zA-Z0-9._-]+"}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          )}
          {mode === "recover" && !firebase && (
            <label className="field">
              <span>Recovery code</span>
              <input
                required
                value={recovery}
                onChange={(e) => setRecovery(e.target.value)}
                autoComplete="off"
              />
            </label>
          )}
          {!(firebase && mode === "recover") && (
            <label className="field">
              <span>{t("password")} · 12+</span>
              <input
                autoComplete={
                  mode === "register" || mode === "recover"
                    ? "new-password"
                    : "current-password"
                }
                type="password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          <button
            className={`button full ${mode === "delete" ? "danger-button" : "primary"}`}
            disabled={busy || !authConfig.configured}
          >
            {t(
              mode === "recover" && firebase
                ? "resetPassword"
                : mode === "delete"
                  ? "deleteAccount"
                  : mode === "register"
                    ? "register"
                    : "login",
            )}
          </button>
          {mode !== "delete" && (
            <div className="account-links">
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setMode(mode === "register" ? "login" : "register")
                }
              >
                {t(mode === "register" ? "login" : "register")}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setMode("recover")}
              >
                {t("resetPassword")}
              </button>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
export function SettingsPage({ onSetup }: { onSetup: () => void }) {
  const { prefs, setPrefs, prayer, t, data, user, pushSyncError } = useApp();
  const [pushBusy, setPushBusy] = useState(false);
  const [cloudPushAvailable, setCloudPushAvailable] = useState<boolean | null>(null);
  const [permission, setPermission] = useState("prompt");
  useEffect(() => {
    const check = () => {
      void nativeCloudPushAvailable().then(setCloudPushAvailable).catch(() => {});
      void notificationPermission()
        .then(setPermission)
        .catch(() => {});
    };
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  const [account, setAccount] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-heading">
        <h1>{t("settings")}</h1>
        <Settings2 />
      </div>
      {error && <Banner kind="error">{error}</Banner>}
      <div className="settings-grid">
        <section className="panel">
          <h2>{t("language")}</h2>
          <label className="field">
            <select
              value={prefs.locale}
              aria-label={t("language")}
              onChange={(e) => setPrefs({ locale: e.target.value as Locale })}
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {languageNames[l]}
                </option>
              ))}
            </select>
          </label>
          <h2>{t("appearance")}</h2>
          <div className="segmented theme-options" role="group" aria-label={t("appearance")}>
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                className={prefs.theme === theme ? "active" : ""}
                key={theme}
                aria-pressed={prefs.theme === theme}
                onClick={() => setPrefs({ theme })}
              >
                {t(theme)}
              </button>
            ))}
          </div>
          <label className="field">
            <span>
              {t("fontSize")} · {Math.round(prefs.fontScale * 100)}%
            </span>
            <input
              type="range"
              min="1"
              max="1.5"
              step="0.1"
              value={prefs.fontScale}
              onChange={(e) => setPrefs({ fontScale: Number(e.target.value) })}
            />
          </label>
          <Toggle
            label={t("transliteration")}
            checked={prefs.showTransliteration}
            onChange={(showTransliteration) =>
              setPrefs({ showTransliteration })
            }
          />
          <Toggle
            label={t("haptics")}
            checked={prefs.haptics}
            onChange={(haptics) => setPrefs({ haptics })}
          />
        </section>
        <section className="panel">
          <h2>{t("prayer")}</h2>
          {prayer ? (
            <dl className="summary-list">
              <div>
                <dt>{t("city")}</dt>
                <dd>{prayer.location.name}</dd>
              </div>
              <div>
                <dt>{t("timezone")}</dt>
                <dd>{prayer.location.timezone}</dd>
              </div>
              <div>
                <dt>{t("method")}</dt>
                <dd>{prayer.method}</dd>
              </div>
              <div>
                <dt>{t("asrMethod")}</dt>
                <dd>{t(prayer.madhab === "hanafi" ? "hanafi" : "majority")}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">{t("setupBody")}</p>
          )}
          <button className="button secondary" onClick={onSetup}>
            {t("edit")}
          </button>
          <h2 className="section-spacer">{t("account")}</h2>
          <button className="button secondary" onClick={() => setAccount(true)}>
            <LogIn size={18} />
            {user ? user.username : t("login")}
          </button>
        </section>
        <section className="panel">
          <h2>{t("notifications")}</h2>
          {pushSyncError && <Banner kind="error">{t("pushSyncError")}</Banner>}
          {cloudPushAvailable === false && <p className="muted">{t("cloudPushUnavailable")}</p>}
          {(prefs.contentNotifications ||
            prefs.calendarNotifications ||
            prefs.jamaatNotifications) && (
            <div className="notification-activation">
              {permission !== "granted" && (
                <p className="muted">
                  {t(
                    permission === "denied"
                      ? "notificationPermissionDeniedHelp"
                      : "notificationPermissionHelp",
                  )}
                </p>
              )}
              <button
                className="button secondary"
                disabled={pushBusy}
                onClick={async () => {
                  setPushBusy(true);
                  setError("");
                  try {
                    if (Capacitor.isNativePlatform()) {
                      if (!(await requestLocalNotifications()))
                        throw new Error(t("pushPermissionDenied"));
                      setPermission("granted");
                      await syncCalendarReminders(
                        data.content,
                        data.months,
                        prayer,
                        prefs.locale,
                        prefs.calendarNotifications,
                        prefs.calendarLeadDays,
                      );
                      await syncJamaatReminders(data.content, prayer, prefs);
                      if (prefs.contentNotifications && await nativeCloudPushAvailable()) {
                        if (!data.nativePushConfigured)
                          throw new Error(t("pushNotConfigured"));
                        if (!user) {
                          setAccount(true);
                          return;
                        }
                        await enableContentPush(
                          data.pushPublicKey,
                          prefs.locale,
                          true,
                        );
                      }
                    } else {
                      if (!user) {
                        setAccount(true);
                        return;
                      }
                      await syncWebPushPreferences(
                        prefs,
                        prayer,
                        data.pushPublicKey,
                        true,
                      );
                      setPermission(await notificationPermission());
                    }
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setPushBusy(false);
                  }
                }}
              >
                {t(
                  permission === "granted"
                    ? "connectNotifications"
                    : "allowNotifications",
                )}
              </button>
            </div>
          )}
          <Toggle
            label={t("contentNotifications")}
            checked={prefs.contentNotifications && cloudPushAvailable !== false}
            disabled={pushBusy || cloudPushAvailable === false}
            onChange={async (value) => {
              setPushBusy(true);
              setError("");
              try {
                if (value) setPrefs({ contentNotifications: true });
                if (value && !user) {
                  setAccount(true);
                  return;
                }
                if (!Capacitor.isNativePlatform())
                  await syncWebPushPreferences(
                    { ...prefs, contentNotifications: value },
                    prayer,
                    data.pushPublicKey,
                    value,
                  );
                else if (value)
                  await enableContentPush(
                    data.pushPublicKey,
                    prefs.locale,
                    data.nativePushConfigured,
                  );
                else await disableContentPush();
                setPrefs({ contentNotifications: value });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setPushBusy(false);
              }
            }}
          />
          <div className="calendar-reminder-settings">
            <Toggle
              label={t("calendarNotifications")}
              checked={prefs.calendarNotifications}
              disabled={pushBusy}
              description={t("islamicEventsHelp")}
              onChange={async (value) => {
                setPushBusy(true);
                setError("");
                try {
                  if (value) setPrefs({ calendarNotifications: true });
                  if (value && !prayer)
                    throw new Error(t("calendarSetupRequired"));
                  if (Capacitor.isNativePlatform()) {
                    if (value && !(await requestLocalNotifications()))
                      throw new Error(t("pushPermissionDenied"));
                    setPermission(await notificationPermission());
                    await syncCalendarReminders(
                      data.content,
                      data.months,
                      prayer,
                      prefs.locale,
                      value,
                      prefs.calendarLeadDays,
                    );
                  } else {
                    if (value && !user) {
                      setAccount(true);
                      return;
                    }
                    await syncWebPushPreferences(
                      { ...prefs, calendarNotifications: value },
                      prayer,
                      data.pushPublicKey,
                      value,
                    );
                  }
                  setPrefs({ calendarNotifications: value });
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setPushBusy(false);
                }
              }}
            />
            <label className="field calendar-lead">
              <span>{t("daysBefore")}</span>
              <select
                disabled={!prefs.calendarNotifications || pushBusy}
                value={prefs.calendarLeadDays}
                onChange={(e) =>
                  setPrefs({ calendarLeadDays: Number(e.target.value) })
                }
              >
                {[1, 2, 3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {d === 1
                      ? t("oneDayBefore")
                      : t(d < 5 ? "fewDaysBefore" : "daysBeforeValue").replace(
                          "{days}",
                          String(d),
                        )}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <JamaatSettings onAccount={() => setAccount(true)} />
          <Toggle
            label={t("fullScreen")}
            checked={prefs.fullScreenNewSunnah}
            onChange={(fullScreenNewSunnah) =>
              setPrefs({ fullScreenNewSunnah })
            }
          />
          <Toggle
            label={t("mosqueDua")}
            checked={prefs.mosqueDua}
            onChange={(mosqueDua) => setPrefs({ mosqueDua })}
          />
          {Capacitor.getPlatform() === "android" && (
            <Toggle
              label={t("mosqueExit")}
              description={t("tripDisclosure")}
              checked={prefs.mosqueExitReminder}
              onChange={(value) => {
                setPrefs({ mosqueExitReminder: value });
                if (!value) void stopMosqueTrip();
              }}
            />
          )}
        </section>
        <section className="panel">
          <h2>{t("privacy")}</h2>
          <Toggle
            label={t("analytics")}
            description={t("analyticsHelp")}
            checked={prefs.analytics}
            onChange={(analytics) => setPrefs({ analytics, ...(!analytics ? { audienceStatistics:false } : {}) })}
          />
          {prefs.analytics && <div className="audience-preferences">
            <h3>{t("audienceOptional")}</h3>
            <p className="muted">{t("audienceHelp")}</p>
            <label className="field"><span>{t("audienceAge")}</span>
              <select aria-label={t("audienceAge")} value={prefs.audienceAgeGroup} onChange={e=>{
                const audienceAgeGroup=e.target.value as UserPreferences["audienceAgeGroup"];
                setPrefs({audienceAgeGroup,...(!audienceAgeGroup || audienceAgeGroup==='under18' ? {audienceStatistics:false,audienceGender:'' as const} : {})});
              }}>
                <option value="">{t("audienceSkip")}</option>
                <option value="under18">{t("audienceUnder18")}</option>
                {["18-24","25-34","35-44","45-54","55-64","65+"].map(value=><option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            {prefs.audienceAgeGroup && prefs.audienceAgeGroup!=='under18' && <>
              <label className="field"><span>{t("audienceGender")}</span>
                <select aria-label={t("audienceGender")} value={prefs.audienceGender} onChange={e=>setPrefs({audienceGender:e.target.value as UserPreferences["audienceGender"]})}>
                  <option value="">{t("audienceSkip")}</option><option value="male">{t("audienceMale")}</option><option value="female">{t("audienceFemale")}</option><option value="other">{t("audienceOther")}</option>
                </select>
              </label>
              <Toggle label={t("audienceConsent")} description={t("audienceConsentHelp")} checked={prefs.audienceStatistics} onChange={audienceStatistics=>setPrefs({audienceStatistics})}/>
            </>}
            <button className="text-button" onClick={()=>setPrefs({audienceStatistics:false,audienceAgeGroup:'',audienceGender:''})}>{t("audienceClear")}</button>
          </div>}
          <button className="text-button" onClick={() => setPrivacy(true)}>
            <Shield size={16} />
            {t("privacy")}
          </button>
        </section>
      </div>
      {account && <Account onClose={() => setAccount(false)} />}{" "}
      {privacy && (
        <Modal label={t("privacy")} onClose={() => setPrivacy(false)}>
          <p>{t("analyticsHelp")}</p>
          <p>{t("audienceHelp")}</p>
          <p>{t("audienceConsentHelp")}</p>
          <p>{t("locationHelp")}</p>
          <p className="muted">{t("privacyStorage")}</p>
          <p className="muted">{t("firebaseAuthInfo")}</p>
          <p className="muted">{t("firebaseDeleteInfo")}</p>
        </Modal>
      )}
    </>
  );
}
