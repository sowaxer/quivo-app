'use client';

import { useEffect } from 'react';
import { pushAppNotification } from '@/lib/app-notifications';
import { loadPlannerItems, savePlannerItems } from '@/lib/planner-storage';

async function ensureNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
  }
}

function fireReminder(title: string, body: string) {
  pushAppNotification(`Reminder: ${title}${body ? ` — ${body.slice(0, 80)}` : ''}`, 'reminder');
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Quivo reminder', {
        body: body ? `${title}\n${body.slice(0, 120)}` : title,
        icon: '/favicon.ico',
        tag: `quivo-${title}`,
      });
    } catch {
      /* ignore */
    }
  }
}

export function usePlannerReminders() {
  useEffect(() => {
    void ensureNotificationPermission();

    function tick() {
      const items = loadPlannerItems();
      const now = Date.now();
      let changed = false;

      const next = items.map(item => {
        if (item.reminded || !item.reminderAt || item.completed) return item;
        const at = new Date(item.reminderAt).getTime();
        if (Number.isNaN(at) || at > now) return item;
        fireReminder(item.title, item.body);
        changed = true;
        return { ...item, reminded: true, updatedAt: new Date().toISOString() };
      });

      if (changed) savePlannerItems(next);
    }

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
}
