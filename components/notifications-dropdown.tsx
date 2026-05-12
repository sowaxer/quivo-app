'use client';

import { useState, useEffect, useRef } from 'react';
import { IconBell, IconSettings, IconX } from '@tabler/icons-react';

interface Notification {
  id: string;
  type: 'mention' | 'update' | 'request';
  message: string;
  time: string;
  read: boolean;
  avatar?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [];

export function NotificationsDropdown() {
  const [open, setOpen]       = useState(false);
  const [tab, setTab]         = useState<'notifications' | 'requests'>('notifications');
  const [notifs, setNotifs]   = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const ref                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifs.filter(n => !n.read).length;
  const filtered = notifs.filter(n => tab === 'requests' ? n.type === 'request' : n.type !== 'request');

  function markAllRead() {
    setNotifs(notifs.map(n => ({ ...n, read: true })));
  }
  function dismiss(id: string) {
    setNotifs(notifs.filter(n => n.id !== id));
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition-all ${open ? 'bg-[#22252a] text-[#e8eaed]' : 'text-[#6b7280] hover:bg-[#22252a] hover:text-[#9ba3af]'}`}
      >
        <IconBell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4d7efa] text-[8px] font-bold text-white leading-none">
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-9 z-50 w-[320px] rounded-xl border border-[#2e3138] bg-[#1e2026] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e3138]">
            <span className="text-[13px] font-bold text-[#e8eaed]">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-[#4d7efa] hover:text-[#3d6ee8] transition-all px-1">
                  Mark all read
                </button>
              )}
              <button className="rounded-md p-1 text-[#6b7280] hover:bg-[#22252a] hover:text-[#9ba3af] transition-all">
                <IconSettings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#2e3138]">
            {[
              { key: 'notifications', label: 'Notifications', count: notifs.filter(n => n.type !== 'request').length },
              { key: 'requests',      label: 'Requests',      count: notifs.filter(n => n.type === 'request').length },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as 'notifications' | 'requests')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold border-b-2 transition-all ${
                  tab === t.key ? 'border-[#4d7efa] text-[#4d7efa]' : 'border-transparent text-[#6b7280] hover:text-[#9ba3af]'
                }`}>
                {t.label}
                <span className={`text-[10px] ${tab === t.key ? 'text-[#4d7efa]' : 'text-[#6b7280]'}`}>({t.count})</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="py-2 min-h-[200px] max-h-[380px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 px-6">
                {/* Bell with plus decorations */}
                <div className="relative flex items-center justify-center h-16 w-16">
                  {/* Plus signs */}
                  <span className="absolute top-0 left-0 text-[16px] text-[#2e3138] font-light">+</span>
                  <span className="absolute top-0 right-0 text-[16px] text-[#2e3138] font-light">+</span>
                  <span className="absolute bottom-0 left-0 text-[16px] text-[#2e3138] font-light">+</span>
                  <span className="absolute bottom-0 right-0 text-[16px] text-[#2e3138] font-light">+</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2e3138] bg-[#22252a]">
                    <IconBell className="h-6 w-6 text-[#3e4350]" strokeWidth={1} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-[#e8eaed] mb-1">No notifications</p>
                  <p className="text-[11px] text-[#6b7280] leading-relaxed">
                    Notifications such as mentions and<br />important updates will be displayed here.
                  </p>
                </div>
                <button className="rounded-md border border-[#2e3138] bg-[#22252a] px-4 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#2e3138] hover:text-[#e8eaed] transition-all">
                  Settings
                </button>
              </div>
            ) : (
              <div>
                {filtered.map(n => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-[#2e3138]/50 last:border-0 hover:bg-[#22252a] transition-all ${!n.read ? 'bg-[#4d7efa]/5' : ''}`}>
                    <div className="h-7 w-7 shrink-0 rounded-full bg-[#4d7efa]/20 flex items-center justify-center text-[10px] font-bold text-[#4d7efa] mt-0.5">
                      {n.avatar ?? 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#e8eaed] leading-tight">{n.message}</p>
                      <p className="text-[10px] text-[#6b7280] mt-0.5">{n.time}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-[#4d7efa]" />}
                      <button onClick={() => dismiss(n.id)} className="text-[#6b7280] hover:text-[#e8eaed] transition-all">
                        <IconX className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
