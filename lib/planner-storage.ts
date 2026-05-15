export type PlannerKind = 'task' | 'note';

export interface PlannerItem {
  id: string;
  kind: PlannerKind;
  title: string;
  body: string;
  completed: boolean;
  favorite: boolean;
  dueDate: string | null;
  dueTime: string | null;
  reminderAt: string | null;
  reminded: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export const LS_PLANNER = 'quivo_planner';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadLegacyTasks(): PlannerItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem('quivo_tasks') ?? '[]') as Array<{
      id: string;
      title: string;
      dueDate: string | null;
      completed: boolean;
      createdAt: string;
    }>;
    return raw.map(t => ({
      id: t.id,
      kind: 'task' as const,
      title: t.title,
      body: '',
      completed: t.completed,
      favorite: false,
      dueDate: t.dueDate,
      dueTime: null,
      reminderAt: t.dueDate ? `${t.dueDate}T09:00:00` : null,
      reminded: false,
      createdAt: t.createdAt,
      updatedAt: t.createdAt,
      tags: [],
    }));
  } catch {
    return [];
  }
}

function loadLegacyNotes(): PlannerItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem('quivo_attio_notes') ?? '[]') as Array<{
      id: string;
      title: string;
      content: string;
      favorite: boolean;
      createdAt: string;
      updatedAt: string;
      tags: string[];
    }>;
    return raw.map(n => ({
      id: n.id,
      kind: 'note' as const,
      title: n.title,
      body: n.content,
      completed: false,
      favorite: n.favorite,
      dueDate: null,
      dueTime: null,
      reminderAt: null,
      reminded: false,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      tags: n.tags ?? [],
    }));
  } catch {
    return [];
  }
}

export function loadPlannerItems(): PlannerItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LS_PLANNER);
    if (stored) return JSON.parse(stored) as PlannerItem[];
  } catch {
    /* migrate */
  }
  const merged = [...loadLegacyTasks(), ...loadLegacyNotes()];
  if (merged.length) savePlannerItems(merged);
  return merged;
}

export function savePlannerItems(items: PlannerItem[]) {
  localStorage.setItem(LS_PLANNER, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('quivo:planner-updated'));
}

export function createPlannerItem(
  partial: Pick<PlannerItem, 'kind' | 'title'> &
    Partial<Omit<PlannerItem, 'id' | 'kind' | 'title' | 'createdAt' | 'updatedAt'>>,
): PlannerItem {
  const now = new Date().toISOString();
  return {
    id: uid(partial.kind),
    kind: partial.kind,
    title: partial.title.trim() || (partial.kind === 'note' ? 'Untitled note' : 'New task'),
    body: partial.body ?? '',
    completed: partial.completed ?? false,
    favorite: partial.favorite ?? false,
    dueDate: partial.dueDate ?? null,
    dueTime: partial.dueTime ?? null,
    reminderAt: partial.reminderAt ?? null,
    reminded: partial.reminded ?? false,
    createdAt: now,
    updatedAt: now,
    tags: partial.tags ?? [],
  };
}

export function buildReminderIso(dueDate: string | null, dueTime: string | null): string | null {
  if (!dueDate) return null;
  const time = dueTime && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : '09:00';
  return new Date(`${dueDate}T${time}:00`).toISOString();
}
