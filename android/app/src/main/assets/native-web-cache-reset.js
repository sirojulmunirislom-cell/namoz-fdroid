// Executed by Android from the APK, even when an old service worker serves old HTML.
// Never touch localStorage, IndexedDB, cookies or content/weather caches.
(async () => {
  if (window.__namozCacheResetStarted) return;
  window.__namozCacheResetStarted = true;
  try {
    const workers = navigator.serviceWorker;
    const controlled = Boolean(workers && workers.controller);
    if (workers) {
      const registrations = await workers.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith("workbox-")).map(name => caches.delete(name)));
    }
    if (controlled) window.location.reload();
  } catch (error) {
    // Retry next Activity launch; never clear user data or repeatedly reload.
    console.warn("Namoz interface cache migration failed", error);
  }
})();
