import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { useApp } from '../store';
import { Modal } from './ui';
import { mediaUrl } from '../api';
import { type Content } from '../../shared/schema';
import { type InboxItem, retainNotification } from '../../shared/inbox';
import { listNotifications, markNotificationRead, readNotification } from '../inbox-db';
import { collectNativeNotifications } from '../notifications';
export function NotificationInbox({onRead}:{onRead:(c:Content)=>void}) {
  const {prefs,prayer,data,t}=useApp();
  const [open,setOpen]=useState(false),[rows,setRows]=useState<InboxItem[]>([]),[selected,setSelected]=useState<InboxItem>();
  const [error,setError]=useState(false);
  const launchEpoch=useRef(0);
  const zone=prayer?.location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const days=data.appearance.notificationRetentionDays;
  const reload=async()=>{try {setRows(await listNotifications(zone,days));setError(false);}catch{setError(true);}};
  const select=async(n:InboxItem)=>{setSelected(n);setOpen(true);await markNotificationRead(n.id).catch(()=>{});await reload();};
  useEffect(()=>{
    const launch=async()=>{
      const epoch=launchEpoch.current;
      await collectNativeNotifications().catch(()=>{});
      if(epoch!==launchEpoch.current)return;
      const id=new URLSearchParams(location.search).get('notification');
      if(id){const n=await readNotification(id).catch(()=>undefined);if(epoch!==launchEpoch.current)return;if(n)await select(n);else setOpen(true);
        const url=new URL(location.href);url.searchParams.delete('notification');history.replaceState({},'',url.pathname+url.search);}
      await reload();
    };
    const action=(e:Event)=>{const n=(e as CustomEvent<InboxItem>).detail;if(n){void select(n);const url=new URL(location.href);url.searchParams.delete('notification');history.replaceState({},'',url.pathname+url.search);}};
    const visible=()=>{if(document.visibilityState==='visible')void launch();};
    const message=()=>void reload();
    const openUmrah=()=>{launchEpoch.current++;setOpen(false);setSelected(undefined);};
    void launch(); const timer=setInterval(()=>void reload(),1000);
    window.addEventListener('namoz-notification',action);
    window.addEventListener('namoz-umrah-reminder',openUmrah);
    document.addEventListener('visibilitychange',visible);
    navigator.serviceWorker?.addEventListener('message',message);
    return()=>{launchEpoch.current++;clearInterval(timer);window.removeEventListener('namoz-notification',action);window.removeEventListener('namoz-umrah-reminder',openUmrah);document.removeEventListener('visibilitychange',visible);navigator.serviceWorker?.removeEventListener('message',message);};
  },[zone,days]);
  const unread=rows.filter(n=>!n.read).length;
  const material=selected?.contentId ? data.content.find(c=>c.id===selected.contentId) : undefined;
  return <>
    <button className="icon-button notification-bell" aria-label={t('notifications')} title={t('notifications')} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setSelected(undefined);setOpen(true);void reload();}}><Bell size={21} aria-hidden="true"/>{unread>0&&<span className="notification-badge">{unread>99?'99+':unread}</span>}</button>
    {open&&createPortal(<Modal label={t('notifications')} onClose={()=>{setOpen(false);setSelected(undefined);}}>
      <p className="muted">{t('inboxPolicy').replace('{days}',String(days))}</p>
      {error&&<p role="alert">{t('inboxStorageError')}</p>}
      {selected ? <article className="inbox-detail">
        <button className="text-button" onClick={()=>setSelected(undefined)}>{t('inboxBack')}</button>
        {!retainNotification(selected,zone,days)&&<p className="muted">{t('inboxEarlier')}</p>}
        <h3>{selected.title}</h3><time>{new Intl.DateTimeFormat(prefs.locale,{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(selected.at))}</time>
        {selected.image&&<img src={mediaUrl(selected.image)} alt=""/>}
        <p style={{whiteSpace:'pre-wrap'}}>{selected.body}</p>
        {material&&<button className="button" onClick={()=>{setOpen(false);onRead(material);}}>{t('inboxMaterial')}</button>}
      </article> : <div className="inbox-list">{rows.length===0?<p>{t('inboxEmpty')}</p>:rows.map(n=><button key={n.id} className={`inbox-row ${n.read?'':'unread'}`} onClick={()=>void select(n)}>
        <strong>{!n.read&&<span className="connection-dot"/>}{n.title}</strong><small>{new Intl.DateTimeFormat(prefs.locale,{timeZone:zone,dateStyle:'short',timeStyle:'short'}).format(new Date(n.at))}</small><span>{n.body.slice(0,140)}</span>
      </button>)}</div>}
    </Modal>,document.body)}
  </>;
}
