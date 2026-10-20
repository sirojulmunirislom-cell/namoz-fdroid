package app.namoz.mobile;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import android.os.Bundle;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.view.View;
import android.webkit.WebView;
import android.util.Log;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
 private boolean cacheMigrationStarted = false;

 @Override public void onCreate(Bundle state) {
  registerPlugin(NamozCompassPlugin.class);
  registerPlugin(NamozWidgetsPlugin.class);
  registerPlugin(NamozTripPlugin.class);
  registerPlugin(NamozLocationPlugin.class);
  registerPlugin(NamozDevicePlugin.class);
  super.onCreate(state);
  if (getBridge() == null) return;
  keepWebViewInsideSystemBars();
  NamozDevicePlugin.restoreAppearance(this);
  // Resource cache only: retain all preferences and stored application data.
  getBridge().getWebView().clearCache(true);
  getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
   @Override public void onPageFinished(WebView view, String url) {
    super.onPageFinished(view, url);
    Uri actual = Uri.parse(url);
    Uri expected = Uri.parse(getBridge().getAppUrl());
    if (cacheMigrationStarted || !java.util.Objects.equals(actual.getScheme(), expected.getScheme())
        || !java.util.Objects.equals(actual.getAuthority(), expected.getAuthority())) return;
    cacheMigrationStarted = true;
    try (InputStream input = getAssets().open("native-web-cache-reset.js");
         ByteArrayOutputStream output = new ByteArrayOutputStream()) {
     byte[] buffer = new byte[4096];
     int count;
     while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
     view.evaluateJavascript(new String(output.toByteArray(), StandardCharsets.UTF_8), null);
    } catch (Exception error) {
     Log.w("Namoz", "Cannot migrate interface cache", error);
    }
   }
  });
 }

 @SuppressWarnings("deprecation")
 private void keepWebViewInsideSystemBars() {
  // Android 15+ enforces edge-to-edge. Use the same explicit layout on older
  // versions, so there is only one owner of the safe area on every device.
  WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
  View decor = getWindow().getDecorView();
  ViewCompat.setOnApplyWindowInsetsListener(decor, (view, insets) -> {
   Insets bars = insets.getInsets(
       WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
   Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
   // Replace padding, never add it. IME already includes the navigation area;
   // taking the maximum avoids adding the navigation bar twice to the keyboard.
   view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
   // The HTML viewport (including full-screen dialogs and 100dvh) now ends above
   // the native bars. Forward zero safe-area values to prevent a second CSS inset.
   // Do not return CONSUMED: WebView needs future insets updates after rotation.
   return new WindowInsetsCompat.Builder(insets)
       .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.NONE)
       // Older WebViews may inspect the DisplayCutout object rather than typed
       // insets. Its safe area is already included in the parent padding above.
       .setDisplayCutout(null)
       .build()
       // API 28 has no native WindowInsets.Builder: its compatibility builder
       // cannot clear DisplayCutout, but consuming that single type can.
       .consumeDisplayCutout();
  });
  ViewCompat.requestApplyInsets(decor);
 }

 @Override public void onConfigurationChanged(Configuration configuration) {
  super.onConfigurationChanged(configuration);
  ViewCompat.requestApplyInsets(getWindow().getDecorView());
 }

 @Override protected void onNewIntent(Intent intent) {
  super.onNewIntent(intent);
  setIntent(intent);
  if(getBridge()!=null) getBridge().getWebView().post(() ->
   getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('namoz-launch'))", null));
 }
}
