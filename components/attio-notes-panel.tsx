'use client';

import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconStar, IconTrash, IconLayoutList, IconLayoutGrid, IconSettings, IconFilter, IconX, IconChevronDown } from '@tabler/icons-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Note {
  id: string;
  title: string;
  content: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  color: string;
  tags: string[];
}

const LS_NOTES = 'quivo_attio_notes';
const COLORS = ['#1c1c1f', '#222226', '#26262b', '#1a1a1e', '#242428', '#202024'];

function load(): Note[] {
  try { return JSON.parse(localStorage.getItem(LS_NOTES) ?? '[]'); } catch { return []; }
}
function save(n: Note[]) { localStorage.setItem(LS_NOTES, JSON.stringify(n)); }
function uid() { return `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(notes: Note[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, Note[]> = {};
  notes.forEach(n => {
    const d = new Date(n.createdAt).toDateString();
    const label = d === today ? 'Created today' : d === yesterday ? 'Yesterday' : new Date(n.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    groups[label] = [...(groups[label] ?? []), n];
  });
  return groups;
}

// ─── Note editor modal ─────────────────────────────────────────────────────────
function NoteEditor({ note, onSave, onClose }: {
  note: Partial<Note> | null;
  onSave: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle]   = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [color, setColor]   = useState(note?.color ?? COLORS[0]);
  const [tags, setTags]     = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  function handleSave() {
    if (!title.trim() && !content.trim()) return;
    onSave({ title: title.trim() || 'Untitled', content, favorite: note?.favorite ?? false, color, tags });
    onClose();
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-[560px] max-h-[80vh] flex flex-col rounded-xl border border-[#2e3138] shadow-2xl overflow-hidden"
        style={{ background: color }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2e3138] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-[#9ba3af]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 3h10v2H3zM3 7h10v2H3zM3 11h6v2H3z" /></svg>
            <span className="text-[11px] font-semibold text-[#e8eaed]">{note?.id ? 'Edit note' : 'New note'}</span>
          </div>
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`h-4 w-4 rounded-full border transition-all ${color === c ? 'border-[#ececec] scale-110' : 'border-[#3e4350]'}`}
                style={{ background: c }} />
            ))}
            <button onClick={onClose} className="ml-2 text-[#6b7280] hover:text-[#e8eaed]"><IconX className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
            className="w-full bg-transparent text-base font-semibold text-[#e8eaed] placeholder-[#6b7280] focus:outline-none" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write something..."
            rows={10} className="w-full bg-transparent text-[13px] text-[#e8eaed] placeholder-[#6b7280] focus:outline-none resize-none leading-relaxed" />

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 rounded-full border border-[#2e3138] bg-[#252830] px-2.5 py-0.5 text-[10px] text-[#9ba3af]">
                {t} <button onClick={() => setTags(tags.filter(x => x !== t))}><IconX className="h-2.5 w-2.5" /></button>
              </span>
            ))}
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
              placeholder="+ tag" className="w-16 bg-transparent text-[10px] text-[#6b7280] placeholder-[#6b7280] focus:outline-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-[#2e3138] px-4 py-2.5">
          <button onClick={onClose} className="text-[11px] text-[#9ba3af] hover:text-[#e8eaed]">Cancel</button>
          <div className="flex-1" />
          <button onClick={handleSave}
            className="rounded-md bg-[#ececec] px-4 py-1.5 text-[11px] font-semibold text-[#0a0a0a] transition-all hover:bg-white">
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Note card ─────────────────────────────────────────────────────────────────
function NoteCard({ note, view, onClick, onFavorite, onDelete }: {
  note: Note; view: 'grid' | 'list';
  onClick: () => void; onFavorite: () => void; onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  if (view === 'list') {
    return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onClick={onClick}
        className="group flex items-center gap-3 px-4 py-3 border-b border-[#2e3138]/50 last:border-0 hover:bg-[#22252a] cursor-pointer transition-all">
        <div className="h-8 w-8 rounded-lg border border-[#2e3138] shrink-0 flex items-center justify-center" style={{ background: note.color }}>
          <span className="text-base">{note.title[0]?.toUpperCase() ?? '📝'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#e8eaed] truncate">{note.title}</p>
          <p className="text-[11px] text-[#6b7280] truncate">{note.content.slice(0, 60) || 'No content'}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {note.tags.slice(0, 2).map(t => (
            <span key={t} className="rounded-full border border-[#2e3138] px-2 py-0.5 text-[9px] text-[#6b7280]">{t}</span>
          ))}
          <span className="text-[11px] text-[#6b7280]">{timeAgo(note.updatedAt)}</span>
          {hover && (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={onFavorite} className={`hover:scale-110 transition-all ${note.favorite ? 'text-[#f59e0b]' : 'text-[#6b7280]'}`}>
                <IconStar className="h-3.5 w-3.5" />
              </button>
              <button onClick={onDelete} className="text-[#6b7280] hover:text-[#ef4444] transition-all">
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onClick}
      className="relative cursor-pointer rounded-xl border border-[#2e3138] p-3.5 hover:border-[#3e4350] transition-all"
      style={{ background: note.color }}>
      {hover && (
        <div className="absolute top-2 right-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={onFavorite} className={`hover:scale-110 transition-all ${note.favorite ? 'text-[#f59e0b]' : 'text-[#6b7280]'}`}>
            <IconStar className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="text-[#6b7280] hover:text-[#ef4444] transition-all">
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <p className="text-[13px] font-semibold text-[#e8eaed] mb-1 truncate pr-12">{note.title}</p>
      <p className="text-[11px] text-[#9ba3af] leading-relaxed line-clamp-3">{note.content || 'No content'}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1">
          {note.tags.slice(0, 2).map(t => (
            <span key={t} className="rounded-full border border-[#2e3138] px-2 py-0.5 text-[9px] text-[#6b7280]">{t}</span>
          ))}
        </div>
        <span className="text-[10px] text-[#6b7280]">{timeAgo(note.updatedAt)}</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AttioNotesPanel() {
  const [notes, setNotes]         = useState<Note[]>([]);
  const [tab, setTab]             = useState<'notes' | 'templates'>('notes');
  const [view, setView]           = useState<'list' | 'grid'>('list');
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing]     = useState<Note | null>(null);
  const [search, setSearch]       = useState('');

  useEffect(() => { setNotes(load()); }, []);

  function saveNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
    let next: Note[];
    if (editing) {
      next = notes.map(n => n.id === editing.id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n);
    } else {
      const now = new Date().toISOString();
      next = [{ ...data, id: uid(), createdAt: now, updatedAt: now }, ...notes];
    }
    setNotes(next); save(next);
    setEditing(null);
  }

  function toggleFavorite(id: string) {
    const next = notes.map(n => n.id === id ? { ...n, favorite: !n.favorite } : n);
    setNotes(next); save(next);
  }

  function deleteNote(id: string) {
    const next = notes.filter(n => n.id !== id);
    setNotes(next); save(next);
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const favorites = filtered.filter(n => n.favorite);
  const nonFavorites = filtered.filter(n => !n.favorite);
  const grouped = groupByDate(nonFavorites);

  const openNote = (note: Note) => { setEditing(note); setShowEditor(true); };
  const openNew  = () => { setEditing(null); setShowEditor(true); };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)] text-[#e8eaed]">
      {(showEditor) && (
        <NoteEditor
          note={editing}
          onSave={saveNote}
          onClose={() => { setShowEditor(false); setEditing(null); }}
        />
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-[#2e3138] px-4 py-2.5">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button onClick={() => setTab('notes')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-all ${tab === 'notes' ? 'text-[#e8eaed]' : 'text-[#6b7280] hover:text-[#9ba3af]'}`}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 3h10v2H3zM3 7h6v2H3zM3 11h8v2H3z" /></svg>
            Notes <span className={`text-[10px] ${tab === 'notes' ? 'text-[#9ba3af]' : 'text-[#6b7280]'}`}>{notes.length}</span>
          </button>
          <button onClick={() => setTab('templates')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-all ${tab === 'templates' ? 'text-[#e8eaed]' : 'text-[#6b7280] hover:text-[#9ba3af]'}`}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 6h6M5 9h4" /></svg>
            Templates <span className="text-[10px] text-[#6b7280]">0</span>
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">Help</button>
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">Ask Quivo AI</button>
        </div>
      </div>

      {/* ── Sub-header ──────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-[#2e3138] px-4 py-2">
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">
          <IconLayoutList className="h-3 w-3" />
          Sorted by <strong className="text-[#e8eaed] ml-0.5">Creation date</strong>
          <IconChevronDown className="h-3 w-3" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setView('list')}
            className={`rounded-md p-1.5 transition-all ${view === 'list' ? 'bg-[#22252a] text-[#e8eaed]' : 'text-[#6b7280] hover:text-[#9ba3af]'}`}>
            <IconLayoutList className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView('grid')}
            className={`rounded-md p-1.5 transition-all ${view === 'grid' ? 'bg-[#22252a] text-[#e8eaed]' : 'text-[#6b7280] hover:text-[#9ba3af]'}`}>
            <IconLayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-[#9ba3af] hover:bg-[#22252a] hover:text-[#e8eaed] transition-all">
            <IconSettings className="h-3 w-3" /> View settings
          </button>
          <button onClick={openNew}
            className="flex items-center gap-1.5 rounded-md bg-[#ececec] px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0a] transition-all hover:bg-white shadow-sm">
            <IconPlus className="h-3.5 w-3.5" /> New note
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'templates' ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <svg className="h-10 w-10 text-[#3e4350]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h10M7 12h6" />
            </svg>
            <p className="text-[13px] font-semibold text-[#e8eaed]">Templates</p>
            <p className="text-[11px] text-[#6b7280] text-center">Templates help you create notes faster.<br />Save a note as a template to reuse it.</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-[#2e3138]">
              <svg className="h-10 w-10 text-[#3e4350]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 4h18l10 10v30H12z" /><path d="M30 4v10h10" /><path d="M18 22h14M18 28h10" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#e8eaed]">Notes</p>
              <p className="mt-1 text-[11px] text-[#6b7280]">No notes yet! Create your first note to<br />get started.</p>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-1.5 rounded-md bg-[#ececec] px-4 py-2 text-[12px] font-semibold text-[#0a0a0a] transition-all hover:bg-white">
              <IconPlus className="h-3.5 w-3.5" /> New note
            </button>
            <div className="mt-2">
              <p className="mb-2 text-center text-[10px] text-[#6b7280]">Learn more</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-[#2e3138] bg-[#1e2026] px-3 py-2 text-[10px] text-[#9ba3af]">
                  <svg className="h-4 w-4 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" /></svg>
                  Notes, Tasks, and Integrations
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Favorites section */}
            {favorites.length > 0 && (
              <div>
                <div className="border-b border-[#2e3138] px-4 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">Favorites</span>
                </div>
                {view === 'grid' ? (
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {favorites.map(n => <NoteCard key={n.id} note={n} view="grid" onClick={() => openNote(n)} onFavorite={() => toggleFavorite(n.id)} onDelete={() => deleteNote(n.id)} />)}
                  </div>
                ) : (
                  <div>
                    {favorites.map(n => <NoteCard key={n.id} note={n} view="list" onClick={() => openNote(n)} onFavorite={() => toggleFavorite(n.id)} onDelete={() => deleteNote(n.id)} />)}
                  </div>
                )}
              </div>
            )}

            {/* Grouped by date */}
            {Object.entries(grouped).map(([label, groupNotes]) => (
              <div key={label}>
                <div className="border-b border-[#2e3138] px-4 py-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">{label}</span>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#22252a] text-[9px] font-bold text-[#6b7280]">{groupNotes.length}</span>
                </div>
                {view === 'grid' ? (
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {groupNotes.map(n => <NoteCard key={n.id} note={n} view="grid" onClick={() => openNote(n)} onFavorite={() => toggleFavorite(n.id)} onDelete={() => deleteNote(n.id)} />)}
                  </div>
                ) : (
                  <div>
                    {groupNotes.map(n => <NoteCard key={n.id} note={n} view="list" onClick={() => openNote(n)} onFavorite={() => toggleFavorite(n.id)} onDelete={() => deleteNote(n.id)} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
