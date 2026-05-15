'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconBell, IconX } from '@tabler/icons-react';
import { loadAppNotifications, saveAppNotifications, type AppNotification } from '@/lib/app-notifications';

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => setNotifs(loadAppNotifications()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('quivo:notifications-updated', handler);
    return () => window.removeEventListener('quivo:notifications-updated', handler);
  }, [refresh]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  function markAllRead() {
    saveAppNotifications(notifs.map(n => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    saveAppNotifications(notifs.filter(n => n.id !== id));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bg-border)] transition-all ${
          open ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        }`}
        aria-label="Notifications"
      >
        <IconBell className="h-4 w-4" stroke={1.75} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: 'var(--quivo-accent)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[320px] overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-3">
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-medium hover:opacity-80"
                style={{ color: 'var(--quivo-accent)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto py-1">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <IconBell className="h-8 w-8 text-[var(--text-muted)]" stroke={1.25} />
                <p className="text-[13px] font-medium text-[var(--text-primary)]">No notifications yet</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Task reminders and updates appear here.
                </p>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-[var(--bg-border)]/60 px-4 py-3 last:border-0 ${
                    !n.read ? 'bg-cyan-500/5' : ''
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--quivo-accent)]" style={{ background: 'color-mix(in srgb, var(--quivo-accent) 18%, transparent)' }}>
                    <IconBell className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug text-[var(--text-primary)]">{n.message}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{formatTime(n.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    className="shrink-0 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                    aria-label="Dismiss"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
