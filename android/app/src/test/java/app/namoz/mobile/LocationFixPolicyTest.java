package app.namoz.mobile;

import org.junit.Test;
import static org.junit.Assert.*;

public class LocationFixPolicyTest {
    private final long now = 1000000000000L;

    @Test public void acceptsFreshMeasuredCoordinatesIncludingApproximateFixes() {
        assertTrue(LocationFixPolicy.usable(38.72251, 35.48751, true, 2500, now - 30000000000L, now, 60000));
        assertTrue(LocationFixPolicy.usable(0, 0, true, 10, now - 1000000L, now, 60000));
    }

    @Test public void rejectsOldFutureUnmeasuredAndInvalidFixes() {
        assertFalse(LocationFixPolicy.usable(38.72, 35.49, true, 5, now - 61000000000L, now, 60000));
        assertFalse(LocationFixPolicy.usable(38.72, 35.49, true, 5, now + 1, now, 60000));
        assertFalse(LocationFixPolicy.usable(38.72, 35.49, false, 0, now - 1, now, 60000));
        assertFalse(LocationFixPolicy.usable(Double.NaN, 35.49, true, 5, now - 1, now, 60000));
        assertFalse(LocationFixPolicy.usable(38.72, 181, true, 5, now - 1, now, 60000));
        assertFalse(LocationFixPolicy.usable(38.72, 35.49, true, Float.POSITIVE_INFINITY, now - 1, now, 60000));
        assertFalse(LocationFixPolicy.usable(38.72, 35.49, true, 5, 0, now, 60000));
    }

    @Test public void obeysCallerAgeLimitAndNeverAcceptsMoreThanOneMinute() {
        assertFalse(LocationFixPolicy.usable(38.72, 35.49, true, 5, now - 10000000001L, now, 10000));
        assertFalse(LocationFixPolicy.usable(38.72, 35.49, true, 5, now - 61000000000L, now, 86400000));
    }
}
