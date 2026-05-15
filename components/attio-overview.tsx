'use client';

import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconChevronLeft, IconChevronRight, IconDotsVertical, IconArrowUpRight, IconCalendar, IconTrendingUp, IconTrendingDown, IconMessageCircle, IconLayoutList, IconFileText, IconCreditCard, IconCoin, IconAlertCircle } from '@tabler/icons-react';
import { LogoAnthropicClaude, LogoGoogleGemini, LogoOpenAI } from '@/components/provider-brand-icons';

// ─── Helper ─────────────────────────────────────────────────────────────────────
interface Task { id: string; title: string; dueDate: string | null; completed: boolean; }
interface Note { id: string; title: string; content: string; updatedAt: string; }

function loadTasks(): Task[] { try { return JSON.parse(localStorage.getItem('quivo_tasks') ?? '[]'); } catch { return []; } }
function loadNotes(): Note[] { try { return JSON.parse(localStorage.getItem('quivo_attio_notes') ?? '[]'); } catch { return []; } }
function loadChats(): { id: string; title: string; updatedAt: string; messages?: unknown[] }[] {
  try { return JSON.parse(localStorage.getItem('quivo_chat_sessions') ?? '[]'); } catch { return []; }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDue(iso: string | null) {
  if (!iso) return { label: 'No date', color: 'text-[var(--text-muted)]' };
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: 'Overdue', color: 'text-[#ef4444]' };
  if (diff === 0) return { label: 'Today', color: 'text-[#f59e0b]' };
  if (diff === 1) return { label: 'Tomorrow', color: 'text-[var(--text-secondary)]' };
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-[var(--text-secondary)]' };
}

// ─── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, trend, trendDir }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; trend?: string; trendDir?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="quivo-finance-card flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="quivo-label">{label}</span>
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${trendDir === 'up' ? 'quivo-finance-up' : trendDir === 'down' ? 'quivo-finance-down' : 'text-[var(--text-muted)]'}`}>
            {trendDir === 'up' ? <IconTrendingUp className="h-3 w-3" /> : trendDir === 'down' ? <IconTrendingDown className="h-3 w-3" /> : null}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="quivo-data-lg">{value}</p>
        {sub && <p className="quivo-caption mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Meetings section ──────────────────────────────────────────────────────────
function MeetingsSection() {
  const today = new Date();
  const [date, setDate] = useState(today);

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isToday = date.toDateString() === today.toDateString();

  return (
    <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-2.5">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Meetings</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[var(--text-secondary)]">{isToday ? 'Today' : ''}, {fmt(date).split(',')[1]?.trim()}</span>
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }}
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"><IconChevronLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }}
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"><IconChevronRight className="h-3.5 w-3.5" /></button>
          <button className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"><IconDotsVertical className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-8 px-4 gap-2 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-hover)]">
          <IconCalendar className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
        <p className="text-[12px] font-semibold text-[var(--text-primary)]">Turn meetings into opportunities</p>
        <p className="text-[11px] text-[var(--text-muted)] max-w-[240px]">Sync your calendar to get instant meeting context and CRM context before every call.</p>
        <button className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-hover)] px-4 py-2 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-border)] transition-all">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sync Google Calendar
        </button>
      </div>
    </div>
  );
}

// ─── Notification Cost section ────────────────────────────────────────────────
function NotificationCosts() {
  const costs = [
    { provider: 'Claude 3.5 Sonnet', tokens: '142,880', cost: '$0.43', icon: 'anthropic' as const },
    { provider: 'GPT-4o',            tokens: '89,340',  cost: '$0.27', icon: 'openai' as const },
    { provider: 'Gemini 1.5 Pro',    tokens: '210,000', cost: '$0.16', icon: 'gemini' as const },
    { provider: 'Web Search (Tavily)', tokens: '47 calls', cost: '$0.05', icon: '🔍' },
  ];
  const total = '$0.91';

  return (
    <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <IconAlertCircle className="h-3.5 w-3.5 text-[#f59e0b]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Notification Costs</span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">This month</span>
      </div>
      <div className="p-4 space-y-2">
        {costs.map(c => (
          <div key={c.provider} className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {c.icon === 'gemini' ? (
                <LogoGoogleGemini size={18} />
              ) : c.icon === 'openai' ? (
                <LogoOpenAI size={18} />
              ) : c.icon === 'anthropic' ? (
                <LogoAnthropicClaude size={18} />
              ) : (
                <span className="text-sm">{c.icon}</span>
              )}
            </span>
            <span className="flex-1 text-[12px] text-[var(--text-secondary)]">{c.provider}</span>
            <span className="text-[11px] text-[var(--text-muted)]">{c.tokens}</span>
            <span className="text-[12px] font-semibold text-[var(--text-primary)] w-12 text-right">{c.cost}</span>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t border-[var(--bg-border)] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Total</span>
          <span className="text-[14px] font-bold text-[var(--quivo-accent)]">{total}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AttioOverview({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [notes, setNotes]     = useState<Note[]>([]);
  const [chats, setChats]     = useState<ReturnType<typeof loadChats>>([]);
  const [input, setInput]     = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    setTasks(loadTasks());
    setNotes(loadNotes());
    setChats(loadChats());
    // Try to get name from localStorage or Clerk
    const saved = localStorage.getItem('quivo_user_name');
    if (saved) setUserName(saved);
  }, []);

  const pendingTasks = tasks.filter(t => !t.completed);
  const pendingCount = pendingTasks.length;
  const msgCount     = chats.reduce((acc, c) => acc + ((c.messages as unknown[])?.length ?? 0), 0);
  const totalTokens  = msgCount * 850; // estimate

  function formatTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return `${n}`;
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center border-b border-[var(--bg-border)] px-4 py-2.5 sticky top-0 bg-[var(--bg-base)] z-10">
        <svg className="h-4 w-4 mr-2 text-[var(--text-secondary)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M2 3h12M2 8h8M2 13h5" /></svg>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Home</span>
        <div className="ml-auto">
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all">Help</button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-[800px] mx-auto w-full">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] leading-tight">
            {greeting()}{userName ? `, ${userName}` : ''}.
          </h1>
        </div>

        {/* ── Metrics row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <MetricCard
            icon={<IconCoin className="h-4 w-4" />}
            label="API Spend"
            value="$0.91"
            sub="this month"
            trend="+12%"
            trendDir="up"
          />
          <MetricCard
            icon={<IconMessageCircle className="h-4 w-4" />}
            label="Messages"
            value={String(msgCount || 0)}
            sub={`~${formatTokens(totalTokens)} tokens`}
            trend={msgCount > 0 ? 'active' : ''}
            trendDir="neutral"
          />
          <MetricCard
            icon={<IconLayoutList className="h-4 w-4" />}
            label="Tasks"
            value={String(pendingCount)}
            sub={`${tasks.filter(t => t.completed).length} completed`}
            trend={pendingCount > 0 ? `${pendingCount} open` : ''}
            trendDir="neutral"
          />
          <MetricCard
            icon={<IconFileText className="h-4 w-4" />}
            label="Notes"
            value={String(notes.length)}
            sub="total notes"
          />
        </div>

        {/* ── Quick chat ─────────────────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] overflow-hidden">
          {chats.length > 0 && (
            <div className="flex items-center gap-1.5 border-b border-[var(--bg-border)] px-3.5 py-1.5">
              <svg className="h-3 w-3 text-[var(--text-muted)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="8" cy="8" r="6" /></svg>
              <span className="text-[10px] text-[var(--text-muted)]">Recent chat ·</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">{chats[0]?.title ?? 'Untitled chat'}</span>
            </div>
          )}
          <div className="p-3.5">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything..."
              rows={2}
              className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="text-[11px] text-[var(--text-muted)] rounded-md border border-[var(--bg-border)] px-2 py-1">Auto</span>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M8 5v6M5 8h6" /></svg>
              </button>
              <button onClick={() => onNavigate?.('chat')}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--quivo-accent)] text-white hover:opacity-90 transition-all">
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Meetings ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <MeetingsSection />
        </div>

        {/* ── Tasks ─────────────────────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">Tasks</span>
              {pendingCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--quivo-accent)]/20 text-[9px] font-bold text-[var(--quivo-accent)]">{pendingCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onNavigate?.('planner')} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1">
                View all <IconArrowUpRight className="h-3 w-3" />
              </button>
              <button onClick={() => onNavigate?.('planner')} className="flex items-center gap-1 rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                <IconPlus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[12px] text-[var(--text-muted)]">No pending tasks. Create one to get started.</p>
            </div>
          ) : (
            <div>
              {pendingTasks.slice(0, 5).map(t => {
                const due = formatDue(t.dueDate);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--bg-border)]/50 last:border-0 hover:bg-[var(--bg-hover)] transition-all">
                    <div className="h-4 w-4 shrink-0 rounded-[3px] border border-[var(--bg-border)]" />
                    <span className="flex-1 text-[13px] text-[var(--text-primary)]">{t.title}</span>
                    <span className={`text-[11px] font-medium ${due.color}`}>{due.label}</span>
                  </div>
                );
              })}
              {pendingTasks.length > 5 && (
                <button onClick={() => onNavigate?.('planner')} className="w-full py-2 text-center text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all">
                  +{pendingTasks.length - 5} more tasks
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Notes preview ─────────────────────────────────────────────── */}
        {notes.length > 0 && (
          <div className="mb-6 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-2.5">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">Recent Notes</span>
              <button onClick={() => onNavigate?.('planner')} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1">
                View all <IconArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div>
              {notes.slice(0, 3).map(n => (
                <div key={n.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--bg-border)]/50 last:border-0 hover:bg-[var(--bg-hover)] transition-all cursor-pointer" onClick={() => onNavigate?.('planner')}>
                  <div className="h-6 w-6 rounded shrink-0 border border-[var(--bg-border)] flex items-center justify-center bg-[var(--bg-hover)] text-xs">
                    {n.title[0]?.toUpperCase() ?? '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{n.title}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{n.content.slice(0, 50) || 'No content'}</p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                    {new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Notification Costs ────────────────────────────────────────── */}
        <div className="mb-6">
          <NotificationCosts />
        </div>
      </div>
    </div>
  );
}
