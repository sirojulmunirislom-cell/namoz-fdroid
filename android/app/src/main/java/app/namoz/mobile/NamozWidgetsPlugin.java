package app.namoz.mobile;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="NamozWidgets")
public class NamozWidgetsPlugin extends Plugin {
 @PluginMethod public void consumeLaunchIntent(PluginCall call){
  android.content.Intent i=getActivity().getIntent();JSObject result=new JSObject();
  for(String key:new String[]{"section","contentId"}){String value=i.getStringExtra(key);if(value!=null)result.put(key,value);i.removeExtra(key);}
  call.resolve(result);
 }
 @PluginMethod public void update(PluginCall call){
  JSObject snapshot=call.getObject("snapshot");
  if(snapshot==null){call.reject("Widget snapshot required");return;}
  getContext().getSharedPreferences("namoz_widgets",0).edit().putString("snapshot",snapshot.toString()).apply();
  NamozWidgetProvider.refreshAll(getContext());call.resolve();
 }
}
