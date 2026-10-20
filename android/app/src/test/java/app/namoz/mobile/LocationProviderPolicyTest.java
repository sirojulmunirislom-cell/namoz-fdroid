package app.namoz.mobile;

import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;
import static org.junit.Assert.*;

public class LocationProviderPolicyTest {
    @Test public void gpsOnlyAospCanProvideApproximatePositionOnAndroid12OrNewer() {
        assertEquals(Collections.singletonList("gps"),
            LocationProviderPolicy.permitted(Collections.singletonList("gps"), 31, false, true));
    }

    @Test public void olderSystemsKeepGpsFineGateButAllowNetworkApproximation() {
        assertEquals(Collections.singletonList("network"),
            LocationProviderPolicy.permitted(Arrays.asList("gps", "network"), 30, false, true));
        assertEquals(Collections.singletonList("gps"),
            LocationProviderPolicy.permitted(Collections.singletonList("gps"), 24, true, true));
    }

    @Test public void deniedPermissionAndAbsentProvidersNeverProduceFallbackCoordinates() {
        assertTrue(LocationProviderPolicy.permitted(Arrays.asList("gps", "network", "fused"), 36, false, false).isEmpty());
        assertTrue(LocationProviderPolicy.permitted(Collections.emptyList(), 36, true, true).isEmpty());
        assertTrue(LocationProviderPolicy.permitted(Collections.singletonList("passive"), 36, false, true).isEmpty());
    }
}
