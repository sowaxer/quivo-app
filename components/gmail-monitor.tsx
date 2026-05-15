'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import {
  IconMail,
  IconSearch,
  IconArchive,
  IconTrash,
  IconSend,
  IconRefresh,
  IconLoader2,
  IconX,
  IconArrowBackUp,
  IconBrandGoogle,
  IconMenu2,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconHelp,
  IconSettings,
  IconLayoutGrid,
  IconCheckbox,
  IconStar,
  IconStarFilled,
  IconMailOpened,
  IconClock,
} from '@tabler/icons-react';
import { useGoogleConnection } from '@/lib/use-google-connection';
import { cn } from '@/lib/utils';

type MailFolder = 'inbox' | 'starred' | 'snoozed' | 'sent' | 'drafts';
type CategoryTab = 'all' | 'primary' | 'social' | 'promotions';

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body?: string;
  unread: boolean;
  labelIds: string[];
}

interface LabelRow {
  id: string | null | undefined;
  name: string | null | undefined;
  messagesTotal?: number | null;
  messagesUnread?: number | null;
}

function formatListDate(raw: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const y = d.getFullYear();
  if (y === now.getFullYear())
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function senderName(from: string) {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.replace(/<.*>/, '').trim();
}

function buildListQuery(folder: MailFolder, category: CategoryTab | null, search: string): string {
  let base = '';
  switch (folder) {
    case 'inbox':
      base = 'in:inbox';
      if (category === 'primary') base += ' category:primary';
      else if (category === 'social') base += ' category:social';
      else if (category === 'promotions') base += ' category:promotions';
      // category === 'all' | null → plain in:inbox (matches full inbox)
      break;
    case 'starred':
      base = 'is:starred';
      break;
    case 'snoozed':
      base = 'label:snoozed';
      break;
    case 'sent':
      base = 'in:sent';
      break;
    case 'drafts':
      base = 'in:drafts';
      break;
    default:
      base = 'in:inbox';
  }
  const s = search.trim();
  if (!s) return base;
  return `${base} ${s}`;
}

// ─── Not connected ───────────────────────────────────────────────────────────
function ConnectPrompt({ onConnect }: { onConnect: () => void }) {
  const [diag, setDiag] = useState<{ checks: { label: string; ok: boolean; note?: string }[]; nextStep?: string } | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  async function loadDiag() {
    setShowDiag(true);
    try {
      const res = await fetch('/api/google/auth/diagnose', { credentials: 'include' });
      if (res.ok) setDiag(await res.json());
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)]">
        <IconMail className="h-8 w-8 text-[var(--quivo-accent)]" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Connect Gmail</h3>
        <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
          Connect your Google account to read, send, and manage emails directly from Quivo.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onConnect}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:brightness-110"
        >
          <IconBrandGoogle className="h-4 w-4" />
          Connect Google Workspace
        </button>
        <button type="button" onClick={loadDiag} className="text-[11px] text-[var(--text-muted)] underline hover:text-[var(--quivo-accent)]">
          Not working? Run diagnostics
        </button>
      </div>
      {showDiag && (
        <div className="w-full max-w-md rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-4 text-left">
          <p className="mb-3 text-xs font-bold text-[var(--text-primary)]">Google OAuth Diagnostics</p>
          {!diag ? (
            <p className="text-xs text-[var(--text-muted)]">Loading…</p>
          ) : (
            <div className="space-y-2">
              {diag.checks.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={cn('mt-0.5 text-xs', c.ok ? 'text-emerald-500' : 'text-red-400')}>{c.ok ? '✓' : '✗'}</span>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{c.label}</p>
                    {c.note && <p className="text-[10px] text-[var(--text-muted)]">{c.note}</p>}
                  </div>
                </div>
              ))}
              {diag.nextStep && (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-600 dark:text-amber-200">
                  Next: {diag.nextStep}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-[var(--text-muted)]">Grants Gmail, Calendar and Drive permissions</p>
    </div>
  );
}

export default function GmailMonitor() {
  const { user } = useUser();
  const { connected, checking, recheck } = useGoogleConnection();
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [category, setCategory] = useState<CategoryTab>('all');
  const [emails, setEmails] = useState<Email[]>([]);
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [selected, setSelected] = useState<Email | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [listError, setListError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [resultSizeEstimate, setResultSizeEstimate] = useState<number | undefined>(undefined);
  const [pageStart, setPageStart] = useState(1);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composeTo, setComposeTo] = useState('');
  const [composeSub, setComposeSub] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const labelMap = useMemo(() => {
    const m = new Map<string, LabelRow>();
    for (const l of labels) {
      if (l.id) m.set(l.id, l);
    }
    return m;
  }, [labels]);

  const inboxUnread = labelMap.get('INBOX')?.messagesUnread ?? 0;
  const draftsTotal = labelMap.get('DRAFT')?.messagesTotal ?? 0;

  const loadLabels = useCallback(async () => {
    try {
      const res = await fetch('/api/google/gmail?action=labels', { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as { labels?: LabelRow[] };
      setLabels(data.labels ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(
    async (opts?: { resetPage?: boolean; token?: string | undefined }) => {
      const reset = opts?.resetPage !== false;
      const token = opts?.token;
      setLoading(true);
      setListError(null);
      if (reset) {
        setPageStart(1);
      }
      const q = buildListQuery(folder, folder === 'inbox' ? category : null, searchQ);
      const pt = reset ? undefined : token;
      if (!reset && !token) {
        setLoading(false);
        return;
      }
      try {
        const url = new URL('/api/google/gmail', window.location.origin);
        url.searchParams.set('action', 'list');
        url.searchParams.set('q', q);
        url.searchParams.set('maxResults', '50');
        if (pt) url.searchParams.set('pageToken', pt);

        const res = await fetch(url.toString(), { credentials: 'include' });
        const data = (await res.json()) as {
          emails?: Email[];
          code?: string;
          error?: string;
          details?: unknown;
          nextPageToken?: string;
          resultSizeEstimate?: number;
        };

        if (data.code === 'NOT_CONNECTED') {
          recheck();
          setListError('Google session expired. Reconnect in Settings.');
          setEmails([]);
          return;
        }

        if (!res.ok) {
          const detail =
            Array.isArray(data.details) ? (data.details as string[]).join(' · ') : JSON.stringify(data.details ?? '');
          setListError(data.error || `Request failed (${res.status})${detail ? ` — ${detail}` : ''}`);
          setEmails([]);
          return;
        }

        setEmails(data.emails ?? []);
        setNextPageToken(data.nextPageToken);
        setResultSizeEstimate(data.resultSizeEstimate);
      } catch (e) {
        setListError(e instanceof Error ? e.message : 'Network error');
        setEmails([]);
      } finally {
        setLoading(false);
      }
    },
    [folder, category, searchQ, recheck],
  );

  // folder/category change → reload from start
  useEffect(() => {
    if (!connected) return;
    void load({ resetPage: true });
    void loadLabels();
  }, [connected, folder, category, load]);

  useEffect(() => {
    if (connected) void loadLabels();
  }, [connected, loadLabels]);

  const openEmail = async (email: Email) => {
    setSelected(email);
    setBodyLoading(true);
    try {
      const res = await fetch(`/api/google/gmail?action=read&id=${encodeURIComponent(email.id)}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setSelected({ ...email, body: data.error || data.snippet || email.snippet });
        return;
      }
      setSelected({ ...email, body: data.body || data.snippet });
      if (email.unread) {
        fetch('/api/google/gmail', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markRead', id: email.id }),
        });
        setEmails(prev => prev.map(e => (e.id === email.id ? { ...e, unread: false } : e)));
      }
    } finally {
      setBodyLoading(false);
    }
  };

  const archive = async (id: string) => {
    await fetch('/api/google/gmail', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive', id }),
    });
    setEmails(prev => prev.filter(e => e.id !== id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    if (selected?.id === id) setSelected(null);
  };

  const trash = async (id: string) => {
    await fetch('/api/google/gmail', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setEmails(prev => prev.filter(e => e.id !== id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    if (selected?.id === id) setSelected(null);
  };

  const toggleRead = async (id: string, markRead: boolean) => {
    await fetch('/api/google/gmail', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: markRead ? 'markRead' : 'markUnread', id }),
    });
    setEmails(prev => prev.map(e => (e.id === id ? { ...e, unread: !markRead } : e)));
  };

  const toggleStar = async (id: string, starred: boolean) => {
    await fetch('/api/google/gmail', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: starred ? 'unstar' : 'star', id }),
    });
    setEmails(prev =>
      prev.map(e =>
        e.id === id
          ? {
              ...e,
              labelIds: starred
                ? (e.labelIds ?? []).filter(l => l !== 'STARRED')
                : [...(e.labelIds ?? []).filter(l => l !== 'STARRED'), 'STARRED'],
            }
          : e,
      ),
    );
  };

  const send = async () => {
    if (!composeTo || !composeSub || !composeBody) return;
    setSending(true);
    try {
      await fetch('/api/google/gmail', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo, subject: composeSub, body: composeBody }),
      });
      setShowCompose(false);
      setComposeTo('');
      setComposeSub('');
      setComposeBody('');
    } finally {
      setSending(false);
    }
  };

  const reply = () => {
    if (!selected) return;
    setComposeTo(senderName(selected.from));
    setComposeSub(`Re: ${selected.subject}`);
    setComposeBody(`\n\n--- Original ---\n${selected.snippet}`);
    setShowCompose(true);
  };

  const connectGoogle = () => {
    window.location.href = '/api/google/auth';
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllOnPage = () => {
    if (selectedIds.size === emails.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(emails.map(e => e.id)));
  };

  const pageEnd = pageStart + emails.length - 1;
  const paginationText =
    emails.length > 0
      ? `${pageStart}-${pageEnd} of ${typeof resultSizeEstimate === 'number' ? resultSizeEstimate.toLocaleString() : resultSizeEstimate ?? '…'}`
      : typeof resultSizeEstimate === 'number'
        ? `0 of ${resultSizeEstimate.toLocaleString()}`
        : '0';

  if (checking) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3">
        <IconLoader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        <p className="text-xs text-[var(--text-muted)]">Checking Google connection…</p>
      </div>
    );
  }

  if (!connected) {
    return <ConnectPrompt onConnect={connectGoogle} />;
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* ── Top bar (Gmail-style) ───────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] px-2 pl-3 pr-4">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          aria-label="Menu"
          onClick={() => setSidebarOpen(s => !s)}
        >
          <IconMenu2 className="h-5 w-5" stroke={1.75} />
        </button>
        <div className="flex shrink-0 items-center gap-2 pr-2">
          <IconBrandGoogle className="h-6 w-6 text-[var(--quivo-accent)]" />
          <span className="hidden text-[22px] font-normal tracking-tight text-[var(--text-primary)] sm:inline">Gmail</span>
        </div>
        <div className="relative mx-2 min-w-0 flex-1 max-w-3xl">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void load({ resetPage: true })}
            placeholder="Search mail"
            className="h-11 w-full rounded-full border border-[var(--bg-border)] bg-[var(--bg-card)] py-2 pl-12 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:border-[var(--quivo-accent)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--quivo-accent)]/30"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            aria-label="Search options"
          >
            <IconFilter className="h-4 w-4" />
          </button>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] md:flex" aria-label="Help">
            <IconHelp className="h-5 w-5" />
          </button>
          <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] md:flex" aria-label="Settings">
            <IconSettings className="h-5 w-5" />
          </button>
          <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] lg:flex" aria-label="Google apps">
            <IconLayoutGrid className="h-5 w-5" />
          </button>
          {user?.imageUrl ? (
            <Image src={user.imageUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full ring-1 ring-[var(--bg-border)]" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-hover)] text-xs font-semibold ring-1 ring-[var(--bg-border)]">
              {(user?.firstName ?? 'U').charAt(0)}
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Left sidebar ───────────────────────────────────────────── */}
        <aside
          className={cn(
            'flex w-[260px] shrink-0 flex-col border-r border-[var(--bg-border)] bg-[var(--bg-surface)] transition-[width,margin] duration-200',
            !sidebarOpen && 'w-0 overflow-hidden border-0',
          )}
        >
          <div className="p-3">
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              <IconSend className="h-5 w-5 text-white/95" />
              Compose
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {(
              [
                { id: 'inbox' as const, label: 'Inbox', icon: IconMail, count: inboxUnread },
                { id: 'starred' as const, label: 'Starred', icon: IconStar, count: 0 },
                { id: 'snoozed' as const, label: 'Snoozed', icon: IconClock, count: 0 },
                { id: 'sent' as const, label: 'Sent', icon: IconSend, count: 0 },
                { id: 'drafts' as const, label: 'Drafts', icon: IconMailOpened, count: draftsTotal },
              ] as const
            ).map(row => {
              const Icon = row.icon;
              const active = folder === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setFolder(row.id);
                    setCategory('all');
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-r-full py-2 pl-4 pr-3 text-[14px] transition-colors',
                    active ? 'bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 opacity-90" stroke={active ? 2.25 : 1.75} />
                  <span className="flex-1 text-left">{row.label}</span>
                  {row.count ? (
                    <span className={cn('text-xs tabular-nums', active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
                      {row.count > 999 ? '999+' : row.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
            <div className="pt-4">
              <p className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Categories</p>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-4 py-1.5 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">
                <span className="text-lg leading-none">›</span> Collapsed
              </button>
            </div>
            <div className="pt-3">
              <div className="flex items-center justify-between px-4 pb-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Labels</p>
                <button type="button" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Create label">
                  +
                </button>
              </div>
            </div>
          </nav>
        </aside>

        {/* ── Main list + optional reader ─────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {folder === 'inbox' && (
            <div className="flex shrink-0 border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4">
              {(
                [
                  { id: 'all' as const, label: 'All' },
                  { id: 'primary' as const, label: 'Primary' },
                  { id: 'social' as const, label: 'Social' },
                  { id: 'promotions' as const, label: 'Promotions' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={cn(
                    'relative px-5 py-3 text-sm transition-colors',
                    category === tab.id ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {tab.label}
                  {category === tab.id && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--quivo-accent)]" />}
                </button>
              ))}
            </div>
          )}

          {listError && (
            <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-100">
              {listError}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-2 text-sm">
              <button type="button" onClick={selectAllOnPage} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[var(--bg-card)]">
                <IconCheckbox className="h-4 w-4" />
                {selectedIds.size === emails.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-[var(--text-muted)]">{selectedIds.size} selected</span>
            </div>
          )}

          <div className="flex min-h-0 flex-1">
            <div className={cn('flex min-w-0 flex-col border-r border-[var(--bg-border)]', selected ? 'w-[min(100%,560px)] shrink-0 lg:w-[480px]' : 'flex-1')}>
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] px-2 py-1.5">
                <button type="button" onClick={selectAllOnPage} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)]" title="Select">
                  <IconCheckbox className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => void load({ resetPage: true })} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)]" title="Refresh">
                  <IconRefresh className={cn('h-4 w-4', loading && 'animate-spin')} />
                </button>
                <div className="ml-auto flex items-center gap-1 pr-2 text-xs text-[var(--text-muted)]">
                  <span className="tabular-nums">{paginationText}</span>
                  <button
                    type="button"
                    disabled={pageStart <= 1}
                    className="rounded p-1 hover:bg-[var(--bg-hover)] disabled:opacity-30"
                    title="Newer"
                    onClick={() => {
                      /* Gmail API is forward-only with pageToken; “newer” needs token stack — skip for MVP */
                    }}
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!nextPageToken}
                    className="rounded p-1 hover:bg-[var(--bg-hover)] disabled:opacity-30"
                    title="Older"
                    onClick={() => {
                      if (!nextPageToken) return;
                      setPageStart(s => s + emails.length);
                      void load({ resetPage: false, token: nextPageToken });
                    }}
                  >
                    <IconChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex h-48 items-center justify-center">
                    <IconLoader2 className="h-7 w-7 animate-spin text-[var(--text-muted)]" />
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
                    <p className="text-sm text-[var(--text-muted)]">No emails in this view</p>
                    <p className="max-w-xs text-xs text-[var(--text-muted)]">
                      Choose the <strong className="text-[var(--text-secondary)]">All</strong> tab for the full inbox, or pick a category. If the banner above shows an error, reconnect Google in Settings.
                    </p>
                    <button type="button" className="text-xs text-[var(--quivo-accent)] hover:underline" onClick={() => void load({ resetPage: true })}>
                      Refresh
                    </button>
                  </div>
                ) : (
                  emails.map(email => {
                    const starred = (email.labelIds ?? []).includes('STARRED');
                    return (
                      <div
                        key={email.id}
                        role="button"
                        tabIndex={0}
                        onMouseEnter={() => setHoverId(email.id)}
                        onMouseLeave={() => setHoverId(null)}
                        onClick={() => void openEmail(email)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void openEmail(email);
                          }
                        }}
                        className={cn(
                          'group flex cursor-pointer items-stretch border-b border-[var(--bg-border)] text-left transition-colors',
                          'bg-[var(--bg-base)] hover:bg-[var(--bg-hover)]',
                          selected?.id === email.id && 'bg-[var(--bg-hover)] ring-1 ring-inset ring-[var(--quivo-accent)]/25',
                        )}
                      >
                        <div className="flex w-12 shrink-0 items-center justify-center pt-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(email.id)}
                            onChange={() => toggleSelect(email.id)}
                            className="h-4 w-4 rounded border-[var(--bg-border)]"
                          />
                        </div>
                        <div className="flex w-10 shrink-0 items-start justify-center pt-2" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => void toggleStar(email.id, starred)}
                            className="rounded p-0.5 text-[var(--text-muted)] hover:text-amber-400"
                            aria-label={starred ? 'Unstar' : 'Star'}
                          >
                            {starred ? <IconStarFilled className="h-4 w-4 text-amber-400" /> : <IconStar className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="flex min-w-0 flex-1 items-start gap-3 py-2 pr-3">
                          <div
                            className={cn(
                              'w-[160px] shrink-0 truncate text-[14px] leading-snug',
                              email.unread ? 'font-bold text-[var(--text-primary)]' : 'font-normal text-[var(--text-secondary)]',
                            )}
                          >
                            {senderName(email.from)}
                          </div>
                          <div className="min-w-0 flex-1 leading-snug">
                            <span className={cn('text-[14px]', email.unread ? 'font-bold text-[var(--text-primary)]' : 'font-normal text-[var(--text-secondary)]')}>
                              {email.subject}
                            </span>
                            <span className="text-[14px] text-[var(--text-muted)]"> — {email.snippet}</span>
                          </div>
                          <div className="relative w-[88px] shrink-0 text-right text-[12px] text-[var(--text-muted)]">
                            {hoverId === email.id ? (
                              <div className="flex items-center justify-end gap-0.5 pr-0 pt-0.5" onClick={e => e.stopPropagation()}>
                                <button type="button" className="rounded p-1.5 hover:bg-[var(--bg-card)]" title="Archive" onClick={() => void archive(email.id)}>
                                  <IconArchive className="h-4 w-4" />
                                </button>
                                <button type="button" className="rounded p-1.5 hover:bg-[var(--bg-card)]" title="Delete" onClick={() => void trash(email.id)}>
                                  <IconTrash className="h-4 w-4" />
                                </button>
                                <button type="button" className="rounded p-1.5 hover:bg-[var(--bg-card)]" title="Snooze" onClick={e => e.stopPropagation()}>
                                  <IconClock className="h-4 w-4" />
                                </button>
                                <button type="button" className="rounded p-1.5 hover:bg-[var(--bg-card)]" title={email.unread ? 'Mark read' : 'Mark unread'} onClick={() => void toggleRead(email.id, email.unread)}>
                                  <IconMailOpened className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="inline-block pt-0.5 tabular-nums">{formatListDate(email.date)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {!loading && emails.length > 0 && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  <span className="tabular-nums">{paginationText}</span>
                  <button type="button" disabled className="rounded p-1 opacity-40" title="Newer (use refresh)">
                    <IconChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!nextPageToken}
                    className="rounded p-1 hover:bg-[var(--bg-hover)] disabled:opacity-30"
                    title="Older"
                    onClick={() => {
                      if (!nextPageToken) return;
                      setPageStart(s => s + emails.length);
                      void load({ resetPage: false, token: nextPageToken });
                    }}
                  >
                    <IconChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {selected && (
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
                <div className="border-b border-[var(--bg-border)] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-[var(--text-primary)]">{selected.subject}</h2>
                    <button type="button" onClick={() => setSelected(null)} className="shrink-0 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                      <IconX className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[var(--text-muted)]">
                      From <span className="text-[var(--text-primary)]">{selected.from}</span> · {formatListDate(selected.date)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <button type="button" onClick={reply} className="flex items-center gap-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                        <IconArrowBackUp className="h-3.5 w-3.5" /> Reply
                      </button>
                      <button type="button" onClick={() => void archive(selected.id)} className="flex items-center gap-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                        <IconArchive className="h-3.5 w-3.5" /> Archive
                      </button>
                      <button type="button" onClick={() => void trash(selected.id)} className="flex items-center gap-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-red-500 hover:bg-[var(--bg-hover)]">
                        <IconTrash className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {bodyLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <IconLoader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-primary)]">{selected.body || selected.snippet}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">New message</p>
              <button type="button" onClick={() => setShowCompose(false)} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <input
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
              placeholder="To"
              className="w-full border-b border-[var(--bg-border)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <input
              value={composeSub}
              onChange={e => setComposeSub(e.target.value)}
              placeholder="Subject"
              className="w-full border-b border-[var(--bg-border)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <textarea
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              placeholder="Write your message…"
              rows={8}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <div className="flex items-center justify-between border-t border-[var(--bg-border)] px-4 py-3">
              <button type="button" onClick={() => setShowCompose(false)} className="text-xs text-[var(--text-muted)] hover:text-red-500">
                Discard
              </button>
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !composeTo || !composeSub || !composeBody}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {sending ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconSend className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
