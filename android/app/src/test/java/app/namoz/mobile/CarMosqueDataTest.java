package app.namoz.mobile;

import org.junit.Test;
import org.json.JSONException;
import java.util.List;
import java.util.Locale;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import static org.junit.Assert.*;

public class CarMosqueDataTest {
    private final CarMosqueData.Origin kayseri = new CarMosqueData.Origin(38.7225, 35.4875, "Kayseri", true);

    @Test public void carTransportNeverInheritsSignedInCapacitorCookies() throws Exception {
        CookieHandler before = CookieHandler.getDefault();
        try (MockWebServer server = new MockWebServer()) {
            server.start();
            server.enqueue(new MockResponse().setBody("[]"));
            CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
            HttpCookie session = new HttpCookie("namoz_session", "private-test-session");
            session.setPath("/");
            cookies.getCookieStore().add(server.url("/").uri(), session);
            CookieHandler.setDefault(cookies);
            try (Response response = CarMosqueData.HTTP.newCall(new Request.Builder().url(server.url("/api/mosques")).build()).execute()) {
                assertEquals(200, response.code());
            }
            assertNull(server.takeRequest().getHeader("Cookie"));
        } finally { CookieHandler.setDefault(before); }
    }

    @Test public void providerCoordinatesAreRoundedAndLocaleIndependent() {
        Locale before = Locale.getDefault();
        try {
            Locale.setDefault(Locale.GERMANY);
            assertEquals(CarMosqueData.ENDPOINT + "?lat=38.723&lon=35.488", CarMosqueData.searchUrl(kayseri));
            assertFalse(CarMosqueData.searchUrl(kayseri).contains("Kayseri"));
        } finally { Locale.setDefault(before); }
    }

    @Test public void selectedCityRequiresConfirmedValidSnapshotAndNeverClaimsCurrentLocation() {
        assertNull(CarMosqueData.selectedOrigin("{}"));
        assertNull(CarMosqueData.selectedOrigin("{\"confirmed\":true,\"city\":\"Toshkent\"}"));
        assertNull(CarMosqueData.selectedOrigin("{\"confirmed\":true,\"location\":{\"latitude\":91,\"longitude\":35}}"));
        CarMosqueData.Origin saved = CarMosqueData.selectedOrigin("{\"confirmed\":true,\"location\":{\"name\":\"Kayseri\",\"latitude\":38.7225,\"longitude\":35.4875}}");
        assertNotNull(saved);
        assertFalse(saved.current);
        assertEquals("Kayseri", saved.name);
        assertEquals(38.7225, saved.latitude, 0.000001);
    }

    @Test public void rejectsIncompleteCoordinatesDuplicatesAndOutOfRadiusThenSortsNearest() throws Exception {
        String json = "["
                + "{\"id\":\"far\",\"name\":\"Further\",\"latitude\":38.73,\"longitude\":35.49},"
                + "{\"id\":\"near\",\"name\":\"Nearby\",\"latitude\":38.723,\"longitude\":35.488},"
                + "{\"id\":\"near\",\"name\":\"Duplicate\",\"latitude\":38.723,\"longitude\":35.488},"
                + "{\"id\":\"missing\",\"name\":\"Missing longitude\",\"latitude\":38.7225},"
                + "{\"id\":\"invalid\",\"name\":\"Invalid\",\"latitude\":190,\"longitude\":35},"
                + "{\"id\":\"abroad\",\"name\":\"Other city\",\"latitude\":41,\"longitude\":69},"
                + "{\"id\":\"unnamed\",\"name\":\"  \",\"latitude\":38.7225,\"longitude\":35.4875}]";
        List<CarMosqueData.Mosque> mosques = CarMosqueData.parse(json, kayseri);
        assertEquals(2, mosques.size());
        assertEquals("near", mosques.get(0).id);
        assertTrue(mosques.get(0).metres < mosques.get(1).metres);
        assertEquals("geo:38.723000,35.488000", mosques.get(0).navigationUri());
    }

    @Test(expected=JSONException.class) public void providerErrorIsNotMisreportedAsEmptySearch() throws Exception {
        CarMosqueData.parse("{\"error\":\"temporarily unavailable\"}", kayseri);
    }

    @Test public void distanceHandlesIdenticalAndOppositeCoordinates() {
        assertEquals(0, CarMosqueData.distance(38.72, 35.48, 38.72, 35.48), 0.001);
        assertEquals(111195, CarMosqueData.distance(0, 0, 0, 1), 1);
        assertTrue(Double.isFinite(CarMosqueData.distance(90, 0, -90, 0)));
        assertFalse(CarMosqueData.validCoordinates(Double.NaN, 0));
    }
}
