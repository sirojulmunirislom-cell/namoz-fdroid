package app.namoz.mobile;
/** Local-only trip, instantiated solely by the explicit Going to mosque action. */
public final class TripState {
 public static final long MAX_DURATION=2*60*60*1000L;
 private final long startedAt;
 private long insideSince=-1,outsideSince=-1,lastFix=-1;
 private boolean arrived=false,done=false;
 public TripState(long now){startedAt=now;}
 public boolean expired(long now){return now-startedAt>=MAX_DURATION;}
 public boolean update(float metres,float accuracy,long now){
  if(done||expired(now))return false;
  if(accuracy<0||accuracy>50){insideSince=-1;outsideSince=-1;return false;}
  if(lastFix>=0&&now-lastFix>60000){insideSince=-1;outsideSince=-1;}lastFix=now;
  if(!arrived){if(metres<=100){if(insideSince<0)insideSince=now;if(now-insideSince>=180000)arrived=true;}else insideSince=-1;return false;}
  if(metres>=250){if(outsideSince<0)outsideSince=now;if(now-outsideSince>=30000){done=true;return true;}}else outsideSince=-1;
  return false;
 }
}
