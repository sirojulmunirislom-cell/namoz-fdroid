// Shared by the page and service worker. No user identifiers or coordinates.
export type InboxItem = {
  id: string; kind: 'prayer' | 'content'; title: string; body: string;
  at: string; contentId?: string; image?: string; read?: boolean;
  scheduled?: 'jamaat' | 'calendar';
};
export function localDay(at: string | number, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(at));
}
export function retainNotification(n: InboxItem, timezone: string, days: number, now = Date.now()) {
  const at = Date.parse(n.at);
  if (!Number.isFinite(at)) return false;
  if (at > now) return true; // pending reminders are never displayed early
  return n.kind === 'prayer' ? localDay(at, timezone) === localDay(now, timezone) : now - at < days * 86400000;
}
export function inboxFromPush(p: any, now = Date.now()): InboxItem {
  const id = String(p.notificationId || p.id || crypto.randomUUID()).slice(0,200);
  const at = typeof p.at === 'string' && Number.isFinite(Date.parse(p.at)) ? p.at : new Date(now).toISOString();
  return {id, at, kind: p.kind === 'prayer' || id.startsWith('jamaat-') || p.url === '/?section=prayer' ? 'prayer' : 'content',
    title: String(p.title || 'Namoz').slice(0,300), body: String(p.body || '').slice(0,20000),
    contentId: typeof p.contentId === 'string' ? p.contentId.slice(0,100) : undefined,
    image: typeof p.image === 'string' && /^\/media\/[a-f0-9-]+\.(webp|png|jpg)$/.test(p.image) ? p.image : undefined };
}
