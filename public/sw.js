/* Kalvi Vaayil service worker — system notifications only (no offline caching).
 *
 * Mobile Chrome does not allow `new Notification()` from a page, only
 * `registration.showNotification()`, so attendance checks are routed through
 * here. Clicking a notification focuses the app (or opens it) at the URL the
 * page attached to the notification.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client && new URL(client.url).pathname !== target) {
            client.navigate(target).catch(() => undefined);
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
