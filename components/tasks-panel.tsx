'use client';

import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconChevronDown, IconChevronLeft, IconChevronRight, IconCalendar, IconUser, IconLink, IconX, IconFilter, IconLayoutList, IconLayoutGrid, IconSettings, IconStar, IconTrash } from '@tabler/icons-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  dueDate: string | null; // ISO date string or null
  assignedTo: string;
  completed: boolean;
  createdAt: string;
}

type SortKey = 'dueDate' | 'createdAt' | 'title';

const LS_TASKS = 'finedge_tasks';

function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(LS_TASKS) ?? '[]'); } catch { return []; }
}
function saveTasks(tasks: Task[]) {
  localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
}
function uid() { return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// ─── Calendar picker ────────────────────────────────────────────────────────────
function CalendarPicker({ value, onChange, onClose }: { value: string | null; onChange: (d: string | null) => void; onClose: () => void }) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const start = firstDay === 0 ? 6 : firstDay - 1; // Mon-start
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(start).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Date(view.year, view.month).toLocaleString('en-US', { month: 'long' });

  function pick(day: number) {
    const d = new Date(view.year, view.month, day);
    onChange(d.toISOString().slice(0, 10));
    onClose();
  }

  function isToday(day: number) {
    return day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();
  }
  function isSelected(day: number) {
    if (!value) return false;
    const d = new Date(value);
    return day === d.getDate() && view.month === d.getMonth() && view.year === d.getFullYear();
  }

  const shortcuts = [
    { label: 'Today',     date: () => { const d = new Date(); return d.toISOString().slice(0, 10); } },
    { label: 'Tomorrow',  date: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); } },
    { label: 'Next week', date: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); } },
  ];

  return (
    <div ref={ref} className="absolute z-50 top-8 left-0 w-[220px] rounded-xl border border-[#2e3138] bg-[#1e2026] shadow-2xl p-3 text-xs">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          className="p-1 rounded hover:bg-[#2e3138] text-[#9ba3af]"><IconChevronLeft className="h-3 w-3" /></button>
        <span className="text-[11px] font-semibold text-[#e8eaed]">{monthName} {view.year}</span>
        <button onClick={() => setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          className="p-1 rounded hover:bg-[#2e3138] text-[#9ba3af]"><IconChevronRight className="h-3 w-3" /></button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] text-[#6b7280] font-semibold">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          <button key={i} disabled={!day} onClick={() => day && pick(day)}
            className={`h-6 w-6 mx-auto rounded-full text-[10px] font-medium transition-all ${
              !day ? '' :
              isSelected(day!) ? 'bg-[#ececec] text-[#0a0a0a]' :
              isToday(day!) ? 'bg-white/10 text-[#ececec] font-bold ring-1 ring-white/25' :
              'text-[#e8eaed] hover:bg-[#2e3138]'
            }`}>
            {day ?? ''}
          </button>
        ))}
      </div>
      {/* Shortcuts */}
      <div className="mt-2 pt-2 border-t border-[#2e3138] space-y-0.5">
        {shortcuts.map(s => (
          <button key={s.label} onClick={() => { onChange(s.date()); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#2e3138] hover:text-[#e8eaed] transition-all">
            <IconCalendar className="h-3 w-3" /> {s.label}
          </button>
        ))}
        <button onClick={() => { onChange(null); onClose(); }}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#2e3138] hover:text-[#e8eaed] transition-all">
          <IconX className="h-3 w-3" /> No date
        </button>
      </div>
    </div>
  );
}

// ─── Create task modal ─────────────────────────────────────────────────────────
function CreateTaskModal({ onSave, onClose }: { onSave: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(() => new Date().toISOString().slice(0, 10));
  const [createMore, setCreateMore] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function handleSave() {
    if (!title.trim()) return;
    onSave({ title: title.trim(), dueDate, assignedTo: 'You' });
    if (createMore) { setTitle(''); inputRef.current?.focus(); }
    else onClose();
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'No date';
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    // next tuesday etc
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff > 0 && diff <= 7) return `Next ${days[d.getDay()]}`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[440px] rounded-xl border border-[#2e3138] bg-[#1e2026] shadow-2xl overflow-visible">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2e3138]">
          <IconLayoutList className="h-3.5 w-3.5 text-[#9ba3af]" />
          <span className="text-[11px] font-semibold text-[#e8eaed]">Create task</span>
          <button onClick={onClose} className="ml-auto text-[#6b7280] hover:text-[#e8eaed]"><IconX className="h-3.5 w-3.5" /></button>
        </div>

        {/* Input */}
        <div className="px-4 pt-3 pb-2">
          <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full bg-transparent text-sm text-[#e8eaed] placeholder-[#6b7280] focus:outline-none"
          />
        </div>

        {/* Chips row */}
        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
          {/* Due date */}
          <div className="relative">
            <button onClick={() => setShowCal(v => !v)}
              className="flex items-center gap-1.5 rounded-md border border-[#2e3138] bg-[#252830] px-2.5 py-1 text-[11px] text-[#9ba3af] hover:bg-[#2e3138] transition-all">
              <IconCalendar className="h-3 w-3" /> {formatDate(dueDate)}
            </button>
            {showCal && <CalendarPicker value={dueDate} onChange={setDueDate} onClose={() => setShowCal(false)} />}
          </div>
          {/* Assigned */}
          <button className="flex items-center gap-1.5 rounded-md border border-[#2e3138] bg-[#252830] px-2.5 py-1 text-[11px] text-[#9ba3af] hover:bg-[#2e3138] transition-all">
            <IconUser className="h-3 w-3" /> Assigned to You
          </button>
          {/* Add record */}
          <button className="flex items-center gap-1.5 rounded-md border border-[#2e3138] bg-[#252830] px-2.5 py-1 text-[11px] text-[#9ba3af] hover:bg-[#2e3138] transition-all">
            <IconLink className="h-3 w-3" /> Add record
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[#2e3138] px-4 py-2.5">
          {/* Create more toggle */}
          <button onClick={() => setCreateMore(v => !v)}
            className={`relative h-4 w-7 rounded-full transition-colors ${createMore ? 'bg-[#e8e8ed]' : 'bg-[#2e3138]'}`}>
            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${createMore ? 'translate-x-3' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-[11px] text-[#9ba3af]">Create more</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-[11px] text-[#9ba3af] hover:text-[#e8eaed] transition-all">
            Cancel <span className="text-[#6b7280]">ESC</span>
          </button>
          <button onClick={handleSave} disabled={!title.trim()}
            className="flex items-center gap-1.5 rounded-md bg-[#ececec] px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0a] transition-all hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
            Save <span className="text-[#a8c0ff]">CTRL+↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const [hover, setHover] = useState(false);

  function formatDue(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { label: 'Overdue', color: 'text-[#ef4444]' };
    if (diff === 0) return { label: 'Today', color: 'text-[#f59e0b]' };
    if (diff === 1) return { label: 'Tomorrow', color: 'text-[#9ba3af]' };
    return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-[#9ba3af]' };
  }

  const due = formatDue(task.dueDate);

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="group flex items-center gap-3 px-4 py-2.5 border-b border-[#2e3138]/50 last:border-0 hover:bg-[#22252a] transition-all">
      {/* Checkbox */}
      <button onClick={onToggle}
        className={`h-4 w-4 shrink-0 rounded-[3px] border transition-all ${task.completed ? 'border-[#ececec] bg-[#ececec]' : 'border-[#3e4350] bg-transparent hover:border-[#6b6b70]'}`}>
        {task.completed && (
          <svg viewBox="0 0 12 12" className="h-full w-full p-0.5" fill="none" stroke="white" strokeWidth={2.5}><path d="M2 6l3 3 5-5" /></svg>
        )}
      </button>

      <span className={`flex-1 text-[13px] leading-tight transition-all ${task.completed ? 'line-through text-[#6b7280]' : 'text-[#e8eaed]'}`}>
        {task.title}
      </span>

      {/* Assignee */}
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold text-[#e8eaed] shrink-0">
        {task.assignedTo[0].toUpperCase()}
      </div>

      {/* Due date */}
      {due && <span className={`text-[11px] font-medium shrink-0 ${due.color}`}>{due.label}</span>}

      {/* Delete */}
      {hover && (
        <button onClick={onDelete} className="text-[#6b7280] hover:text-[#ef4444] transition-all">
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TasksPanel() {
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [sortKey, setSortKey]       = useState<SortKey>('dueDate');
  const [showSort, setShowSort]     = useState(false);

  useEffect(() => { setTasks(loadTasks()); }, []);

  function addTask(t: Omit<Task, 'id' | 'createdAt' | 'completed'>) {
    const next = [...tasks, { ...t, id: uid(), createdAt: new Date().toISOString(), completed: false }];
    setTasks(next); saveTasks(next);
  }
  function toggleTask(id: string) {
    const next = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(next); saveTasks(next);
  }
  function deleteTask(id: string) {
    const next = tasks.filter(t => t.id !== id);
    setTasks(next); saveTasks(next);
  }

  const sorted = [...tasks].sort((a, b) => {
    if (sortKey === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortKey === 'title') return a.title.localeCompare(b.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pending   = sorted.filter(t => !t.completed);
  const completed = sorted.filter(t => t.completed);

  const sortLabels: Record<SortKey, string> = { dueDate: 'Due date', createdAt: 'Creation date', title: 'Title' };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)] text-[#e8eaed]">
      {showCreate && <CreateTaskModal onSave={addTask} onClose={() => setShowCreate(false)} />}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-[#2e3138] px-4 py-2.5">
        <IconLayoutList className="mr-2 h-4 w-4 text-[#9ba3af]" />
        <span className="text-[13px] font-semibold text-[#e8eaed]">Tasks</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="8" cy="8" r="6" /><path d="M8 6v4M8 11v.5" /></svg>
            Help
          </button>
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2" /></svg>
            Ask Finedge AI
          </button>
        </div>
      </div>

      {/* ── Sub-header ───────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-[#2e3138] px-4 py-2">
        {/* Sort */}
        <div className="relative">
          <button onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">
            <IconLayoutList className="h-3 w-3" />
            Sorted by <strong className="text-[#e8eaed] ml-0.5">{sortLabels[sortKey]}</strong>
            <IconChevronDown className="h-3 w-3" />
          </button>
          {showSort && (
            <div className="absolute z-20 top-8 left-0 w-40 rounded-xl border border-[#2e3138] bg-[#1e2026] shadow-xl py-1">
              {(Object.entries(sortLabels) as [SortKey, string][]).map(([k, label]) => (
                <button key={k} onClick={() => { setSortKey(k); setShowSort(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-[11px] hover:bg-[#22252a] transition-all ${sortKey === k ? 'text-[#ececec] font-medium' : 'text-[#9ba3af]'}`}>
                  {label}
                  {sortKey === k && <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M2 6l3 3 5-5" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="ml-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">
          <IconFilter className="h-3 w-3" /> Filter
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">
            <IconSettings className="h-3 w-3" /> View settings
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#ececec] px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0a] transition-all hover:bg-white shadow-sm">
            <IconPlus className="h-3.5 w-3.5" /> New task
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-[#2e3138]">
              <svg className="h-10 w-10 text-[#3e4350]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="8" y="4" width="32" height="40" rx="3" />
                <path d="M16 16h16M16 24h16M16 32h10" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#e8eaed]">Tasks</p>
              <p className="mt-1 text-[11px] text-[#6b7280]">No tasks yet! Create your first<br />task to get started.</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#ececec] px-4 py-2 text-[12px] font-semibold text-[#0a0a0a] transition-all hover:bg-white">
              <IconPlus className="h-3.5 w-3.5" /> New task
            </button>

            {/* Learn more */}
            <div className="mt-4">
              <p className="mb-2 text-center text-[10px] text-[#6b7280]">Learn more</p>
              <div className="flex gap-3">
                {['Notes, Tasks, and Integrations', 'Introduction to tasks'].map(label => (
                  <div key={label} className="flex items-center gap-2 rounded-lg border border-[#2e3138] bg-[#1e2026] px-3 py-2 text-[10px] text-[#9ba3af]">
                    <svg className="h-4 w-4 text-[#6b7280] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" /></svg>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Pending tasks */}
            {pending.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 bg-[#16181c] px-4 py-1.5 border-b border-[#2e3138]">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">Pending — {pending.length}</span>
                </div>
                {pending.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={() => deleteTask(t.id)} />
                ))}
              </div>
            )}

            {/* Completed tasks */}
            {completed.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 bg-[#16181c] px-4 py-1.5 border-b border-[#2e3138]">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">Completed — {completed.length}</span>
                </div>
                {completed.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} onDelete={() => deleteTask(t.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
