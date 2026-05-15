'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconPlus, IconCheck, IconTrash, IconLoader2, IconBell,
  IconBellOff, IconFlag, IconAlertCircle, IconCircle,
  IconClock, IconX, IconDatabase, IconCloudUpload,
} from '@tabler/icons-react';

interface Note {
  id: string;
  content: string;
  status: 'pending' | 'done';
  priority: 'low' | 'normal' | 'high';
  reminder_at: string | null;
  reminded: boolean;
  created_at: string;
  synced?: boolean; // is it in Supabase?
}

type Filter = 'all' | 'pending' | 'done';

const LS_KEY = 'quivo_notes';

function loadLocal(): Note[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(notes: Note[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(notes)); } catch { /* quota */ }
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function priorityColor(p: string) {
  if (p === 'high')   return 'text-[#ef4444]';
  if (p === 'normal') return 'text-[#f59e0b]';
  return 'text-[#8b949e]';
}

function formatReminder(iso: string | null) {
  if (!iso) return null;
  const d    = new Date(iso);
  const now  = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return { label: 'Overdue', color: 'text-[#ef4444]' };
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return { label: `In ${days}d`, color: 'text-[#8b949e]' };
  if (hrs  > 0) return { label: `In ${hrs}h`,  color: 'text-[#f59e0b]' };
  return { label: `In ${mins}m`, color: 'text-[#22c55e]' };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Add Note Modal ────────────────────────────────────────────────────────────
function AddNoteModal({ onClose, onAdd }: { onClose: () => void; onAdd: (n: Omit<Note, 'id' | 'created_at' | 'reminded' | 'synced'>) => void }) {
  const [content,    setContent]      = useState('');
  const [priority,   setPriority]     = useState<'low' | 'normal' | 'high'>('normal');
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');

  function handleAdd() {
    if (!content.trim()) return;
    let reminder_at: string | null = null;
    if (hasReminder && reminderDate) {
      reminder_at = new Date(`${reminderDate}T${reminderTime}`).toISOString();
    }
    onAdd({ content: content.trim(), status: 'pending', priority, reminder_at });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[480px] rounded-2xl border border-[#1e2836] bg-[#0f1419] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2836] px-5 py-4">
          <h3 className="text-sm font-bold text-[#e6edf3]">New Note</h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]"><IconX className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <textarea
            autoFocus value={content} onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAdd(); }}
            placeholder="e.g. PAGAR X MES 500 · PARADOX LLC NO RENOVADA · LLAMAR CLIENTE XYZ"
            rows={4}
            className="w-full resize-none rounded-xl border border-[#1e2836] bg-[#141b26] px-4 py-3 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none"
          />

          {/* Priority */}
          <div>
            <p className="mb-2 text-xs font-semibold text-[#8b949e]">Priority</p>
            <div className="flex gap-2">
              {(['low', 'normal', 'high'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`capitalize rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${priority === p
                    ? p === 'high'   ? 'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444]'
                    : p === 'normal' ? 'border-[#f59e0b]/50 bg-[#f59e0b]/10 text-[#f59e0b]'
                                     : 'border-[#8b949e]/50 bg-[#8b949e]/10 text-[#8b949e]'
                    : 'border-[#1e2836] text-[#8b949e] hover:border-[#3b82f6]/30'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setHasReminder(v => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${hasReminder ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6]' : 'border-[#1e2836] text-[#8b949e]'}`}>
                <IconBell className="h-3.5 w-3.5" />
                {hasReminder ? 'Reminder on' : 'Add reminder'}
              </button>
            </div>
            {hasReminder && (
              <div className="flex gap-2">
                <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none" />
                <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)}
                  className="w-28 rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-[#8b949e]">Tip: Ctrl+Enter to save quickly</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#1e2836] px-5 py-4">
          <button onClick={onClose} className="text-xs text-[#8b949e] hover:text-[#e6edf3]">Cancel</button>
          <button onClick={handleAdd} disabled={!content.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-40">
            <IconPlus className="h-3.5 w-3.5" /> Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function NotesPanel() {
  const [notes, setNotes]         = useState<Note[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [filter, setFilter]       = useState<Filter>('all');
  const [dbAvailable, setDbAvailable] = useState<boolean | null>(null);
  const [syncing, setSyncing]     = useState(false);
  const initialized               = useRef(false);

  // ── Load: try Supabase first, fall back to localStorage ─────────────────
  const load = useCallback(async () => {
    if (!initialized.current) {
      // Immediately show localStorage notes (zero latency)
      const local = loadLocal();
      setNotes(local);
      setLoading(false);
      initialized.current = true;
    }

    // Then try to sync with Supabase in background
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/notes', { credentials: 'include', signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notes)) {
          setDbAvailable(true);
          // Merge: prefer DB records but keep any local-only ones
          const dbIds = new Set(data.notes.map((n: Note) => n.id));
          const localOnly = loadLocal().filter(n => !dbIds.has(n.id) && !n.synced);
          const merged = [...data.notes, ...localOnly];
          setNotes(merged);
          saveLocal(merged.map(n => ({ ...n, synced: dbIds.has(n.id) })));
        }
      } else {
        setDbAvailable(false);
      }
    } catch {
      setDbAvailable(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Browser reminder checker ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotes(prev => {
        let changed = false;
        const updated = prev.map(note => {
          if (!note.reminder_at || note.reminded || note.status === 'done') return note;
          if (new Date(note.reminder_at).getTime() <= now) {
            changed = true;
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Quivo Reminder', { body: note.content, icon: '/favicon.ico' });
            }
            // Mark reminded in API if available
            if (dbAvailable) {
              fetch('/api/notes', {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteId: note.id, reminded: true }),
              }).catch(() => {});
            }
            return { ...note, reminded: true };
          }
          return note;
        });
        if (changed) saveLocal(updated);
        return changed ? updated : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [dbAvailable]);

  // ── Add note ─────────────────────────────────────────────────────────────
  async function addNote(noteData: Omit<Note, 'id' | 'created_at' | 'reminded' | 'synced'>) {
    // Optimistic local insert immediately
    const local: Note = {
      ...noteData,
      id: genId(),
      created_at: new Date().toISOString(),
      reminded: false,
      synced: false,
    };
    const newNotes = [local, ...notes];
    setNotes(newNotes);
    saveLocal(newNotes);

    // Try to sync to DB
    if (dbAvailable !== false) {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });
        const data = await res.json();
        if (data.note) {
          // Replace local note with DB note (has real UUID)
          setDbAvailable(true);
          setNotes(prev => {
            const replaced = prev.map(n => n.id === local.id ? { ...data.note, synced: true } : n);
            saveLocal(replaced);
            return replaced;
          });
        }
      } catch {
        // Keep local note as-is
      }
    }
  }

  // ── Toggle status ─────────────────────────────────────────────────────────
  async function toggleStatus(note: Note) {
    const newStatus = note.status === 'done' ? 'pending' : 'done';
    const updated = notes.map(n => n.id === note.id ? { ...n, status: newStatus } : n);
    setNotes(updated as Note[]);
    saveLocal(updated as Note[]);

    if (note.synced || dbAvailable) {
      fetch('/api/notes', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id, status: newStatus }),
      }).catch(() => {});
    }
  }

  // ── Delete note ───────────────────────────────────────────────────────────
  async function deleteNote(id: string) {
    const note = notes.find(n => n.id === id);
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveLocal(updated);

    if (note?.synced || dbAvailable) {
      fetch('/api/notes', {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id }),
      }).catch(() => {});
    }
  }

  // ── Sync unsynced notes to DB ─────────────────────────────────────────────
  async function syncToDb() {
    const unsynced = notes.filter(n => !n.synced);
    if (!unsynced.length) return;
    setSyncing(true);
    let anySuccess = false;
    const updatedNotes = [...notes];

    for (const note of unsynced) {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: note.content, priority: note.priority,
            reminder_at: note.reminder_at, status: note.status,
          }),
        });
        const data = await res.json();
        if (data.note) {
          const idx = updatedNotes.findIndex(n => n.id === note.id);
          if (idx >= 0) updatedNotes[idx] = { ...data.note, synced: true };
          anySuccess = true;
          setDbAvailable(true);
        }
      } catch { /* keep local */ }
    }

    if (anySuccess) {
      setNotes(updatedNotes);
      saveLocal(updatedNotes);
    }
    setSyncing(false);
  }

  async function requestNotifPerms() {
    if ('Notification' in window) await Notification.requestPermission();
  }

  const filtered = notes.filter(n => {
    if (filter === 'pending') return n.status === 'pending';
    if (filter === 'done')    return n.status === 'done';
    return true;
  });

  const pendingCount  = notes.filter(n => n.status === 'pending').length;
  const doneCount     = notes.filter(n => n.status === 'done').length;
  const reminderCount = notes.filter(n => n.reminder_at && !n.reminded && n.status === 'pending').length;
  const unsyncedCount = notes.filter(n => !n.synced).length;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {showAdd && <AddNoteModal onClose={() => setShowAdd(false)} onAdd={addNote} />}

      {/* Header */}
      <div className="border-b border-[#1e2836] bg-[#0f1419] px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#e6edf3]">Smart Notes</h2>
            <p className="text-xs text-[#8b949e]">AI reads and acts on your notes automatically</p>
          </div>
          <div className="flex items-center gap-2">
            {reminderCount > 0 && (
              <button onClick={requestNotifPerms}
                className="flex items-center gap-1.5 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-3 py-1.5 text-xs font-semibold text-[#f59e0b] hover:bg-[#f59e0b]/10">
                <IconBell className="h-3.5 w-3.5" /> {reminderCount} reminder{reminderCount > 1 ? 's' : ''}
              </button>
            )}
            {dbAvailable === false && unsyncedCount > 0 && (
              <button onClick={syncToDb} disabled={syncing}
                className="flex items-center gap-1.5 rounded-xl border border-[#3b82f6]/30 bg-[#3b82f6]/5 px-3 py-1.5 text-xs font-semibold text-[#3b82f6] hover:bg-[#3b82f6]/10">
                {syncing ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconCloudUpload className="h-3.5 w-3.5" />}
                Sync {unsyncedCount}
              </button>
            )}
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-900/30 hover:shadow-blue-900/50 transition-all">
              <IconPlus className="h-3.5 w-3.5" /> Add Note
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-[#1e2836] text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
              {f}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === f ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#1e2836] text-[#8b949e]'}`}>
                {f === 'all' ? notes.length : f === 'pending' ? pendingCount : doneCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DB status banner */}
      {dbAvailable === false && notes.length > 0 && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 px-4 py-3">
          <IconDatabase className="h-4 w-4 shrink-0 text-[#f59e0b] mt-0.5" />
          <div className="flex-1 text-xs text-[#f59e0b]">
            <p className="font-bold mb-1">Notes saved locally. Run this SQL in Supabase to enable cloud sync:</p>
            <details>
              <summary className="cursor-pointer underline text-[10px]">Show SQL migration</summary>
              <pre className="mt-2 select-all rounded-lg bg-[#0d1117] p-3 text-[10px] text-[#22c55e] font-mono whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS public.notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending',
  priority    TEXT        DEFAULT 'normal',
  reminder_at TIMESTAMPTZ,
  reminded    BOOLEAN     DEFAULT false,
  tags        TEXT[]      DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.notes
  USING (auth.role() = 'service_role');`}</pre>
            </details>
          </div>
        </div>
      )}

      {/* Quick add bar */}
      <div className="px-6 py-3">
        <button onClick={() => setShowAdd(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#1e2836] bg-[#0d1117] px-4 py-3 text-sm text-[#8b949e] hover:border-[#3b82f6]/30 hover:text-[#3b82f6] transition-all">
          <IconPlus className="h-4 w-4" />
          <span>e.g. PAGAR X MESS 500 · PARADOX LLC NO RENOVADA · LLAMAR CLIENTE XYZ</span>
        </button>
        <p className="mt-1.5 text-[10px] text-[#8b949e]">· AI analyzes tasks and can verify legal status, send emails, and more</p>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <IconLoader2 className="h-5 w-5 animate-spin text-[#8b949e]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <IconAlertCircle className="h-8 w-8 text-[#8b949e]" />
            <p className="text-sm text-[#8b949e]">No notes yet</p>
            <button onClick={() => setShowAdd(true)} className="text-xs text-[#3b82f6] hover:underline">Add your first note</button>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filtered.map(note => {
              const rem    = formatReminder(note.reminder_at);
              const isDone = note.status === 'done';
              return (
                <div key={note.id}
                  className={`group flex items-start gap-3 rounded-xl border p-4 transition-all ${
                    isDone ? 'border-[#1e2836] bg-[#0d1117] opacity-60' : 'border-[#1e2836] bg-[#141b26] hover:border-[#3b82f6]/20 hover:bg-[#1a2030]'
                  }`}>

                  {/* Checkbox */}
                  <button onClick={() => toggleStatus(note)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isDone ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                             : 'border-[#1e2836] hover:border-[#22c55e]/50 hover:text-[#22c55e]'
                    }`}>
                    {isDone ? <IconCheck className="h-3 w-3" strokeWidth={2.5} /> : <IconCircle className="h-3 w-3 opacity-30" />}
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-relaxed ${isDone ? 'line-through text-[#8b949e]' : 'text-[#e6edf3]'}`}>
                      {note.content}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-[#8b949e]">{formatDate(note.created_at)}</span>
                      {note.priority !== 'normal' && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${priorityColor(note.priority)}`}>
                          <IconFlag className="h-2.5 w-2.5" /> {note.priority}
                        </span>
                      )}
                      {rem && !isDone && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${rem.color}`}>
                          <IconClock className="h-2.5 w-2.5" />
                          {new Date(note.reminder_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {rem.label}
                        </span>
                      )}
                      {note.reminded && (
                        <span className="flex items-center gap-0.5 text-[10px] text-[#8b949e]">
                          <IconBellOff className="h-2.5 w-2.5" /> Notified
                        </span>
                      )}
                      {!note.synced && (
                        <span className="text-[9px] text-[#8b949e]/50">local only</span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={() => deleteNote(note.id)}
                    className="mt-0.5 hidden text-[#8b949e] hover:text-[#ef4444] group-hover:flex">
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
