package app.namoz.mobile;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.text.SpannableString;
import android.text.Spanned;
import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.constraints.ConstraintManager;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarLocation;
import androidx.car.app.model.Distance;
import androidx.car.app.model.DistanceSpan;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.MessageTemplate;
import androidx.car.app.model.Metadata;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.ParkedOnlyOnClickListener;
import androidx.car.app.model.Place;
import androidx.car.app.model.PlaceListMapTemplate;
import androidx.car.app.model.PlaceMarker;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/** Host-rendered POI templates. Location is requested only for a visible search. */
final class NamozCarMosquesScreen extends Screen implements DefaultLifecycleObserver {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final LocationManager locations;
    private CarStrings strings;
    private List<CarMosqueData.Mosque> mosques = new ArrayList<>();
    private CarMosqueData.Origin origin;
    private String error;
    private boolean loading, initialized, visible;
    private int generation;
    private long lastSearch;
    private Future<?> work;
    private CarMosqueData.Search request;
    private LocationListener listener;
    private Runnable locationTimeout;

    NamozCarMosquesScreen(CarContext context) {
        super(context);
        locations = (LocationManager) context.getSystemService(CarContext.LOCATION_SERVICE);
        strings = new CarStrings(context);
        getLifecycle().addObserver(this);
    }

    @Override public void onStart(@NonNull LifecycleOwner owner) {
        visible = true;
        strings = new CarStrings(getCarContext());
        if (!initialized) search();
    }

    @Override public void onStop(@NonNull LifecycleOwner owner) {
        visible = false;
        if (loading) initialized = false;
        cancel();
        loading = false;
    }

    @Override public void onDestroy(@NonNull LifecycleOwner owner) { cancel(); executor.shutdownNow(); }

    private boolean permission() {
        return ContextCompat.checkSelfPermission(getCarContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(getCarContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestPermission() {
        getCarContext().requestPermissions(Arrays.asList(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                (approved, rejected) -> {
                    initialized = false;
                    if (visible) search();
                });
    }

    private CarMosqueData.Origin selectedCity() {
        return CarMosqueData.selectedOrigin(getCarContext().getSharedPreferences("namoz_widgets", 0).getString("snapshot", "{}"));
    }

    private void search() {
        if (!visible || loading) return;
        // Refresh taps cannot turn a public free provider into a continuous tracker.
        if (initialized && SystemClock.elapsedRealtime() - lastSearch < 5000) return;
        cancel();
        final int token = generation;
        initialized = true;
        lastSearch = SystemClock.elapsedRealtime();
        error = null;
        origin = null;
        loading = true;
        invalidate();
        if (!permission()) { useSelectedCity(token, strings.permission()); return; }
        if (locations == null) { useSelectedCity(token, strings.noLocation()); return; }
        Location recent = null;
        boolean requested = false;
        listener = new LocationListener() {
            @Override public void onLocationChanged(@NonNull Location location) {
                if (token == generation && listener == this && usable(location)) {
                    stopLocation();
                    fetch(new CarMosqueData.Origin(location.getLatitude(), location.getLongitude(), "", true), token);
                }
            }
            @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
            @Override public void onProviderEnabled(@NonNull String provider) { }
            @Override public void onProviderDisabled(@NonNull String provider) { }
        };
        // Platform providers work on AOSP without Google's fused-location service.
        for (String provider : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
            try {
                if (!locations.isProviderEnabled(provider)) continue;
                Location last = locations.getLastKnownLocation(provider);
                if (usable(last) && (recent == null || last.getAccuracy() < recent.getAccuracy())) recent = last;
                locations.requestLocationUpdates(provider, 1000, 0, listener, Looper.getMainLooper());
                requested = true;
            } catch (SecurityException | IllegalArgumentException ignored) { }
        }
        if (recent != null) {
            stopLocation();
            fetch(new CarMosqueData.Origin(recent.getLatitude(), recent.getLongitude(), "", true), token);
        } else if (!requested) {
            useSelectedCity(token, strings.noLocation());
        } else {
            locationTimeout = () -> useSelectedCity(token, strings.noLocation());
            handler.postDelayed(locationTimeout, 12000);
        }
    }

    private boolean usable(Location location) {
        return location != null && location.getAccuracy() <= 3000 && LocationFixPolicy.usable(
                location.getLatitude(), location.getLongitude(), location.hasAccuracy(), location.getAccuracy(),
                location.getElapsedRealtimeNanos(), SystemClock.elapsedRealtimeNanos(), 60000);
    }

    private void useSelectedCity(int token, String failure) {
        if (token != generation || !visible) return;
        stopLocation();
        CarMosqueData.Origin selected = selectedCity();
        if (selected != null) fetch(selected, token);
        else { loading = false; error = failure; invalidate(); }
    }

    private void fetch(CarMosqueData.Origin searchOrigin, int token) {
        if (token != generation || !visible) return;
        origin = searchOrigin;
        invalidate();
        CarMosqueData.Search searchRequest = new CarMosqueData.Search();
        request = searchRequest;
        work = executor.submit(() -> {
            try {
                List<CarMosqueData.Mosque> found = searchRequest.fetch(searchOrigin);
                handler.post(() -> {
                    if (token != generation || !visible) return;
                    mosques = found; loading = false; error = null; invalidate();
                });
            } catch (Exception failure) {
                handler.post(() -> {
                    if (token != generation || !visible) return;
                    loading = false; error = strings.error(); invalidate();
                });
            }
        });
    }

    private void stopLocation() {
        if (locationTimeout != null) handler.removeCallbacks(locationTimeout);
        locationTimeout = null;
        if (listener != null && locations != null) {
            try { locations.removeUpdates(listener); } catch (SecurityException ignored) { }
        }
        listener = null;
    }

    private void cancel() {
        generation++;
        stopLocation();
        if (request != null) request.cancel();
        request = null;
        if (work != null) work.cancel(true);
        work = null;
    }

    private Action permissionAction() {
        return new Action.Builder().setTitle(strings.location())
                .setOnClickListener(ParkedOnlyOnClickListener.create(this::requestPermission)).build();
    }

    @NonNull @Override public Template onGetTemplate() {
        String title = origin != null && !origin.current ? strings.selected() + ": " + origin.name : strings.title();
        if (error != null) {
            MessageTemplate.Builder message = new MessageTemplate.Builder(error).setTitle(title).setHeaderAction(Action.APP_ICON)
                    .addAction(new Action.Builder().setTitle(strings.retry()).setOnClickListener(this::search).build());
            if (!permission()) message.addAction(permissionAction());
            return message.build();
        }
        PlaceListMapTemplate.Builder template = new PlaceListMapTemplate.Builder().setTitle(title)
                .setHeaderAction(Action.APP_ICON).setCurrentLocationEnabled(permission()).setLoading(loading);
        ActionStrip.Builder actions = new ActionStrip.Builder()
                .addAction(new Action.Builder().setTitle(strings.retry()).setOnClickListener(this::search).build())
                .addAction(new Action.Builder().setTitle(strings.information()).setOnClickListener(() -> getScreenManager().push(new Screen(getCarContext()) {
                    @NonNull @Override public Template onGetTemplate() {
                        return new MessageTemplate.Builder(strings.attribution()).setTitle(strings.information()).setHeaderAction(Action.BACK).build();
                    }
                })).build());
        if (!permission()) actions.addAction(permissionAction());
        template.setActionStrip(actions.build());
        if (getCarContext().getCarAppApiLevel() >= 5) template.setOnContentRefreshListener(this::search);
        if (origin != null) template.setAnchor(new Place.Builder(CarLocation.create(origin.latitude, origin.longitude)).build());
        if (!loading) {
            ItemList.Builder items = new ItemList.Builder().setNoItemsMessage(strings.empty());
            int limit = getCarContext().getCarService(ConstraintManager.class).getContentLimit(ConstraintManager.CONTENT_LIMIT_TYPE_PLACE_LIST);
            for (int i = 0; i < Math.min(mosques.size(), Math.min(limit, 50)); i++) {
                CarMosqueData.Mosque mosque = mosques.get(i);
                Row.Builder row = new Row.Builder().setTitle(mosque.name).setBrowsable(true)
                        .setMetadata(new Metadata.Builder().setPlace(new Place.Builder(CarLocation.create(mosque.latitude, mosque.longitude))
                                .setMarker(new PlaceMarker.Builder().setLabel(String.valueOf(i + 1)).build()).build()).build())
                        .setOnClickListener(() -> getScreenManager().push(new MosqueDetail(getCarContext(), mosque)));
                // A selected-city fallback is not the driver's location. Never display it as such.
                if (origin != null && origin.current) {
                    SpannableString distance = new SpannableString("  · " + strings.straightLine());
                    distance.setSpan(DistanceSpan.create(Distance.create(mosque.metres / 1000, Distance.UNIT_KILOMETERS_P1)), 0, 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    row.addText(distance);
                } else row.addText(strings.selected() + ": " + (origin == null ? "" : origin.name));
                if (!mosque.address.isEmpty()) row.addText(mosque.address);
                items.addItem(row.build());
            }
            template.setItemList(items.build());
        }
        return template.build();
    }

    private final class MosqueDetail extends Screen {
        private final CarMosqueData.Mosque mosque;
        MosqueDetail(CarContext context, CarMosqueData.Mosque mosque) { super(context); this.mosque = mosque; }
        @NonNull @Override public Template onGetTemplate() {
            Row.Builder row = new Row.Builder().setTitle(mosque.name);
            if (!mosque.address.isEmpty()) row.addText(mosque.address);
            row.addText(CarMosqueData.SOURCE);
            Pane pane = new Pane.Builder().addRow(row.build()).addAction(new Action.Builder().setTitle(strings.navigate()).setOnClickListener(() -> {
                try { getCarContext().startCarApp(new Intent(CarContext.ACTION_NAVIGATE, Uri.parse(mosque.navigationUri()))); }
                catch (RuntimeException unavailable) { CarToast.makeText(getCarContext(), strings.noNavigation(), CarToast.LENGTH_LONG).show(); }
            }).build()).build();
            return new PaneTemplate.Builder(pane).setTitle(strings.title()).setHeaderAction(Action.BACK).build();
        }
    }
}
