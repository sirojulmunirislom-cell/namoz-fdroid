package app.namoz.mobile;

import java.util.ArrayList;
import java.util.List;

/** Android 12+ can obfuscate GPS fixes for callers with approximate permission. */
final class LocationProviderPolicy {
    private LocationProviderPolicy() {}

    static List<String> permitted(List<String> enabled, int sdk, boolean precise, boolean coarse) {
        List<String> result = new ArrayList<>();
        if (!precise && !coarse) return result;
        if ((precise || sdk >= 31) && enabled.contains("gps")) result.add("gps");
        if (enabled.contains("network")) result.add("network");
        if (enabled.contains("fused")) result.add("fused");
        return result;
    }
}
