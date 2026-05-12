'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { IconShare, IconChartBar, IconCalendar, IconChartPie, IconDatabase, IconBrain } from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatSession {
  id: string; title: string; agentId?: string; model: string;
  messages: { role: string; content: string; timestamp: string }[];
  createdAt: string; updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadSessions(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem('finedge_chat_sessions') ?? '[]'); } catch { return []; }
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Generate last 365 days array
function buildCalendarDays() {
  const days: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: formatDate(d), count: 0 });
  }
  return days;
}

// Month labels for heatmap
function buildMonthLabels() {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const m = d.getMonth();
    const col = Math.floor((364 - i) / 7);
    if (m !== lastMonth) { labels.push({ label: d.toLocaleString('en-US', { month: 'short' }), col }); lastMonth = m; }
  }
  return labels;
}

// Color intensity
function heatColor(count: number): string {
  if (count === 0) return '#161b22';
  if (count <= 2)  return '#0e4429';
  if (count <= 5)  return '#006d32';
  if (count <= 10) return '#26a641';
  return '#39d353';
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, lastMonth }: { label: string; value: string | number; lastMonth: number }) {
  return (
    <div className="flex-1 min-w-0 px-6 py-4 first:pl-0 border-r border-[var(--bg-border)] last:border-0">
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value === 0 || value === '' ? '——' : value}</p>
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{lastMonth} Last Month</p>
    </div>
  );
}

// ─── Empty rank state ──────────────────────────────────────────────────────────
function NoData() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <svg className="mb-2 h-10 w-10 text-[var(--bg-border)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="8" width="20" height="12" rx="2" /><path d="M8 8V6a4 4 0 018 0v2" />
        <circle cx="12" cy="14" r="2" />
      </svg>
      <p className="text-xs font-semibold text-[var(--text-muted)]">No Data</p>
      <p className="text-[10px] text-[var(--text-muted)]">Please accumulate more chat data to view</p>
    </div>
  );
}

// ─── Usage chart ───────────────────────────────────────────────────────────────
function UsageChart({ data }: { data: { date: string; value: number }[] }) {
  if (!data.length || data.every(d => d.value === 0)) {
    return (
      <div className="flex h-24 items-center justify-center">
        <p className="text-xs text-[var(--text-muted)]">No usage data yet</p>
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100 / data.length;
  const pts = data.map((d, i) => `${i * w + w / 2},${100 - (d.value / max) * 90}`).join(' ');

  return (
    <div className="relative h-24">
      <svg className="h-full w-full" viewBox={`0 0 100 100`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26a641" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#26a641" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="#26a641" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <polygon points={`0,100 ${pts} 100,100`} fill="url(#chartGrad)" />
      </svg>
      {/* X-axis labels */}
      <div className="mt-1 flex justify-between px-0">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map(d => (
          <span key={d.date} className="text-[9px] text-[var(--text-muted)]">{d.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#94a3b8' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-border)]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Usage row ─────────────────────────────────────────────────────────────────
function UsageRow({ icon, label, desc, used, max, unit, resetIn, color }: {
  icon: React.ReactNode; label: string; desc: string; used: number; max: number; unit: string; resetIn?: string; color?: string;
}) {
  return (
    <div className="border-b border-[var(--bg-border)] px-5 py-4 last:border-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] text-[var(--text-muted)]">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{desc}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[var(--text-primary)]">{used.toLocaleString()} / {max.toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">{unit}</span></p>
          {resetIn && <p className="text-[10px] text-[var(--text-muted)]">{resetIn}</p>}
        </div>
      </div>
      <ProgressBar value={used} max={max} color={color ?? '#94a3b8'} />
    </div>
  );
}

// ─── Main Analytics Panel ──────────────────────────────────────────────────────
export default function AnalyticsPanel() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeTab, setActiveTab] = useState<'statistics' | 'usage'>('statistics');
  const [usageTab, setUsageTab] = useState<'model' | 'provider'>('model');
  const [usageMonth, setUsageMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [copied, setCopied] = useState(false);

  useEffect(() => { setSessions(loadSessions()); }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allMsgs = sessions.flatMap(s => s.messages ?? []);
    const userMsgs = allMsgs.filter(m => m.role === 'user');
    const totalWords = userMsgs.reduce((sum, m) => sum + countWords(m.content), 0);
    const agentIds = new Set(sessions.filter(s => s.agentId).map(s => s.agentId));

    // Last month comparison
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    const lastMonthSessions = sessions.filter(s => s.createdAt >= lastMonthStart && s.createdAt <= lastMonthEnd);
    const lastMonthMsgs = lastMonthSessions.flatMap(s => s.messages ?? []).filter(m => m.role === 'user');

    return {
      agents: agentIds.size,
      topics: sessions.length,
      messages: userMsgs.length,
      words: totalWords,
      lastMonthTopics: lastMonthSessions.length,
      lastMonthMessages: lastMonthMsgs.length,
      lastMonthWords: lastMonthMsgs.reduce((s, m) => s + countWords(m.content), 0),
      registeredAt: user?.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      dayCount: user?.createdAt ? Math.max(1, daysAgo(new Date(user.createdAt).toISOString())) : 1,
    };
  }, [sessions, user]);

  // ── Heatmap data ───────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const days = buildCalendarDays();
    const countByDate: Record<string, number> = {};
    sessions.forEach(s => {
      const date = s.updatedAt?.slice(0, 10) ?? s.createdAt?.slice(0, 10);
      if (date) countByDate[date] = (countByDate[date] ?? 0) + (s.messages?.filter(m => m.role === 'user').length ?? 1);
    });
    return days.map(d => ({ ...d, count: countByDate[d.date] ?? 0 }));
  }, [sessions]);

  const totalInYear = calendarDays.reduce((s, d) => s + d.count, 0);
  const monthLabels = useMemo(() => buildMonthLabels(), []);

  // Heatmap: group into columns of 7 (weeks)
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // ── Model usage rank ────────────────────────────────────────────────────────
  const modelRank = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      const m = s.model ?? 'claude-sonnet-4-5';
      counts[m] = (counts[m] ?? 0) + (s.messages?.filter(x => x.role === 'user').length ?? 0);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sessions]);

  // ── Agent usage rank ────────────────────────────────────────────────────────
  const agentRank = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.filter(s => s.agentId).forEach(s => {
      counts[s.agentId!] = (counts[s.agentId!] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sessions]);

  // ── Topic rank ─────────────────────────────────────────────────────────────
  const topicRank = useMemo(() => {
    return sessions.slice(0, 5).map(s => ({
      title: s.title?.slice(0, 40) ?? 'Untitled',
      count: s.messages?.filter(m => m.role === 'user').length ?? 0,
    })).sort((a, b) => b.count - a.count);
  }, [sessions]);

  // ── Usage chart data for selected month ────────────────────────────────────
  const usageChartData = useMemo(() => {
    const [yr, mo] = usageMonth.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      date: `${usageMonth}-${String(i + 1).padStart(2, '0')}`,
      value: 0,
    }));
    sessions.forEach(s => {
      const d = (s.updatedAt ?? s.createdAt ?? '').slice(0, 10);
      const idx = data.findIndex(x => x.date === d);
      if (idx >= 0) data[idx].value += s.messages?.filter(m => m.role === 'user').length ?? 0;
    });
    return data;
  }, [sessions, usageMonth]);

  const todayMessages = useMemo(() => {
    const today = formatDate(new Date());
    return sessions.flatMap(s => s.messages ?? []).filter(m => m.role === 'user' && (m.timestamp ?? '').slice(0, 10) === today).length;
  }, [sessions]);

  const thisMonthMessages = useMemo(() => {
    return usageChartData.reduce((sum, d) => sum + d.value, 0);
  }, [usageChartData]);

  const activeModels = useMemo(() => {
    const [yr, mo] = usageMonth.split('-').map(Number);
    const start = `${usageMonth}-01`;
    const end = `${yr}-${String(mo).padStart(2, '0')}-${new Date(yr, mo, 0).getDate()}`;
    const models = new Set(sessions.filter(s => {
      const d = (s.updatedAt ?? s.createdAt ?? '').slice(0, 10);
      return d >= start && d <= end;
    }).map(s => s.model));
    return models.size;
  }, [sessions, usageMonth]);

  function share() {
    const text = `I've sent ${stats.messages} messages and used ${stats.agents} AI agents on Finedge! 🚀`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const MODEL_LABELS: Record<string, string> = {
    'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'gemini': 'Gemini 1.5 Pro',
    'gpt-4o': 'GPT-4o',
  };

  // KB file size estimate
  const kbSizeKB = useMemo(() => {
    try {
      const docs = JSON.parse(localStorage.getItem('finedge_kb_docs') ?? '[]') as { content?: string }[];
      const chars = docs.reduce((s, d) => s + (d.content?.length ?? 0), 0);
      return Math.round(chars / 1024);
    } catch { return 0; }
  }, []);

  const agentCount = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem('finedge_user_agents') ?? '[]') as unknown[]).length; }
    catch { return 0; }
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-base)]">
      <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">

        {/* ── Header + Tab bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconChartBar className="h-5 w-5 text-[var(--text-primary)]" />
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Analytics</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex w-fit gap-1 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-1">
          {([
            { id: 'statistics', label: 'Statistics', icon: <IconChartPie className="h-3.5 w-3.5" /> },
            { id: 'usage',      label: 'Usage',      icon: <IconDatabase   className="h-3.5 w-3.5" /> },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] ring-1 ring-white/10'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ━━━━━━━━━━━━━━━ STATISTICS TAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'statistics' && (<>

        {/* ── Summary card ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">

          {/* Welcome row */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bg-border)]">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {user?.fullName ?? user?.firstName ?? 'Welcome'}, this is your{' '}
                <span className="font-bold text-[var(--text-primary)]">{stats.dayCount}
                  <sup className="text-[10px]">{stats.dayCount === 1 ? 'st' : stats.dayCount === 2 ? 'nd' : stats.dayCount === 3 ? 'rd' : 'th'}</sup>
                </span> day with Finedge
              </p>
              <div className="mt-0.5 flex items-center gap-4">
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <IconCalendar className="h-3 w-3" /> Registered: {stats.registeredAt}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Updated at: {formatDate(new Date())}</span>
              </div>
            </div>
            <button onClick={share}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              title="Copy stats">
              {copied ? (
                <svg className="h-4 w-4 text-[#26a641]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l4 4L19 7" /></svg>
              ) : <IconShare className="h-4 w-4" />}
            </button>
          </div>

          {/* Stats grid */}
          <div className="flex">
            <StatCard label="Agents" value={stats.agents} lastMonth={0} />
            <StatCard label="Topics" value={stats.topics} lastMonth={stats.lastMonthTopics} />
            <StatCard label="Messages" value={stats.messages} lastMonth={stats.lastMonthMessages} />
            <StatCard label="Total Words" value={stats.words > 0 ? stats.words.toLocaleString() : 0} lastMonth={stats.lastMonthWords} />
          </div>
        </motion.div>

        {/* ── Activity Heatmap ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Activity in the past year</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-muted)]">— days</span>
              <span className="flex items-center gap-1 rounded-full bg-[#26a641]/10 border border-[#26a641]/20 px-2 py-0.5 text-[10px] text-[#26a641]">
                🌱 — days
              </span>
            </div>
          </div>

          {/* Month labels */}
          <div className="relative mb-1" style={{ paddingLeft: 20 }}>
            <div className="flex">
              {monthLabels.map((ml, i) => (
                <div key={i} className="text-[9px] text-[var(--text-muted)]"
                  style={{ position: 'absolute', left: ml.col * 13 + 20 }}>{ml.label}</div>
              ))}
            </div>
            <div style={{ height: 14 }} />
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-[3px]" style={{ paddingLeft: 20 }}>
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <div key={i} className="h-[10px] text-[8px] leading-[10px] text-[var(--text-muted)]">{d}</div>
              ))}
            </div>
            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div key={di} title={`${day.date}: ${day.count} messages`}
                    className="h-[10px] w-[10px] rounded-[2px] cursor-default transition-all hover:ring-1 hover:ring-white/20"
                    style={{ backgroundColor: heatColor(day.count) }}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-[var(--text-muted)]">A total of {totalInYear} messages sent in the past year</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--text-muted)]">Inactive</span>
              {['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'].map(c => (
                <div key={c} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: c }} />
              ))}
              <span className="text-[10px] text-[var(--text-muted)]">Active</span>
            </div>
          </div>
        </motion.div>

        {/* ── Rankings ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-4">

          {/* Model Usage Rank */}
          <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
            <div className="border-b border-[var(--bg-border)] px-4 py-3">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Model Usage Rank</h3>
            </div>
            {modelRank.length === 0 ? <NoData /> : (
              <div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--bg-border)]">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Model</span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Messages</span>
                </div>
                {modelRank.map(([model, count], i) => (
                  <div key={model} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--bg-border)]/50 last:border-0">
                    <span className="text-[11px] text-[var(--text-muted)] w-4">{i + 1}</span>
                    <span className="flex-1 text-xs text-[var(--text-primary)] truncate">{MODEL_LABELS[model] ?? model}</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent Usage Rank */}
          <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
            <div className="border-b border-[var(--bg-border)] px-4 py-3">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Agent Usage Rank</h3>
            </div>
            {agentRank.length === 0 ? <NoData /> : (
              <div>
                <div className="px-4 py-2 border-b border-[var(--bg-border)]">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Agent</span>
                </div>
                {agentRank.map(([agentId, count], i) => (
                  <div key={agentId} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--bg-border)]/50 last:border-0">
                    <span className="text-[11px] text-[var(--text-muted)] w-4">{i + 1}</span>
                    <span className="flex-1 text-xs text-[var(--text-primary)] truncate">{agentId.replace('pre_', '').replace(/_/g, ' ')}</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Topic Content Rank */}
          <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
            <div className="border-b border-[var(--bg-border)] px-4 py-3">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Topic Content Rank</h3>
            </div>
            {topicRank.length === 0 ? <NoData /> : (
              <div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--bg-border)]">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] flex-1">Topic</span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">Msgs</span>
                </div>
                {topicRank.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--bg-border)]/50 last:border-0">
                    <span className="text-[11px] text-[var(--text-muted)] w-4">{i + 1}</span>
                    <span className="flex-1 text-xs text-[var(--text-primary)] truncate">{t.title}</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Usage ────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">

          {/* Usage header */}
          <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Usage</h3>
            <div className="flex items-center gap-2">
              <input type="month" value={usageMonth} onChange={e => setUsageMonth(e.target.value)}
                className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#26a641]/40 focus:outline-none" />
              <div className="flex items-center gap-0.5 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-0.5">
                {(['model', 'provider'] as const).map(t => (
                  <button key={t} onClick={() => setUsageTab(t)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${usageTab === t ? 'bg-[#1e2836] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                    {t === 'model' ? '⚡ Model' : '🔌 Provider'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Usage stats */}
          <div className="grid grid-cols-3 border-b border-[var(--bg-border)]">
            <div className="px-6 py-5 border-r border-[var(--bg-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Today's Activity</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{todayMessages} <span className="text-base font-normal text-[var(--text-muted)]">msgs</span></p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">0 Yesterday</p>
            </div>
            <div className="px-6 py-5 border-r border-[var(--bg-border)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">This Month's Activity</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{thisMonthMessages} <span className="text-base font-normal text-[var(--text-muted)]">msgs</span></p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{stats.topics} Sessions</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs text-[var(--text-muted)] mb-1">Active Models</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{activeModels}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{activeModels > 0 ? 'models used this month' : 'No models used yet'}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="px-6 pt-4 pb-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)]">Messages per day — {usageMonth}</p>
              <div className="flex items-center gap-1 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-0.5">
                <button className="rounded-md bg-[#1e2836] px-3 py-1 text-[11px] font-semibold text-[var(--text-primary)]">Messages</button>
                <button className="rounded-md px-3 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Words</button>
              </div>
            </div>
            <UsageChart data={usageChartData} />

            {/* X-axis dates */}
            <div className="mt-2 flex justify-between px-0">
              {usageChartData.filter((_, i) => i % Math.ceil(usageChartData.length / 8) === 0).map(d => (
                <span key={d.date} className="text-[9px] text-[var(--text-muted)]">{d.date}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Platform Overview ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Platform Overview</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'API Cost to You', value: '$0.00', sub: 'Finedge charges nothing', icon: '💰', green: true },
              { label: 'Chat Sessions', value: stats.topics.toLocaleString(), sub: 'All time', icon: '💬', green: false },
              { label: 'AI Agents Used', value: stats.agents.toLocaleString(), sub: 'Unique agents', icon: '🤖', green: false },
              { label: 'Words Processed', value: stats.words > 1000 ? `${(stats.words / 1000).toFixed(1)}k` : stats.words.toString(), sub: 'By you this session', icon: '📝', green: false },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] p-4">
                <p className="text-lg mb-1">{s.icon}</p>
                <p className={`text-xl font-bold ${s.green ? 'text-[#26a641]' : 'text-[var(--text-primary)]'}`}>{s.value}</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{s.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{s.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
        </>)}

        {/* ━━━━━━━━━━━━━━━ USAGE TAB ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'usage' && (<>

          {/* ── Computing credits usage details table ─────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Computing Credits Usage Details</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Details of computing credits usage for text generation, embedding, image generation, etc.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="month" value={usageMonth} onChange={e => setUsageMonth(e.target.value)}
                  className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#3b82f6]/40 focus:outline-none" />
                <div className="flex items-center gap-0.5 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-0.5">
                  {(['model', 'provider'] as const).map(t => (
                    <button key={t} onClick={() => setUsageTab(t)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${usageTab === t ? 'bg-[#1e2836] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                      {t === 'model' ? '⚡ Model' : '🔌 Provider'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-7 border-b border-[var(--bg-border)] px-5 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
              <span className="col-span-2">Created At</span>
              <span>Type</span>
              <span>Model</span>
              <span>Messages</span>
              <span>Words</span>
              <span>Duration</span>
            </div>

            {/* Table rows — sessions for selected month */}
            {(() => {
              const rows = sessions.filter(s => (s.updatedAt ?? s.createdAt ?? '').startsWith(usageMonth));
              if (rows.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12">
                    <IconDatabase className="h-10 w-10 text-[var(--bg-border)] mb-2" />
                    <p className="text-xs text-[var(--text-muted)]">暂无数据 / No data for {usageMonth}</p>
                  </div>
                );
              }
              return rows.slice(0, 8).map(s => {
                const msgs = s.messages?.filter(m => m.role === 'user') ?? [];
                const words = msgs.reduce((sum, m) => sum + countWords(m.content), 0);
                const created = new Date(s.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={s.id} className="grid grid-cols-7 border-b border-[var(--bg-border)]/50 px-5 py-3 text-xs hover:bg-[var(--bg-hover)] transition-all last:border-0">
                    <span className="col-span-2 text-[var(--text-muted)]">{created}</span>
                    <span className="text-[#94a3b8]">Text</span>
                    <span className="text-[var(--text-primary)] truncate pr-2">{s.model?.replace('claude-', 'Claude ').replace('-4-5', ' 4.5').replace('-4', ' 4') ?? 'Claude'}</span>
                    <span className="text-[var(--text-primary)]">{msgs.length}</span>
                    <span className="text-[var(--text-primary)]">{words}</span>
                    <span className="text-[var(--text-muted)]">—</span>
                  </div>
                );
              });
            })()}
          </motion.div>

          {/* ── This Month Usage ─────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">This Month Usage</h3>

            <div className="space-y-3">
              {/* Computing Credits */}
              <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--bg-border)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Computing Credits Usage</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Credits usage for AI chat, image generation, speech synthesis</p>
                  </div>
                  <IconChartPie className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
                <UsageRow
                  icon={<span className="text-xs">⚡</span>}
                  label="Chat Messages"
                  desc={`Free credits — resets in ${30 - new Date().getDate()} days`}
                  used={stats.messages}
                  max={500000}
                  unit="Used"
                  resetIn={`Quota resets in ${30 - new Date().getDate()} days`}
                  color="#26a641"
                />
                <UsageRow
                  icon={<span className="text-xs">🔍</span>}
                  label="Web Searches (Tavily)"
                  desc="Real-time web search queries"
                  used={Math.min(stats.messages * 2, 1000)}
                  max={1000}
                  unit="/ mo"
                  color="#3b82f6"
                />
              </div>

              {/* File / KB Usage */}
              <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--bg-border)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">File Usage</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Data storage can be released by manual cleanup</p>
                  </div>
                  <IconDatabase className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
                <UsageRow
                  icon={<span className="text-xs">📂</span>}
                  label="Knowledge Base"
                  desc="Documents stored for RAG context"
                  used={kbSizeKB}
                  max={10240}
                  unit="KB"
                  color="#f59e0b"
                />
                <UsageRow
                  icon={<span className="text-xs">💬</span>}
                  label="Chat History"
                  desc="Stored chat sessions (localStorage)"
                  used={Math.round(JSON.stringify(sessions).length / 1024)}
                  max={5120}
                  unit="KB"
                  color="#a855f7"
                />
              </div>

              {/* Agent Usage */}
              <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--bg-border)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Agent Usage</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Custom and prebuilt AI agents created</p>
                  </div>
                  <IconBrain className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
                <UsageRow
                  icon={<span className="text-xs">🤖</span>}
                  label="Custom Agents"
                  desc="Agents you created"
                  used={agentCount}
                  max={50}
                  unit="agents"
                  color="#ec4899"
                />
                <UsageRow
                  icon={<span className="text-xs">💬</span>}
                  label="Agent Sessions"
                  desc="Sessions that used an agent"
                  used={sessions.filter(s => s.agentId).length}
                  max={stats.topics || 1}
                  unit="sessions"
                  color="#06b6d4"
                />
              </div>

              {/* Daily activity chart */}
              <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-5 py-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Daily Activity — {usageMonth}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-[var(--text-muted)]">Today: <strong className="text-[var(--text-primary)]">{todayMessages} msgs</strong></span>
                    <span className="text-[var(--text-muted)]">Month: <strong className="text-[var(--text-primary)]">{thisMonthMessages} msgs</strong></span>
                    <span className="text-[var(--text-muted)]">Models: <strong className="text-[var(--text-primary)]">{activeModels}</strong></span>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <UsageChart data={usageChartData} />
                </div>
              </div>

            </div>
          </motion.div>
        </>)}

      </div>
    </div>
  );
}
