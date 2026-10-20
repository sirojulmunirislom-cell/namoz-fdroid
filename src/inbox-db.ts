import { type InboxItem, retainNotification } from '../shared/inbox';
const database = () => new Promise<IDBDatabase>((resolve,reject) => {
  const r = indexedDB.open('namoz-notifications', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('messages', {keyPath:'id'});
  r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
});
async function transaction<T>(work: (store: IDBObjectStore, done: (value:T)=>void)=>void): Promise<T> {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('messages','readwrite'); let result:T;
    tx.oncomplete=()=>{db.close();resolve(result);};
    tx.onerror=()=>{db.close();reject(tx.error);};
    tx.onabort=()=>{db.close();reject(tx.error);};
    work(tx.objectStore('messages'),v=>{result=v;});
  });
}
export async function saveNotification(n: InboxItem) {
  await transaction<void>((s,done)=>{
    const r=s.get(n.id);r.onsuccess=()=>{s.put({...n,read: r.result?.read || n.read || false});done();};
  });
}
export async function readNotification(id:string) {
  return transaction<InboxItem | undefined>((s,done)=>{const r=s.get(id);r.onsuccess=()=>done(r.result);});
}
export async function markNotificationRead(id:string) {
  await transaction<void>((s,done)=>{const r=s.get(id);r.onsuccess=()=>{if(r.result)s.put({...r.result,read:true});done();};});
}
export async function listNotifications(timezone:string,days:number,now=Date.now()) {
  return transaction<InboxItem[]>((s,done)=>{
    const r=s.getAll();r.onsuccess=()=>{
      const rows:InboxItem[]=[];
      for(const n of r.result as InboxItem[]) {
        if(!retainNotification(n,timezone,days,now))s.delete(n.id);
        else if(Date.parse(n.at)<=now)rows.push(n);
      }
      rows.sort((a,b)=>b.at.localeCompare(a.at));
      for(const n of rows.slice(500))s.delete(n.id);
      done(rows.slice(0,500));
    };
  });
}
// Replace only FUTURE schedules; delivered reminders and read state survive rescheduling.
export async function replaceScheduled(source:'jamaat'|'calendar', rows:InboxItem[], now=Date.now()) {
  await transaction<void>((s,done)=>{const r=s.getAll();r.onsuccess=()=>{
    for(const n of r.result as InboxItem[])if(n.scheduled===source && Date.parse(n.at)>now)s.delete(n.id);
    for(const n of rows)if(Date.parse(n.at)>now)s.put({...n,scheduled:source});
    done();
  };});
}
