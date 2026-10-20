package app.namoz.mobile;

/** Validate genuine fixes using monotonic age, even after a device clock change. */
final class LocationFixPolicy {
    private LocationFixPolicy() {}

    static boolean usable(double latitude, double longitude, boolean hasAccuracy,
                          float accuracy, long fixNanos, long nowNanos, long maximumAgeMillis) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
            || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
            || !hasAccuracy || !Float.isFinite(accuracy) || accuracy < 0
            || fixNanos <= 0 || nowNanos < fixNanos || maximumAgeMillis < 0) return false;
        return nowNanos - fixNanos <= Math.min(maximumAgeMillis, 60000L) * 1000000L;
    }
}
