package app.namoz.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class TripStateTest {
 @Test public void walkingAwayWithoutArrivalNeverNotifies(){TripState s=new TripState(0);assertFalse(s.update(500,5,60000));assertFalse(s.update(1000,5,300000));}
 @Test public void walkingPastDoesNotCountAsArrival(){TripState s=new TripState(0);assertFalse(s.update(50,5,1000));assertFalse(s.update(300,5,60000));assertFalse(s.update(400,5,300000));}
 @Test public void requiresDwellThenSustainedDepartureAndOnlyNotifiesOnce(){TripState s=new TripState(0);for(long n=1000;n<=181000;n+=15000)assertFalse(s.update(40,5,n));assertFalse(s.update(300,5,200000));assertTrue(s.update(300,5,231000));assertFalse(s.update(400,5,300000));}
 @Test public void ignoresInaccurateAndExpiredLocations(){TripState s=new TripState(0);assertFalse(s.update(0,500,1000));assertFalse(s.update(0,500,200000));assertFalse(s.update(300,5,300000));assertFalse(s.update(0,5,TripState.MAX_DURATION+1));assertTrue(s.expired(TripState.MAX_DURATION+1));}
}
