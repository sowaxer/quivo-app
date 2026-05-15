export type AppNotification = {
  id: string;
  type: 'reminder' | 'mention' | 'update' | 'request';
  message: string;
  time: string;
  read: boolean;
  createdAt: string;
};

export const LS_NOTIFICATIONS = 'quivo_notifications';

export function loadAppNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_NOTIFICATIONS) ?? '[]') as AppNotification[];
  } catch {
    return [];
  }
}

export function saveAppNotifications(items: AppNotification[]) {
  localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(items.slice(0, 80)));
  window.dispatchEvent(new CustomEvent('quivo:notifications-updated'));
}

export function pushAppNotification(
  message: string,
  type: AppNotification['type'] = 'reminder',
): AppNotification {
  const entry: AppNotification = {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    message,
    time: 'Just now',
    read: false,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadAppNotifications()];
  saveAppNotifications(next);
  return entry;
}
