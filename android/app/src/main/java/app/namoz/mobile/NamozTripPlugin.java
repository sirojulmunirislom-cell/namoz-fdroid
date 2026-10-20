package app.namoz.mobile;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="NamozTrip")
public class NamozTripPlugin extends Plugin {
 @PluginMethod public void start(PluginCall call){
  if(ContextCompat.checkSelfPermission(getContext(),Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){call.reject("Precise location permission is required for an exit reminder");return;}
  Double lat=call.getDouble("latitude"),lon=call.getDouble("longitude");String content=call.getString("contentId");
  if(lat==null||lon==null||content==null||!content.matches("[a-z0-9][a-z0-9_-]{0,63}")||lat < -90||lat >90||lon < -180||lon>180){call.reject("Invalid mosque or dua");return;}
  Intent i=new Intent(getContext(),MosqueTripService.class);i.putExtra("latitude",lat);i.putExtra("longitude",lon);i.putExtra("contentId",content);
  for(String key:new String[]{"tripTitle","tripBody","exitTitle","exitBody","exitTitles","exitBodies"})i.putExtra(key,call.getString(key,"Namoz"));
  ContextCompat.startForegroundService(getContext(),i);call.resolve();
 }
 @PluginMethod public void setLocale(PluginCall call){
  String locale=call.getString("locale","uz-Latn");
  if(!java.util.Arrays.asList("uz-Latn","uz-Cyrl","ru","en").contains(locale)){call.reject("Invalid language");return;}
  getContext().getSharedPreferences("namoz-language",0).edit().putString("locale",locale).apply();call.resolve();
 }
 @PluginMethod public void stop(PluginCall call){getContext().stopService(new Intent(getContext(),MosqueTripService.class));call.resolve();}
}
