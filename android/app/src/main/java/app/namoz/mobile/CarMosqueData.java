package app.namoz.mobile;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import okhttp3.CookieJar;
import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/** Bounded read-only search using the same free OSM-backed provider as the app. */
final class CarMosqueData {
    static final String SOURCE = "© OpenStreetMap contributors · ODbL";
    static final String ENDPOINT = "https://namoz.namoz-prayer-bcaf08.workers.dev/api/mosques";
    // Capacitor installs a process-wide CookieHandler. Use an isolated, explicitly cookieless
    // client so the location query cannot inherit a signed-in WebView session.
    static final OkHttpClient HTTP = new OkHttpClient.Builder()
            .cookieJar(CookieJar.NO_COOKIES)
            .connectTimeout(8, TimeUnit.SECONDS).readTimeout(25, TimeUnit.SECONDS)
            .callTimeout(33, TimeUnit.SECONDS).retryOnConnectionFailure(false)
            .followRedirects(false).followSslRedirects(false).build();

    static final class Origin {
        final double latitude, longitude;
        final String name;
        final boolean current;
        Origin(double latitude, double longitude, String name, boolean current) {
            if (!validCoordinates(latitude, longitude)) throw new IllegalArgumentException("Coordinates");
            this.latitude = latitude; this.longitude = longitude;
            this.name = clean(name, 60); this.current = current;
        }
    }

    static final class Mosque {
        final String id, name, address;
        final double latitude, longitude, metres;
        Mosque(String id, String name, String address, double latitude, double longitude, Origin origin) {
            this.id = id; this.name = clean(name, 100); this.address = clean(address, 160);
            this.latitude = latitude; this.longitude = longitude;
            metres = distance(origin.latitude, origin.longitude, latitude, longitude);
        }
        String navigationUri() { return String.format(Locale.US, "geo:%.6f,%.6f", latitude, longitude); }
    }

    static boolean validCoordinates(double latitude, double longitude) {
        return Double.isFinite(latitude) && Double.isFinite(longitude)
                && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }

    static Origin selectedOrigin(String snapshot) {
        try {
            JSONObject data = new JSONObject(snapshot);
            if (!data.optBoolean("confirmed")) return null;
            JSONObject location = data.optJSONObject("location");
            if (location == null) return null;
            double latitude = location.optDouble("latitude", Double.NaN);
            double longitude = location.optDouble("longitude", Double.NaN);
            if (!validCoordinates(latitude, longitude)) return null;
            return new Origin(latitude, longitude, location.optString("name", ""), false);
        } catch (JSONException e) { return null; }
    }

    static String searchUrl(Origin origin) {
        // Match the provider's approximately 100 m cache grid; do not send extra precision.
        return String.format(Locale.US, "%s?lat=%.3f&lon=%.3f", ENDPOINT, origin.latitude, origin.longitude);
    }

    static final class Search {
        private volatile Call call;
        private volatile boolean cancelled;

        void cancel() {
            cancelled = true;
            Call active = call;
            if (active != null) active.cancel();
        }

        List<Mosque> fetch(Origin origin) throws IOException, JSONException {
            Request request = new Request.Builder().url(searchUrl(origin))
                    .header("Accept", "application/json").header("User-Agent", "Namoz-AndroidAuto/1.0").build();
            // No cookies, user identifiers, analytics, accounts or continuous location tracking.
            call = HTTP.newCall(request);
            if (cancelled) call.cancel();
            try (Response response = call.execute()) {
                if (response.code() != 200 || response.body() == null) throw new IOException("Mosque provider unavailable");
                try (InputStream input = response.body().byteStream(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[4096];
                    int length;
                    while ((length = input.read(buffer)) != -1) {
                        if (Thread.currentThread().isInterrupted()) throw new IOException("Cancelled");
                        if (bytes.size() + length > 512 * 1024) throw new IOException("Response too large");
                        bytes.write(buffer, 0, length);
                    }
                    return parse(new String(bytes.toByteArray(), StandardCharsets.UTF_8), origin);
                }
            }
        }
    }

    static List<Mosque> parse(String json, Origin origin) throws JSONException {
        JSONArray rows = new JSONArray(json);
        List<Mosque> result = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < Math.min(rows.length(), 500); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null) continue;
            double latitude = row.optDouble("latitude", Double.NaN), longitude = row.optDouble("longitude", Double.NaN);
            String id = row.optString("id", ""), name = clean(row.optString("name", ""), 100);
            if (!validCoordinates(latitude, longitude) || id.isEmpty() || name.isEmpty() || !seen.add(id)) continue;
            Mosque mosque = new Mosque(id, name, row.optString("address", ""), latitude, longitude, origin);
            // A search is within 5 km; allow a small margin for rounded query coordinates.
            if (mosque.metres <= 5500) result.add(mosque);
        }
        result.sort(Comparator.comparingDouble(mosque -> mosque.metres));
        return result;
    }

    static double distance(double lat1, double lon1, double lat2, double lon2) {
        double a = Math.pow(Math.sin(Math.toRadians(lat2 - lat1) / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.pow(Math.sin(Math.toRadians(lon2 - lon1) / 2), 2);
        return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    }

    private static String clean(String value, int limit) {
        String text = value.replaceAll("[\\p{Cntrl}\\u202a-\\u202e\\u2066-\\u2069]", " ").trim();
        return text.length() > limit ? text.substring(0, limit) : text;
    }
}
