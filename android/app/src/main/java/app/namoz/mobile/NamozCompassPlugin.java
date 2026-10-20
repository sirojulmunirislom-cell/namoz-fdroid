package app.namoz.mobile;

import android.content.Context;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.view.Surface;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** True-north heading, with local geomagnetic declination correction. No network access. */
@CapacitorPlugin(name="NamozCompass")
public class NamozCompassPlugin extends Plugin implements SensorEventListener {
    private SensorManager sensors;
    private float declination;
    private int accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE;
    private boolean requested=false;
    @PluginMethod public void start(PluginCall call) {
        sensors=(SensorManager)getContext().getSystemService(Context.SENSOR_SERVICE);
        Sensor sensor=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if(sensor==null){call.reject("Compass sensor is unavailable");return;}
        Double lat=call.getDouble("latitude"),lon=call.getDouble("longitude");
        if(lat==null||lon==null||lat < -90||lat>90||lon < -180||lon>180){call.reject("Valid location required");return;}
        declination=new GeomagneticField(lat.floatValue(),lon.floatValue(),0,System.currentTimeMillis()).getDeclination();
        requested=true;accuracy=SensorManager.SENSOR_STATUS_UNRELIABLE;sensors.unregisterListener(this);
        sensors.registerListener(this,sensor,SensorManager.SENSOR_DELAY_UI);
        call.resolve();
    }
    @PluginMethod public void stop(PluginCall call){requested=false;release();call.resolve();}
    private void release(){if(sensors!=null)sensors.unregisterListener(this);}
    @Override protected void handleOnPause(){release();}
    @Override protected void handleOnResume(){if(requested&&sensors!=null)sensors.registerListener(this,sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR),SensorManager.SENSOR_DELAY_UI);}
    @Override protected void handleOnDestroy(){release();}
    @Override public void onAccuracyChanged(Sensor sensor,int value){accuracy=value;}
    @Override public void onSensorChanged(SensorEvent event){
        float[] matrix=new float[9],remapped=new float[9],orientation=new float[3];
        SensorManager.getRotationMatrixFromVector(matrix,event.values);
        int rotation=getActivity().getWindowManager().getDefaultDisplay().getRotation();
        int x=SensorManager.AXIS_X,y=SensorManager.AXIS_Y;
        if(rotation==Surface.ROTATION_90){x=SensorManager.AXIS_Y;y=SensorManager.AXIS_MINUS_X;}
        else if(rotation==Surface.ROTATION_180){x=SensorManager.AXIS_MINUS_X;y=SensorManager.AXIS_MINUS_Y;}
        else if(rotation==Surface.ROTATION_270){x=SensorManager.AXIS_MINUS_Y;y=SensorManager.AXIS_X;}
        SensorManager.remapCoordinateSystem(matrix,x,y,remapped);
        SensorManager.getOrientation(remapped,orientation);
        double heading=(Math.toDegrees(orientation[0])+declination+360)%360;
        JSObject result=new JSObject();result.put("heading",heading);
        double estimate=event.values.length>=5&&event.values[4]>=0?Math.toDegrees(event.values[4]):180;
        result.put("accuracy",accuracy>=SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM?estimate:180);
        notifyListeners("heading",result);
    }
}
