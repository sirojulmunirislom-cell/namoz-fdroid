package app.namoz.mobile;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.location.*;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
public class MosqueTripService extends Service implements LocationListener {
 private LocationManager locations;private TripState state;private double lat,lon;private String contentId,exitTitle,exitBody,exitTitles,exitBodies;
 private final Handler handler=new Handler(Looper.getMainLooper());
 @Override public IBinder onBind(Intent intent){return null;}
 @Override public int onStartCommand(Intent i,int flags,int startId){
  if(i==null){stopSelf();return START_NOT_STICKY;}
  lat=i.getDoubleExtra("latitude",0);lon=i.getDoubleExtra("longitude",0);contentId=i.getStringExtra("contentId");exitTitle=i.getStringExtra("exitTitle");exitBody=i.getStringExtra("exitBody");
  exitTitles=i.getStringExtra("exitTitles");exitBodies=i.getStringExtra("exitBodies");
  if(contentId==null){stopSelf();return START_NOT_STICKY;}
  NotificationManager manager=getSystemService(NotificationManager.class);
  if(Build.VERSION.SDK_INT>=26){manager.createNotificationChannel(new NotificationChannel("mosque-trip","Mosque trip",NotificationManager.IMPORTANCE_LOW));manager.createNotificationChannel(new NotificationChannel("mosque-exit","Mosque exit dua",NotificationManager.IMPORTANCE_DEFAULT));}
  Intent open=new Intent(this,MainActivity.class).putExtra("section","mosques");
  Notification notification=new NotificationCompat.Builder(this,"mosque-trip").setSmallIcon(R.drawable.ic_stat_namoz).setContentTitle(i.getStringExtra("tripTitle")).setContentText(i.getStringExtra("tripBody")).setOngoing(true).setSilent(true).setContentIntent(PendingIntent.getActivity(this,801,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)).build();
  if(Build.VERSION.SDK_INT>=29)startForeground(801,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);else startForeground(801,notification);
  state=new TripState(System.currentTimeMillis());locations=(LocationManager)getSystemService(LOCATION_SERVICE);handler.removeCallbacksAndMessages(null);handler.postDelayed(this::stopSelf,TripState.MAX_DURATION);
  try{locations.removeUpdates(this);if(locations.isProviderEnabled(LocationManager.GPS_PROVIDER))locations.requestLocationUpdates(LocationManager.GPS_PROVIDER,15000,15,this);if(locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER))locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,15000,15,this);}catch(SecurityException e){stopSelf();}
  return START_NOT_STICKY;
 }
 @Override public void onLocationChanged(Location fix){
  if(state==null)return;long now=System.currentTimeMillis();if(state.expired(now)){stopSelf();return;}
  if(!fix.hasAccuracy()||Math.abs(now-fix.getTime())>60000)return;float[] result=new float[1];Location.distanceBetween(fix.getLatitude(),fix.getLongitude(),lat,lon,result);
  if(state.update(result[0],fix.getAccuracy(),now)){
   String locale=getSharedPreferences("namoz-language",0).getString("locale","uz-Latn");
   try {exitTitle=new org.json.JSONObject(exitTitles).optString(locale,"");exitBody=new org.json.JSONObject(exitBodies).optString(locale,"");}
   catch(Exception e){stopSelf();return;}
   if(exitTitle.trim().isEmpty()||exitBody.trim().isEmpty()){stopSelf();return;}

   Intent open=new Intent(this,MainActivity.class).putExtra("contentId",contentId);open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
   Notification n=new NotificationCompat.Builder(this,"mosque-exit").setSmallIcon(R.drawable.ic_stat_namoz).setContentTitle(exitTitle).setContentText(exitBody).setAutoCancel(true).setContentIntent(PendingIntent.getActivity(this,802,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)).build();
   try{NotificationManagerCompat.from(this).notify(802,n);}catch(SecurityException ignored){}stopSelf();
  }
 }
 @Override public void onProviderEnabled(String provider){}
 @Override public void onProviderDisabled(String provider){}
 @Override public void onStatusChanged(String provider,int status,Bundle extras){}
 @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);if(locations!=null)locations.removeUpdates(this);stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
}
