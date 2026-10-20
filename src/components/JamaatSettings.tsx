import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useApp } from "../store";
import { jamaatPool, jamaatPrayers } from "../../shared/jamaat";
import {
  requestLocalNotifications,
  syncWebPushPreferences,
} from "../notifications";
import { syncJamaatReminders } from "../jamaat-notifications";
import { Toggle, Banner } from "./ui";

export function JamaatSettings({ onAccount }: { onAccount: () => void }) {
  const { prefs, setPrefs, prayer, data, t, user } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const native = Capacitor.isNativePlatform();
  return (
    <section className="jamaat-settings">
      <Toggle
        label={t("jamaat")}
        description={t("jamaatHelp")}
        checked={prefs.jamaatNotifications}
        disabled={busy}
        onChange={async (enabled) => {
          setBusy(true);
          setError("");
          const next = { ...prefs, jamaatNotifications: enabled };
          try {
            if (enabled && !prayer) throw new Error(t("calendarSetupRequired"));
            if (native) {
              if (enabled && !(await requestLocalNotifications()))
                throw new Error(t("pushPermissionDenied"));
            } else {
              if (enabled && !user) {
                onAccount();
                return;
              }
              await syncWebPushPreferences(
                next,
                prayer,
                data.pushPublicKey,
                enabled,
              );
            }
            setPrefs({ jamaatNotifications: enabled });
            await syncJamaatReminders(data.content, prayer, next);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && <Banner kind="error">{error}</Banner>}
      <label className="field">
        <span>{t("minutesBefore")}</span>
        <select
          value={prefs.jamaatLeadMinutes}
          disabled={busy || !prefs.jamaatNotifications}
          onChange={(e) =>
            setPrefs({ jamaatLeadMinutes: Number(e.target.value) })
          }
        >
          {[5, 10, 15, 20, 30, 60].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <fieldset disabled={busy || !prefs.jamaatNotifications}>
        <legend>{t("prayer")}</legend>
        <div className="jamaat-prayers">
          {jamaatPrayers.map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={prefs.jamaatPrayers.includes(key)}
                onChange={(e) =>
                  setPrefs({
                    jamaatPrayers: e.target.checked
                      ? [...prefs.jamaatPrayers, key]
                      : prefs.jamaatPrayers.filter((k) => k !== key),
                  })
                }
              />
              {t(key)}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="muted">{t("jamaatQueue")}</p>
      {!jamaatPool(data.content, prefs.locale).length && (
        <p className="muted">{t("jamaatEmpty")}</p>
      )}
      <p className="muted">{t(native ? "jamaatOffline" : "jamaatWeb")}</p>
    </section>
  );
}
