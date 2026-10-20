package app.namoz.mobile;

import android.Manifest;
import android.content.Context;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import androidx.core.location.LocationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONObject;

/** Foreground, one-shot GPS/network fixes using Android APIs, without Google services. */
@CapacitorPlugin(name = "NamozLocation", permissions = {
    @Permission(alias = "location", strings = {Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}),
    @Permission(alias = "coarseLocation", strings = {Manifest.permission.ACCESS_COARSE_LOCATION})
})
public class NamozLocationPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Set<PositionRequest> requests = new HashSet<>();

    @Override @PluginMethod public void checkPermissions(PluginCall call) {
        // Unlike the fused provider, a permission check needs neither GMS nor GPS.
        super.checkPermissions(call);
    }

    @Override @PluginMethod public void requestPermissions(PluginCall call) {
        boolean requirePrecise = call.getBoolean("requirePrecise", false);
        if (getPermissionState("location") == PermissionState.GRANTED
            || (!requirePrecise && getPermissionState("coarseLocation") == PermissionState.GRANTED)) {
            checkPermissions(call);
        } else {
            requestPermissionForAlias("location", call, "locationPermissionResult");
        }
    }

    @PermissionCallback private void locationPermissionResult(PluginCall call) {
        checkPermissions(call);
    }

    @PluginMethod public void getCurrentPosition(PluginCall call) {
        main.post(() -> {
            if (getPermissionState("coarseLocation") != PermissionState.GRANTED
                && getPermissionState("location") != PermissionState.GRANTED) {
                call.reject("Location permission was not granted", "OS-PLUG-GLOC-0003");
                return;
            }
            LocationManager manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (manager == null) {
                call.reject("Location hardware is unavailable", "OS-PLUG-GLOC-0002");
                return;
            }
            if (!LocationManagerCompat.isLocationEnabled(manager)) {
                call.reject("Device location is disabled", "OS-PLUG-GLOC-0007");
                return;
            }
            PositionRequest request = new PositionRequest(call, manager);
            requests.add(request);
            request.start();
        });
    }

    @Override protected void handleOnDestroy() {
        main.post(() -> {
            for (PositionRequest request : new ArrayList<>(requests))
                request.fail("Location request was cancelled", "OS-PLUG-GLOC-0002");
        });
    }

    private final class PositionRequest implements LocationListener {
        private final PluginCall call;
        private final LocationManager manager;
        private final List<String> providers = new ArrayList<>();
        private boolean finished;
        private final Runnable timeout = () -> fail("Location request timed out", "OS-PLUG-GLOC-0010");

        PositionRequest(PluginCall call, LocationManager manager) {
            this.call = call;
            this.manager = manager;
        }

        @SuppressWarnings("MissingPermission") void start() {
            try {
                boolean precise = getPermissionState("location") == PermissionState.GRANTED;
                boolean coarse = getPermissionState("coarseLocation") == PermissionState.GRANTED;
                List<String> enabled = manager.getProviders(true);
                // API 31+ allows GPS with coarse permission; Android itself
                // obfuscates its output. Older systems retain their fine gate.
                providers.addAll(LocationProviderPolicy.permitted(enabled, Build.VERSION.SDK_INT, precise, coarse));
                if (providers.isEmpty()) {
                    fail("No enabled location provider is available", "OS-PLUG-GLOC-0002");
                    return;
                }
                long maximumAge = Math.max(0, Math.min(60000, call.getInt("maximumAge", 0)));
                Location cached = null;
                boolean restricted = false;
                if (maximumAge > 0) {
                    for (String provider : providers) {
                        try {
                            Location fix = manager.getLastKnownLocation(provider);
                            if (usable(fix, maximumAge) && (cached == null
                                || fix.getAccuracy() < cached.getAccuracy()
                                || (fix.getAccuracy() == cached.getAccuracy()
                                    && fix.getElapsedRealtimeNanos() > cached.getElapsedRealtimeNanos()))) cached = fix;
                        } catch (SecurityException ignored) {
                            restricted = true;
                        } catch (IllegalArgumentException ignored) {
                            // Continue with other providers if an OEM removes one.
                        }
                    }
                }
                if (cached != null) {
                    succeed(cached);
                    return;
                }
                int started = 0;
                for (String provider : providers) {
                    try {
                        manager.requestLocationUpdates(provider, 1000L, 0f, this, Looper.getMainLooper());
                        started++;
                    } catch (SecurityException ignored) {
                        // An OEM may restrict a provider that standard Android
                        // allows. Do not discard other authorized providers.
                        restricted = true;
                    } catch (IllegalArgumentException ignored) {
                        // An OEM provider may disappear between listing and use.
                    }
                }
                if (started == 0) {
                    if (restricted) fail("Location permission was not granted", "OS-PLUG-GLOC-0003");
                    else fail("Location providers are unavailable", "OS-PLUG-GLOC-0002");
                    return;
                }
                main.postDelayed(timeout, Math.max(1000, Math.min(30000, call.getInt("timeout", 20000))));
            } catch (SecurityException error) {
                fail("Location permission was not granted", "OS-PLUG-GLOC-0003");
            } catch (RuntimeException error) {
                fail("Location providers are unavailable", "OS-PLUG-GLOC-0002");
            }
        }

        private boolean usable(Location fix, long maximumAge) {
            return fix != null && LocationFixPolicy.usable(fix.getLatitude(), fix.getLongitude(),
                fix.hasAccuracy(), fix.getAccuracy(), fix.getElapsedRealtimeNanos(),
                SystemClock.elapsedRealtimeNanos(), maximumAge);
        }

        private void cleanup() {
            finished = true;
            main.removeCallbacks(timeout);
            try { manager.removeUpdates(this); } catch (RuntimeException ignored) {}
            requests.remove(this);
        }

        void fail(String message, String code) {
            if (finished) return;
            cleanup();
            call.reject(message, code);
        }

        private void succeed(Location fix) {
            if (finished) return;
            cleanup();
            JSObject coords = new JSObject();
            coords.put("latitude", fix.getLatitude());
            coords.put("longitude", fix.getLongitude());
            coords.put("accuracy", fix.getAccuracy());
            coords.put("altitude", fix.hasAltitude() ? fix.getAltitude() : JSONObject.NULL);
            coords.put("altitudeAccuracy", JSONObject.NULL);
            coords.put("speed", fix.hasSpeed() ? fix.getSpeed() : JSONObject.NULL);
            coords.put("heading", fix.hasBearing() ? fix.getBearing() : JSONObject.NULL);
            JSObject result = new JSObject();
            result.put("coords", coords);
            result.put("timestamp", fix.getTime());
            call.resolve(result);
        }

        @Override public void onLocationChanged(Location fix) {
            if (usable(fix, 60000L)) succeed(fix);
        }
        @Override public void onProviderEnabled(String provider) {}
        @Override public void onProviderDisabled(String provider) {
            if (!LocationManagerCompat.isLocationEnabled(manager))
                fail("Device location is disabled", "OS-PLUG-GLOC-0007");
        }
        @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    }
}
