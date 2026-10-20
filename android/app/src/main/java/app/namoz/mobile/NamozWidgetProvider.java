package app.namoz.mobile;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.os.SystemClock;
import android.widget.RemoteViews;
import org.json.*;

public class NamozWidgetProvider extends AppWidgetProvider {
 private static String refreshAction(Context c){return c.getPackageName()+".WIDGET_REFRESH";}
 @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){refreshAll(c);}
 @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);if(refreshAction(c).equals(intent.getAction())||Intent.ACTION_TIME_CHANGED.equals(intent.getAction())||Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())||Intent.ACTION_DATE_CHANGED.equals(intent.getAction()))refreshAll(c);}
 static void refreshAll(Context c){
  try{JSONObject data=new JSONObject(c.getSharedPreferences("namoz_widgets",0).getString("snapshot","{}"));long now=System.currentTimeMillis();
   JSONArray prayers=data.optJSONArray("prayers"),windows=data.optJSONArray("windows");JSONObject next=null,active=null;long updateAt=now+30*60*1000;
   if(prayers!=null)for(int i=0;i<prayers.length();i++){JSONObject p=prayers.getJSONObject(i);if(p.getLong("at")>now){next=p;updateAt=Math.min(updateAt,p.getLong("at"));break;}}
   if(windows!=null)for(int i=0;i<windows.length();i++){JSONObject w=windows.getJSONObject(i);if(w.getLong("start")>now)updateAt=Math.min(updateAt,w.getLong("start"));if(w.getLong("end")>now)updateAt=Math.min(updateAt,w.getLong("end"));if(w.getLong("start")<=now&&now<w.getLong("end"))active=w;}
   AppWidgetManager manager=AppWidgetManager.getInstance(c);
   for(Class<?> provider:new Class<?>[]{NamozWidgetProvider.class,AdhkarWidgetProvider.class}){
    boolean adhkar=provider==AdhkarWidgetProvider.class;
    for(int id:manager.getAppWidgetIds(new ComponentName(c,provider))){RemoteViews views=new RemoteViews(c.getPackageName(),R.layout.namoz_widget);
     String title=adhkar?data.optString("adhkarTitle","Azkorlar"):data.optString("brand","Namoz");
     String subtitle=data.optString("setup","Namoz vaqtlarini sozlang"),time="—";long base=0;
     if(adhkar){if(active!=null){subtitle="● "+active.getString("title");time=data.optString("activeLabel","Hozir o‘qish vaqti");}else if(data.optBoolean("confirmed")){subtitle=data.optString("morningTitle","Tonggi azkorlar");time=data.optString("eveningTitle","Kechki azkorlar");}}
     else if(next!=null&&data.optBoolean("confirmed")){subtitle=next.getString("title")+" · "+data.optString("city");time=next.getString("time");base=SystemClock.elapsedRealtime()+next.getLong("at")-now;}
     views.setTextViewText(R.id.widget_title,title);views.setTextViewText(R.id.widget_subtitle,subtitle);views.setTextViewText(R.id.widget_time,time);
     views.setViewVisibility(R.id.widget_countdown,base>0?android.view.View.VISIBLE:android.view.View.GONE);
     if(base>0){views.setChronometer(R.id.widget_countdown,base,null,true);views.setChronometerCountDown(R.id.widget_countdown,true);}
     Intent open=new Intent(c,MainActivity.class);open.putExtra("section",adhkar?"adhkar":"prayer");open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
     views.setOnClickPendingIntent(R.id.widget_root,PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));manager.updateAppWidget(id,views);
    }
   }
   Intent refresh=new Intent(c,NamozWidgetProvider.class).setAction(refreshAction(c));
   PendingIntent pending=PendingIntent.getBroadcast(c,714,refresh,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   // Inexact alarms are deliberate: no restricted exact-alarm permission for widgets.
   ((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC,updateAt,pending);
  }catch(JSONException ignored){/* Invalid state must never generate guessed prayer times. */}
 }
}
