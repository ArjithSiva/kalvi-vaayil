/**
 * Native browser Web Notifications utility.
 *
 * Wraps the standard Notification API with permission management and
 * a simple send helper. Falls back gracefully when the browser does not
 * support notifications.
 *
 * Notifications are shown through the service worker registration when one is
 * available: mobile Chrome throws "Illegal constructor" for `new Notification()`
 * on a page, and service-worker notifications are also the only kind that can be
 * clicked to bring the app back to the foreground.
 */

export const NOTIFICATION_ICON = '/icon-192.png';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export interface AppNotificationOptions extends NotificationOptions {
  /** Path to open/focus when the notification is clicked. */
  url?: string;
}

/**
 * Show a system notification. Resolves to true when one was handed to the
 * browser, false when permission is missing or the platform refused.
 */
export async function sendBrowserNotification(
  title: string,
  options: AppNotificationOptions = {},
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const { url, ...rest } = options;
  const finalOptions: NotificationOptions = {
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    data: { url: url || '/' },
    ...rest,
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
      ]);
      if (registration) {
        await registration.showNotification(title, finalOptions);
        return true;
      }
    }
  } catch {
    // fall through to the page-level constructor
  }

  try {
    new Notification(title, finalOptions);
    return true;
  } catch {
    return false;
  }
}
