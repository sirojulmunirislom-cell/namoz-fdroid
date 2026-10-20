package app.namoz.mobile;

import android.content.Context;
import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Capabilities, never device identifiers or inferred vehicle/device categories. */
@CapacitorPlugin(name = "NamozDevice")
public class NamozDevicePlugin extends Plugin {
    @PluginMethod public void setAppearance(PluginCall call) {
        String theme = call.getString("theme");
        if (!"dark".equals(theme) && !"light".equals(theme)) {
            call.reject("Expected light or dark appearance");
            return;
        }
        Activity activity = getActivity();
        if (activity == null) { call.resolve(); return; }
        activity.runOnUiThread(() -> {
            activity.getSharedPreferences("namoz_appearance", Context.MODE_PRIVATE)
                .edit().putString("resolvedTheme", theme).apply();
            applyAppearance(activity, "dark".equals(theme));
            call.resolve();
        });
    }

    static void restoreAppearance(Activity activity) {
        String theme = activity.getSharedPreferences("namoz_appearance", Context.MODE_PRIVATE)
            .getString("resolvedTheme", null);
        boolean dark = theme == null
            ? (activity.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
            : "dark".equals(theme);
        applyAppearance(activity, dark);
    }

    @SuppressWarnings("deprecation")
    private static void applyAppearance(Activity activity, boolean dark) {
        Window window = activity.getWindow();
        int background = Color.parseColor(dark ? "#111d19" : "#f3f5f2");
        // MainActivity owns system-bar padding. Paint those native gutters too;
        // Android 15+ draws transparent bars over this background.
        window.getDecorView().setBackgroundColor(background);
        window.setStatusBarColor(background);
        window.setNavigationBarColor(background);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        bars.setAppearanceLightStatusBars(!dark);
        bars.setAppearanceLightNavigationBars(!dark);
    }

    @PluginMethod public void getCapabilities(PluginCall call) {
        boolean googlePlayServicesAvailable = false;
        JSObject result = new JSObject();
        result.put("googlePlayServicesAvailable", googlePlayServicesAvailable);
        call.resolve(result);
    }
}
