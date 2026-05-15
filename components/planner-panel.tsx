'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconBell,
  IconCalendar,
  IconCheck,
  IconClock,
  IconNotes,
  IconPlus,
  IconStar,
  IconTrash,
  IconLayoutList,
} from '@tabler/icons-react';
import {
  buildReminderIso,
  createPlannerItem,
  loadPlannerItems,
  savePlannerItems,
  type PlannerItem,
  type PlannerKind,
} from '@/lib/planner-storage';

type Filter = 'all' | 'task' | 'note';

function formatDue(item: PlannerItem) {
  if (!item.dueDate) return null;
  const label = item.dueTime ? `${item.dueDate} ${item.dueTime}` : item.dueDate;
  const at = new Date(buildReminderIso(item.dueDate, item.dueTime) ?? '');
  const overdue = !item.completed && !Number.isNaN(at.getTime()) && at.getTime() < Date.now();
  return { label, overdue };
}

export default function PlannerPanel() {
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<PlannerKind>('task');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [editing, setEditing] = useState<PlannerItem | null>(null);
  const [body, setBody] = useState('');

  const refresh = useCallback(() => setItems(loadPlannerItems()), []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('quivo:planner-updated', onUpdate);
    return () => window.removeEventListener('quivo:planner-updated', onUpdate);
  }, [refresh]);

  const visible = useMemo(() => {
    const list = filter === 'all' ? items : items.filter(i => i.kind === filter);
    return [...list].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const ad = a.reminderAt ? new Date(a.reminderAt).getTime() : Infinity;
      const bd = b.reminderAt ? new Date(b.reminderAt).getTime() : Infinity;
      return ad - bd;
    });
  }, [items, filter]);

  const pendingCount = items.filter(i => !i.completed && (i.kind === 'note' || !i.completed)).length;

  function persist(next: PlannerItem[]) {
    setItems(next);
    savePlannerItems(next);
  }

  function addItem() {
    if (!title.trim()) return;
    const reminderAt = buildReminderIso(dueDate || null, dueTime || null);
    const item = createPlannerItem({
      kind,
      title: title.trim(),
      body: '',
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      reminderAt,
      reminded: false,
    });
    persist([item, ...items]);
    setTitle('');
    setDueDate('');
    setDueTime('');
  }

  function toggleComplete(id: string) {
    persist(
      items.map(i =>
        i.id === id ? { ...i, completed: !i.completed, updatedAt: new Date().toISOString() } : i,
      ),
    );
  }

  function toggleFavorite(id: string) {
    persist(
      items.map(i =>
        i.id === id ? { ...i, favorite: !i.favorite, updatedAt: new Date().toISOString() } : i,
      ),
    );
  }

  function remove(id: string) {
    persist(items.filter(i => i.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  function saveEdit() {
    if (!editing) return;
    const reminderAt = buildReminderIso(editing.dueDate, editing.dueTime);
    persist(
      items.map(i =>
        i.id === editing.id
          ? {
              ...editing,
              body,
              reminderAt,
              reminded: false,
              updatedAt: new Date().toISOString(),
            }
          : i,
      ),
    );
    setEditing(null);
    setBody('');
  }

  async function enableReminders() {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="flex items-center justify-end border-b border-[var(--bg-border)] px-5 py-2">
        <button type="button" onClick={enableReminders} className="quivo-btn-ghost rounded-full px-3 py-1.5 text-[12px]">
          <IconBell className="mr-1 inline h-4 w-4" stroke={1.75} />
          Reminders
        </button>
      </div>

      <div className="border-b border-[var(--bg-border)] px-5 py-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'task', 'note'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] ring-1 ring-[var(--bg-border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'task' ? 'Tasks' : 'Notes'}
              {f === 'all' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex rounded-full border border-[var(--bg-border)] p-0.5">
            <button
              type="button"
              onClick={() => setKind('task')}
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${kind === 'task' ? 'quivo-btn-gradient !py-1' : 'text-[var(--text-muted)]'}`}
            >
              Task
            </button>
            <button
              type="button"
              onClick={() => setKind('note')}
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${kind === 'note' ? 'quivo-btn-gradient !py-1' : 'text-[var(--text-muted)]'}`}
            >
              Note
            </button>
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder={kind === 'task' ? 'What do you need to do?' : 'Note title…'}
            className="min-w-[200px] flex-1 rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-4 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--quivo-accent)_50%,transparent)]"
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-2 text-[12px] text-[var(--text-secondary)]"
            aria-label="Due date"
          />
          <input
            type="time"
            value={dueTime}
            onChange={e => setDueTime(e.target.value)}
            className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-2 text-[12px] text-[var(--text-secondary)]"
            aria-label="Reminder time"
          />
          <button type="button" onClick={addItem} className="quivo-btn-gradient flex items-center gap-1 rounded-full px-4 py-2 text-[12px]">
            <IconPlus className="h-4 w-4" stroke={2} />
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[var(--bg-border)]">
              <IconLayoutList className="h-7 w-7 text-[var(--text-muted)]" stroke={1.5} />
            </div>
            <p className="text-[14px] font-medium">Nothing here yet</p>
            <p className="max-w-xs text-[12px] text-[var(--text-muted)]">
              Add a task with a date and time to get a browser reminder when it is due.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {visible.map(item => {
              const due = formatDue(item);
              const Icon = item.kind === 'task' ? IconCheck : IconNotes;
              return (
                <li
                  key={item.id}
                  className="group flex items-start gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-colors hover:border-[var(--bg-border)] hover:bg-[var(--bg-hover)]"
                >
                  {item.kind === 'task' ? (
                    <button
                      type="button"
                      onClick={() => toggleComplete(item.id)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        item.completed
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                          : 'border-[var(--bg-border)] hover:border-cyan-400/50'
                      }`}
                      aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {item.completed && <IconCheck className="h-3 w-3" stroke={2.5} />}
                    </button>
                  ) : (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--text-muted)]">
                      <Icon className="h-4 w-4" stroke={1.75} />
                    </span>
                  )}
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setEditing(item);
                      setBody(item.body);
                    }}
                  >
                    <p
                      className={`text-[14px] font-medium leading-snug ${
                        item.completed ? 'text-[var(--text-muted)] line-through' : ''
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.body ? (
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--text-secondary)]">{item.body}</p>
                    ) : null}
                    {due ? (
                      <p
                        className={`mt-1 flex items-center gap-1 text-[11px] ${
                          due.overdue ? 'text-rose-400' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        <IconCalendar className="h-3 w-3" />
                        {due.label}
                        {item.dueTime && <IconClock className="ml-1 h-3 w-3" />}
                      </p>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.id)}
                      className={`rounded-full p-1.5 ${item.favorite ? 'text-amber-400' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'}`}
                      aria-label="Favorite"
                    >
                      <IconStar className="h-4 w-4" fill={item.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="Delete"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setEditing(null)}
        >
          <div className="w-full max-w-lg rounded-3xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-5 shadow-2xl">
            <h2 className="text-[16px] font-semibold">Edit {editing.kind}</h2>
            <input
              value={editing.title}
              onChange={e => setEditing({ ...editing, title: e.target.value })}
              className="mt-3 w-full rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-hover)] px-4 py-2.5 text-[14px] outline-none"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Details…"
              className="mt-2 w-full resize-none rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-hover)] px-4 py-2.5 text-[13px] outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="date"
                value={editing.dueDate ?? ''}
                onChange={e => setEditing({ ...editing, dueDate: e.target.value || null })}
                className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-2 text-[12px]"
              />
              <input
                type="time"
                value={editing.dueTime ?? ''}
                onChange={e => setEditing({ ...editing, dueTime: e.target.value || null })}
                className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-2 text-[12px]"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="quivo-btn-ghost rounded-full px-4 py-2 text-[13px]">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} className="quivo-btn-gradient rounded-full px-4 py-2 text-[13px]">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

