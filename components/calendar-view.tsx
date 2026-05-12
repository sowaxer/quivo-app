'use client';

import { useState, useEffect, useCallback } from 'react';
import { IconChevronLeft, IconChevronRight, IconPlus, IconLoader2, IconX, IconBrandGoogle, IconCalendar } from '@tabler/icons-react';
import { useGoogleConnection } from '@/lib/use-google-connection';

interface CalEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
  status?: string;
  attendees?: { email: string; name?: string; status?: string }[];
  colorId?: string;
}

const DOW   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Google Calendar event colors (colorId 1-11)
const COLOR_MAP: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
  default: '#3b82f6',
};

function eventColor(e: CalEvent) {
  return COLOR_MAP[e.colorId ?? ''] ?? COLOR_MAP.default;
}

export default function CalendarView() {
  const { connected, checking } = useGoogleConnection();
  const [date, setDate]           = useState(new Date());
  const [events, setEvents]       = useState<CalEvent[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<CalEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // New event form state
  const [newTitle, setNewTitle]   = useState('');
  const [newStart, setNewStart]   = useState('');
  const [newEnd, setNewEnd]       = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [creating, setCreating]   = useState(false);

  // ── Load events ──────────────────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/google/calendar?action=list&days=60');
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected) loadEvents();
  }, [connected, loadEvents]);

  // ── Create event ─────────────────────────────────────────────────────────
  const createEvent = async () => {
    if (!newTitle || !newStart || !newEnd) return;
    setCreating(true);
    try {
      await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: newTitle, description: newDesc, start: newStart, end: newEnd }),
      });
      setShowCreate(false);
      setNewTitle(''); setNewStart(''); setNewEnd(''); setNewDesc('');
      await loadEvents();
    } finally {
      setCreating(false);
    }
  };

  // ── Delete event ─────────────────────────────────────────────────────────
  const deleteEvent = async (id: string) => {
    await fetch('/api/google/calendar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelected(null);
  };

  const year  = date.getFullYear();
  const month = date.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();

  const cells = Array.from({ length: firstDay + daysCount }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const eventsOnDay = (day: number) => events.filter(e => {
    const d = new Date(e.start);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const today = new Date();

  // ── Loading / not connected ───────────────────────────────────────────────
  if (checking) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3">
        <IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
        <p className="text-xs text-[#8b949e]">Checking Google connection…</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-6 text-center px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#141b26] border border-[#1e2836]">
          <IconCalendar className="h-8 w-8 text-[#06b6d4]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#e6edf3]">Connect Google Calendar</h3>
          <p className="mt-1 max-w-sm text-sm text-[#8b949e]">See your real schedule and create events directly from Finedge.</p>
        </div>
        <button
          onClick={() => { window.location.href = '/api/google/auth'; }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/40 hover:shadow-blue-900/60 transition-all"
        >
          <IconBrandGoogle className="h-4 w-4" />
          Connect Google Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e2836] bg-[#0f1419] px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setDate(new Date(year, month - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1e2836] bg-[#141b26] text-[#8b949e] hover:text-[#e6edf3]">
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[160px] text-center text-base font-bold text-[#e6edf3]">{MONTHS[month]} {year}</h2>
          <button onClick={() => setDate(new Date(year, month + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1e2836] bg-[#141b26] text-[#8b949e] hover:text-[#e6edf3]">
            <IconChevronRight className="h-4 w-4" />
          </button>
          {loading && <IconLoader2 className="h-4 w-4 animate-spin text-[#8b949e]" />}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { window.location.href = '/api/google/auth'; }}
            className="flex items-center gap-1.5 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5 text-[10px] font-semibold text-[#22c55e]"
          >
            <IconBrandGoogle className="h-3 w-3" /> Connected
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">
            <IconPlus className="h-3.5 w-3.5" strokeWidth={2.5} /> New Event
          </button>
        </div>
      </div>

      {/* Grid + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {DOW.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">{d}</div>
            ))}
          </div>
          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const dayEvents = day ? eventsOnDay(day) : [];
              return (
                <div key={idx} className={`min-h-[88px] rounded-xl border p-1.5 transition-all ${
                  day === null ? 'border-transparent'
                    : isToday ? 'border-[#3b82f6]/50 bg-[#3b82f6]/5'
                    : 'border-[#1e2836] bg-[#141b26] hover:border-[#3b82f6]/30'
                }`}>
                  {day !== null && (
                    <>
                      <span className={`mb-1 block text-xs font-semibold ${isToday ? 'text-[#3b82f6]' : 'text-[#8b949e]'}`}>{day}</span>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <button key={ev.id} onClick={() => setSelected(ev)}
                            className="w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold text-white"
                            style={{ background: eventColor(ev) + '33', color: eventColor(ev), border: `1px solid ${eventColor(ev)}40` }}>
                            {ev.summary}
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="px-1 text-[9px] text-[#8b949e]">+{dayEvents.length - 2} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event detail sidebar */}
        {selected && (
          <div className="w-72 shrink-0 overflow-y-auto border-l border-[#1e2836] bg-[#0f1419] p-5">
            <div className="mb-4 flex items-start justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-[#8b949e]">Event</p>
              <button onClick={() => setSelected(null)} className="text-[#8b949e] hover:text-[#e6edf3]"><IconX className="h-4 w-4" /></button>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: eventColor(selected) }} />
              <h3 className="font-bold text-[#e6edf3]">{selected.summary}</h3>
            </div>
            {selected.description && (
              <p className="mb-3 text-xs text-[#8b949e] leading-relaxed">{selected.description}</p>
            )}
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[10px] text-[#8b949e]">Start</p>
                <p className="text-[#e6edf3]">{new Date(selected.start).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#8b949e]">End</p>
                <p className="text-[#e6edf3]">{new Date(selected.end).toLocaleString()}</p>
              </div>
              {selected.location && (
                <div>
                  <p className="text-[10px] text-[#8b949e]">Location</p>
                  <p className="text-[#e6edf3]">{selected.location}</p>
                </div>
              )}
              {selected.attendees && selected.attendees.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#8b949e]">Attendees</p>
                  {selected.attendees.map(a => (
                    <p key={a.email} className="text-[#e6edf3]">{a.name || a.email}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {selected.htmlLink && (
                <a href={selected.htmlLink} target="_blank" rel="noopener noreferrer"
                  className="flex-1 rounded-lg border border-[#1e2836] py-2 text-center text-xs text-[#8b949e] hover:border-[#3b82f6]/50 hover:text-[#3b82f6]">
                  Open in Google
                </a>
              )}
              <button onClick={() => deleteEvent(selected.id)}
                className="flex-1 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/10 py-2 text-xs font-semibold text-[#ef4444] hover:bg-[#ef4444]/20">
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create event modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" style={{ backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl border border-[#1e2836] bg-[#0f1419] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#e6edf3]">New Event</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#8b949e] hover:text-[#e6edf3]"><IconX className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Event title *"
                className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-[#8b949e]">Start *</label>
                  <input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)}
                    className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2 text-xs text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-[#8b949e]">End *</label>
                  <input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                    className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2 text-xs text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none" />
                </div>
              </div>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={3}
                className="w-full resize-none rounded-xl border border-[#1e2836] bg-[#141b26] px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none" />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-xl border border-[#1e2836] px-4 py-2 text-xs text-[#8b949e] hover:bg-[#1e2836]">Cancel</button>
              <button onClick={createEvent} disabled={creating || !newTitle || !newStart || !newEnd}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                {creating ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconPlus className="h-3.5 w-3.5" strokeWidth={2.5} />}
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
