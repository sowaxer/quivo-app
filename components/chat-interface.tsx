'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconSend, IconLoader2, IconRobot,
  IconCopy, IconCheck, IconTrash, IconSearch, IconDatabase,
  IconX, IconKey, IconMessageCircle, IconArrowRight,
  IconPaperclip, IconMicrophone, IconDots, IconPlus, IconWorld,
  IconFile, IconCode, IconBrain, IconEdit,
  IconSchool, IconChartLine, IconBrandGoogleDrive, IconMail, IconChevronDown,
} from '@tabler/icons-react';
import { LogoGoogleGemini, LogoAnthropicClaude, LogoDeepseek } from '@/components/provider-brand-icons';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ToolCall { name: string; status: 'running' | 'done'; }
interface Message {
  id: string; role: 'user' | 'assistant'; content: string;
  model?: 'claude' | 'gemini' | 'deepseek'; timestamp: Date;
  streaming?: boolean; toolCalls?: ToolCall[];
}
interface ChatSession {
  id: string; title: string; agentId?: string; model: string;
  messages: Message[]; createdAt: string; updatedAt: string;
}
interface Agent {
  id: string; name: string; avatar: string; description: string;
  systemInstruction: string; model: string; category: string;
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const LS_SESSIONS = 'quivo_chat_sessions';
const LS_AGENTS   = 'quivo_user_agents';
const LS_PENDING_AGENT = 'quivo_pending_agent';

function loadSessions(): ChatSession[] { try { return JSON.parse(localStorage.getItem(LS_SESSIONS) ?? '[]'); } catch { return []; } }
function saveSessions(s: ChatSession[]) { try { localStorage.setItem(LS_SESSIONS, JSON.stringify(s.slice(0, 100))); } catch { /* quota */ } }
function loadUserAgents(): Agent[] { try { return JSON.parse(localStorage.getItem(LS_AGENTS) ?? '[]'); } catch { return []; } }
function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function titleFromMsg(msg: string) { return msg.slice(0, 52).replace(/\n/g, ' ') + (msg.length > 52 ? '…' : ''); }

// ─── Prebuilt agents (same as agents-panel) ───────────────────────────────────
const PREBUILT_AGENTS: Agent[] = [
  { id:'pre_tax',name:'Tax Advisor',avatar:'🧾',category:'Tax & IRS',model:'claude-sonnet-4-5',description:'IRS compliance, tax planning, deductions.',systemInstruction:`You are a senior U.S. tax advisor specializing in IRS compliance, business tax strategy, deductions, and filing for LLCs, S-Corps, and sole proprietors. Today: ${new Date().toLocaleDateString()}. Always cite relevant IRS codes. Be precise with dollar amounts.`},
  { id:'pre_bookkeeper',name:'Bookkeeper AI',avatar:'📒',category:'Accounting',model:'claude-sonnet-4-5',description:'Journal entries, reconciliation, chart of accounts.',systemInstruction:'You are a professional bookkeeper with expertise in QuickBooks, Xero, and GAAP. Help with journal entries, bank reconciliation, chart of accounts, and financial statements.'},
  { id:'pre_analyst',name:'Financial Analyst',avatar:'📈',category:'Finance',model:'claude-sonnet-4-5',description:'DCF, cash flow, KPIs, forecasting.',systemInstruction:'You are a CFA-level financial analyst. Help with DCF, LBO, cash flow analysis, KPIs, ratios, and forecasting. Format numbers clearly with $ and %.'},
  { id:'pre_audit',name:'Audit Assistant',avatar:'🔍',category:'Audit',model:'claude-sonnet-4-5',description:'Internal audit, SOX, risk assessment.',systemInstruction:'You are an internal audit specialist. Help with audit planning, control testing, SOX compliance, risk matrices, and audit reports.'},
  { id:'pre_cfo',name:'Virtual CFO',avatar:'💼',category:'Finance',model:'claude-sonnet-4-5',description:'Strategic CFO advice, M&A, fundraising.',systemInstruction:'You are an experienced CFO advisor. Provide strategic guidance on cash management, M&A, fundraising, board presentations, and financial KPIs.'},
  { id:'pre_compliance',name:'Compliance Officer',avatar:'⚖️',category:'Compliance',model:'claude-sonnet-4-5',description:'SEC, AML/KYC, corporate governance.',systemInstruction:'You are a compliance officer with expertise in SEC, FINRA, AML/KYC. Help draft compliance policies and assess regulatory risk.'},
  { id:'pre_bankstmt',name:'Bank Statement Reader',avatar:'🏦',category:'Accounting',model:'claude-sonnet-4-5',description:'Parse bank statements, categorize transactions.',systemInstruction:'You are a financial analyst specializing in bank statement analysis. Identify income vs expenses, categories, unusual charges, and cash flow trends.'},
  { id:'pre_consultant',name:'Business Consultant',avatar:'🤝',category:'Consulting',model:'claude-sonnet-4-5',description:'Strategy, process optimization, growth.',systemInstruction:'You are a senior business consultant. Help with strategic planning, operational efficiency, client retention, and growth roadmaps.'},
];

const MODEL_CATALOG: {
  value: string;
  label: string;
  kind: 'claude' | 'gemini' | 'deepseek';
  /** Which vault key must exist to use this model */
  key: 'anthropic' | 'google_ai' | 'deepseek';
}[] = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', kind: 'claude', key: 'anthropic' },
  { value: 'gemini', label: 'Gemini 1.5 Pro', kind: 'gemini', key: 'google_ai' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat', kind: 'deepseek', key: 'deepseek' },
  { value: 'deepseek-reasoner', label: '🧠 DeepSeek R1', kind: 'deepseek', key: 'deepseek' },
];

function shortModelLabel(value: string) {
  const m = MODEL_CATALOG.find(x => x.value === value);
  if (!m) return 'Sonnet 4.5';
  if (m.kind === 'claude') return 'Sonnet 4.5';
  if (m.kind === 'gemini') return 'Gemini 1.5 Pro';
  if (m.value === 'deepseek-reasoner') return 'DeepSeek R1';
  return 'DeepSeek Chat';
}

/** Claude-style short greeting (e.g. "Evening, Alex") */
function getClaudeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function ClaudeWaveform({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 16" fill="currentColor" aria-hidden>
      <rect x="1" y="6" width="3" height="8" rx="1" />
      <rect x="6" y="2" width="3" height="12" rx="1" />
      <rect x="11" y="4" width="3" height="10" rx="1" />
      <rect x="16" y="8" width="3" height="6" rx="1" />
    </svg>
  );
}

const WELCOME_SHORTCUTS: { label: string; icon: typeof IconCode; prompt: string }[] = [
  { label: 'Code', icon: IconCode, prompt: 'Help me write a small script to categorize bank transactions from a CSV.' },
  { label: 'Learn', icon: IconSchool, prompt: 'Explain the difference between cash and accrual accounting with a simple example.' },
  { label: 'Strategize', icon: IconChartLine, prompt: 'I run an accounting firm—what should I prioritize this quarter to grow revenue?' },
  { label: 'From Drive', icon: IconBrandGoogleDrive, prompt: 'Outline a workflow to pull client documents from Google Drive and summarize them for tax prep.' },
  { label: 'From Gmail', icon: IconMail, prompt: 'Draft a concise checklist email to a client requesting missing tax documents.' },
];

// ─── Capabilities menu items ───────────────────────────────────────────────────
const CAPABILITIES = [
  { id: 'file',   label: 'File Search',      icon: <IconFile className="h-4 w-4" /> },
  { id: 'web',    label: 'Web Search',        icon: <IconWorld className="h-4 w-4" /> },
  { id: 'kb',     label: 'Knowledge Base',    icon: <IconDatabase className="h-4 w-4" /> },
  { id: 'agent',  label: 'Skills',            icon: <IconBrain className="h-4 w-4" /> },
  { id: 'code',   label: 'Code Interpreter',  icon: <IconCode className="h-4 w-4" /> },
];

// ─── Chat history sidebar item ────────────────────────────────────────────────
function SessionItem({ session, active, onClick, onDelete }: {
  session: ChatSession; active: boolean;
  onClick: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div onClick={onClick} className={`group relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all ${active ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
      <span className="flex-1 truncate">{session.title}</span>
      <button onClick={e => { e.stopPropagation(); setMenu(v => !v); }}
        className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] group-hover:flex">
        <IconDots className="h-3.5 w-3.5" />
      </button>
      {menu && (
        <div className="absolute right-2 top-7 z-20 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] shadow-xl">
          <button onClick={e => { e.stopPropagation(); onDelete(); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-[#ef4444] hover:bg-[var(--bg-hover)]">
            <IconTrash className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── API key banner ────────────────────────────────────────────────────────────
function ApiKeyBanner({ onSettings }: { onSettings: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group mx-auto mb-4 flex max-w-lg flex-col gap-3 rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] sm:flex-row sm:items-center"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-hover)] ring-1 ring-[var(--bg-border)]">
        <IconKey className="h-5 w-5 text-[var(--text-primary)] opacity-90" stroke={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Add your API key to start chatting</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          Quivo uses your key directly — you pay providers, we charge nothing for AI usage.
        </p>
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="flex shrink-0 items-center justify-center gap-1.5 quivo-btn-primary rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-[0.98]"
      >
        Add key <IconArrowRight className="h-3.5 w-3.5" stroke={2} />
      </button>
    </motion.div>
  );
}

// ─── Main Chat Interface ──────────────────────────────────────────────────────
interface Props {
  onGoToSettings?: () => void;
  onGoToAgents?: () => void;
  onGoToKB?: () => void;
}

export default function ChatInterface({ onGoToSettings, onGoToAgents, onGoToKB }: Props) {
  const { user } = useUser();
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const messagesEnd  = useRef<HTMLDivElement>(null);
  const abortRef     = useRef<AbortController | null>(null);

  const [sessions, setSessions]         = useState<ChatSession[]>([]);
  const [currentId, setCurrentId]       = useState<string | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState('');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [copiedId, setCopiedId]         = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [kbEnabled, setKbEnabled]       = useState(false);
  const [keyConn, setKeyConn] = useState({
    anthropic: false,
    google_ai: false,
    deepseek: false,
    openai: false,
  });
  const [showCapMenu, setShowCapMenu]   = useState(false);
  const [activeCapabilities, setActiveCapabilities] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const hasApiKey =
    keyConn.anthropic || keyConn.openai || keyConn.google_ai || keyConn.deepseek;

  // Check API key
  useEffect(() => {
    fetch('/api/user-keys', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setKeyConn({
          anthropic: !!d.has?.anthropic,
          google_ai: !!d.has?.google_ai,
          deepseek: !!d.has?.deepseek,
          openai: !!d.has?.openai,
        });
      })
      .catch(() =>
        setKeyConn({ anthropic: false, google_ai: false, deepseek: false, openai: false }),
      );
  }, []);

  // Load sessions + handle pending agent
  useEffect(() => {
    const stored = loadSessions();
    setSessions(stored);

    const pendingAgentId = localStorage.getItem(LS_PENDING_AGENT);
    if (pendingAgentId) {
      localStorage.removeItem(LS_PENDING_AGENT);
      const agent = [...PREBUILT_AGENTS, ...loadUserAgents()].find(a => a.id === pendingAgentId);
      if (agent) setSelectedAgent(agent);
    } else if (stored.length > 0) {
      const last = stored[0];
      setCurrentId(last.id);
      setMessages(last.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    }
  }, []);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const handler = (e: Event) => {
      setInput((e as CustomEvent<string>).detail);
      setTimeout(() => textareaRef.current?.focus(), 50);
    };
    window.addEventListener('quivo:use-prompt', handler);
    return () => window.removeEventListener('quivo:use-prompt', handler);
  }, []);

  function newChat() {
    setCurrentId(null);
    setMessages([]);
    setInput('');
  }

  function selectSession(s: ChatSession) {
    setCurrentId(s.id);
    setMessages(s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    const agent = [...PREBUILT_AGENTS, ...loadUserAgents()].find(a => a.id === s.agentId);
    setSelectedAgent(agent ?? null);
  }

  function deleteSession(id: string) {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated); saveSessions(updated);
    if (currentId === id) { if (updated.length > 0) selectSession(updated[0]); else { setCurrentId(null); setMessages([]); } }
  }

  function persistMessages(sessionId: string, msgs: Message[]) {
    setSessions(prev => {
      const updated = prev.map(s => s.id === sessionId
        ? { ...s, messages: msgs, updatedAt: new Date().toISOString(),
            title: msgs[0]?.content ? titleFromMsg(msgs[0].content) : s.title }
        : s);
      saveSessions(updated);
      return updated;
    });
  }

  function toggleCap(id: string) {
    setActiveCapabilities(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      if (id === 'kb') setKbEnabled(!prev.has('kb'));
      return n;
    });
    setShowCapMenu(false);
  }

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    if (hasApiKey === false) { onGoToSettings?.(); return; }

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let sessionId = currentId;
    if (!sessionId) {
      const id = genId();
      const session: ChatSession = {
        id, title: titleFromMsg(content),
        agentId: selectedAgent?.id, model: selectedModel,
        messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setSessions(prev => { const u = [session, ...prev]; saveSessions(u); return u; });
      setCurrentId(id);
      sessionId = id;
    }

    const userMsg: Message    = { id: genId(), role: 'user', content, timestamp: new Date() };
    const assistantId = genId();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), streaming: true };
    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const body: Record<string, unknown> = { messages: apiMessages, model: selectedModel };
      if (selectedAgent?.systemInstruction) body.agentInstruction = selectedAgent.systemInstruction;

      const res = await fetch('/api/chat', {
        method: 'POST', signal: ctrl.signal, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: err.error ?? 'Error. Check your API key in Settings.', streaming: false } : m));
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';
      let detectedModel: 'claude' | 'gemini' | 'deepseek' = 'claude';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split('\n\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6).trim());
            if (evt.error) { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: evt.error, streaming: false } : m)); break; }
            if (evt.done) {
              setMessages(prev => { const u = prev.map(m => m.id === assistantId ? { ...m, streaming: false, model: detectedModel } : m); persistMessages(sessionId!, u); return u; });
            } else if (evt.text) {
              if (evt.model) detectedModel = evt.model as 'claude' | 'gemini' | 'deepseek';
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + evt.text, model: detectedModel } : m));
            } else if (evt.tool) {
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantId) return m;
                const ex = m.toolCalls ?? [];
                const idx = ex.findIndex(t => t.name === evt.tool);
                if (idx >= 0) { const u = [...ex]; u[idx] = { name: evt.tool, status: evt.status }; return { ...m, toolCalls: u }; }
                return { ...m, toolCalls: [...ex, { name: evt.tool, status: evt.status }] };
              }));
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: 'Connection error. Please try again.', streaming: false } : m));
      }
    } finally {
      setIsStreaming(false);
      setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
    }
  }, [input, messages, isStreaming, selectedModel, currentId, selectedAgent, hasApiKey, onGoToSettings]);

  const copyMsg = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const filteredSessions = sessions.filter(s => !sidebarSearch || s.title.toLowerCase().includes(sidebarSearch.toLowerCase()));
  const todaySessions     = filteredSessions.filter(s => new Date(s.updatedAt).toDateString() === today);
  const yesterdaySessions = filteredSessions.filter(s => new Date(s.updatedAt).toDateString() === yesterday);
  const olderSessions     = filteredSessions.filter(s => { const d = new Date(s.updatedAt).toDateString(); return d !== today && d !== yesterday; });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-base)]">

      {/* ── History sidebar ──────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside initial={{ width: 0 }} animate={{ width: 220 }} exit={{ width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex shrink-0 flex-col overflow-hidden border-r border-[var(--bg-border)] bg-[var(--bg-surface)]" style={{ width: 220 }}>
            <div className="space-y-2 p-2.5">
              <button onClick={newChat}
                className="flex w-full items-center gap-2 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--bg-border)] hover:bg-[var(--bg-hover)]">
                <IconEdit className="h-3.5 w-3.5" /> New Chat
              </button>
              <div className="relative">
                <IconSearch className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
                <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Search…"
                  className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-card)] py-1.5 pl-7 pr-2 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--bg-border)] focus:outline-none" />
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 && (
                <div className="py-8 text-center">
                  <IconMessageCircle className="mx-auto mb-1.5 h-5 w-5 text-[var(--text-muted)]" />
                  <p className="text-[10px] text-[var(--text-muted)]">No chats yet</p>
                </div>
              )}
              {todaySessions.length > 0 && (
                <div><p className="mb-0.5 px-3 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Today</p>
                  {todaySessions.map(s => <SessionItem key={s.id} session={s} active={s.id === currentId} onClick={() => selectSession(s)} onDelete={() => deleteSession(s.id)} />)}</div>
              )}
              {yesterdaySessions.length > 0 && (
                <div><p className="mb-0.5 px-3 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Yesterday</p>
                  {yesterdaySessions.map(s => <SessionItem key={s.id} session={s} active={s.id === currentId} onClick={() => selectSession(s)} onDelete={() => deleteSession(s.id)} />)}</div>
              )}
              {olderSessions.length > 0 && (
                <div><p className="mb-0.5 px-3 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Older</p>
                  {olderSessions.map(s => <SessionItem key={s.id} session={s} active={s.id === currentId} onClick={() => selectSession(s)} onDelete={() => deleteSession(s.id)} />)}</div>
              )}
            </div>

            <div className="space-y-0.5 border-t border-[var(--bg-border)] p-2">
              <button onClick={onGoToAgents} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"><IconRobot className="h-3.5 w-3.5" /> AI Agents</button>
              <button onClick={onGoToKB} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"><IconDatabase className="h-3.5 w-3.5" /> Knowledge Base</button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat area ───────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">

        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-2.5">
          <button onClick={() => setSidebarOpen(v => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Model selector */}
          <div className="flex items-center gap-1 rounded-full border border-[var(--bg-border)] bg-[var(--bg-card)] p-0.5 ring-1 ring-[var(--bg-border)]/60">
            {MODEL_CATALOG.map(m => {
              const connected = keyConn[m.key];
              return (
                <button
                  key={m.value}
                  type="button"
                  title={connected ? m.label : `Add ${m.key} key in Settings`}
                  disabled={!connected}
                  onClick={() => connected && setSelectedModel(m.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedModel === m.value
                      ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] ring-1 ring-[var(--bg-border)]'
                      : connected
                        ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        : 'cursor-not-allowed text-[var(--text-muted)] opacity-50'
                  }`}
                >
                  <span className="relative flex shrink-0">
                    {m.kind === 'gemini' ? (
                      <LogoGoogleGemini size={14} />
                    ) : m.kind === 'deepseek' ? (
                      <LogoDeepseek size={14} />
                    ) : (
                      <LogoAnthropicClaude size={14} />
                    )}
                    {connected && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-[var(--bg-border)] ${
                          m.kind === 'claude'
                            ? 'bg-orange-400'
                            : m.kind === 'gemini'
                              ? 'bg-[var(--text-muted)]'
                              : 'bg-blue-500'
                        }`}
                      />
                    )}
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Agent badge */}
          {selectedAgent && (
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-1.5">
              <span className="text-sm">{selectedAgent.avatar}</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">{selectedAgent.name}</span>
              <button onClick={() => setSelectedAgent(null)} className="ml-1 text-[var(--text-muted)] hover:text-[#ef4444]">
                <IconX className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Active capabilities */}
          {activeCapabilities.size > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {Array.from(activeCapabilities).map(cap => {
                const c = CAPABILITIES.find(x => x.id === cap);
                return c ? (
                  <span key={cap} className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-[#22c55e]/25 dark:bg-[#14532d]/30 dark:text-[#86efac]">
                    {c.label}
                    <button type="button" onClick={() => toggleCap(cap)}><IconX className="h-2.5 w-2.5" /></button>
                  </span>
                ) : null;
              })}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={newChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" title="New chat">
              <IconEdit className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-base)]">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col bg-[var(--bg-base)]">
              {hasApiKey === false && (
                <div className="mx-auto w-full max-w-lg px-4 pt-8">
                  <ApiKeyBanner onSettings={() => onGoToSettings?.()} />
                </div>
              )}
              <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-center px-4 pb-6 pt-6 md:pt-10">
                <div className="mb-4 flex flex-col items-center gap-3 text-center">
                  {selectedAgent ? (
                    <span className="text-4xl leading-none">{selectedAgent.avatar}</span>
                  ) : (
                    <div
                      className="h-1 w-16 rounded-full bg-[var(--text-muted)] opacity-90"
                      aria-hidden
                    />
                  )}
                  <h1 className="font-serif text-[clamp(1.65rem,4.2vw,2.4rem)] font-normal tracking-tight text-[var(--text-primary)]">
                    {getClaudeGreeting()}, {user?.firstName?.trim() || 'there'}
                  </h1>
                </div>
                {selectedAgent ? (
                  <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-[var(--text-secondary)]">{selectedAgent.description}</p>
                ) : (
                  <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-[var(--text-secondary)]">
                    Financial, tax, and operations help — powered by your own API keys.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto min-h-full max-w-[720px] space-y-8 px-4 py-8">
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`group flex w-full gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                    {msg.role === 'assistant' && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-sm">
                        {selectedAgent?.avatar ??
                          (msg.model === 'gemini' ? (
                            <LogoGoogleGemini size={16} className="rounded-full" />
                          ) : msg.model === 'deepseek' ? (
                            <LogoDeepseek size={16} />
                          ) : (
                            <LogoAnthropicClaude size={16} className="rounded-full" />
                          ))}
                      </div>
                    )}

                    <div className={`min-w-0 space-y-1.5 ${msg.role === 'user' ? 'max-w-[min(100%,36rem)]' : 'max-w-[min(100%,42rem)] flex-1'}`}>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.toolCalls.map((tc, i) => {
                            const labels: Record<string, string> = { query_stripe:'Stripe', query_gmail:'Gmail', query_calendar:'Calendar', web_search:'Web', query_notes:'Notes' };
                            const icons: Record<string, string> = { query_stripe:'💳', query_gmail:'📧', query_calendar:'📅', web_search:'🔍', query_notes:'📝' };
                            return (
                              <span key={i} className="flex items-center gap-1 rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                {icons[tc.name] ?? '🔧'} {labels[tc.name] ?? tc.name}
                                {tc.status === 'running' ? <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" /> : ' ✓'}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {msg.role === 'assistant' ? (
                        <div className="text-[var(--text-secondary)]">
                          {msg.model && !msg.streaming && (
                            <p className="mb-2 font-sans text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                              {selectedAgent
                                ? `${selectedAgent.avatar} ${selectedAgent.name}`
                                : msg.model === 'claude'
                                  ? 'Claude Sonnet 4.5'
                                  : msg.model === 'gemini'
                                    ? 'Gemini 1.5 Pro'
                                    : msg.model === 'deepseek'
                                      ? 'DeepSeek'
                                      : 'AI'}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.65] tracking-[-0.01em] text-[var(--text-primary)]">
                            {msg.content || (msg.streaming ? '' : '…')}
                            {msg.streaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current opacity-70" />}
                          </p>
                          <p className="mt-3 font-sans text-[10px] text-[var(--text-muted)]">
                            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl rounded-br-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-primary)]">
                          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {msg.content || (msg.streaming ? '' : '…')}
                            {msg.streaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current opacity-70" />}
                          </p>
                          <p className="mt-2 font-sans text-[10px] text-[var(--text-muted)]">
                            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}

                      {msg.role === 'assistant' && !msg.streaming && (
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button type="button" onClick={() => copyMsg(msg.id, msg.content)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                            {copiedId === msg.id ? <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-[#22c55e]" /> : <IconCopy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEnd} />
            </div>
          )}
        </div>

        {/* ── Input area (Claude-style pill composer) ───────────────────── */}
        <div className="shrink-0 border-t border-[var(--bg-border)] bg-[var(--bg-base)] px-4 pb-5 pt-3">
          <div className="mx-auto max-w-[720px]">
            <div className="relative rounded-[26px] border border-[var(--bg-border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors focus-within:border-[var(--text-muted)]/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <textarea ref={textareaRef} value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                placeholder={
                  messages.length === 0
                    ? 'How can I help you today?'
                    : selectedAgent
                      ? `Write a message to ${selectedAgent.name}…`
                      : 'Write a message…'
                }
                className="w-full resize-none rounded-t-[26px] bg-transparent px-5 pb-2 pt-4 pr-14 font-sans text-[15px] leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                rows={1} disabled={isStreaming} />

              <div className="flex items-center gap-0.5 px-2.5 pb-2.5 pt-0.5">
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" title="Add">
                  <IconPlus className="h-4 w-4" />
                </button>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" title="Attach file">
                  <IconPaperclip className="h-4 w-4" />
                </button>

                <div className="relative">
                  <button type="button" onClick={() => setShowCapMenu(v => !v)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${showCapMenu ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`} title="Tools">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {showCapMenu && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                        className="absolute bottom-11 left-0 z-30 min-w-[180px] rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] py-1 shadow-2xl">
                        {CAPABILITIES.map(cap => (
                          <button key={cap.id} type="button" onClick={() => toggleCap(cap.id)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-[var(--bg-hover)] ${activeCapabilities.has(cap.id) ? 'text-emerald-600 dark:text-[#86efac]' : 'text-[var(--text-primary)]'}`}>
                            <span className={activeCapabilities.has(cap.id) ? 'text-emerald-600 dark:text-[#86efac]' : 'text-[var(--text-muted)]'}>{cap.icon}</span>
                            {cap.label}
                            {activeCapabilities.has(cap.id) && (
                              <span className="ml-auto">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l4 4L19 7" /></svg>
                              </span>
                            )}
                          </button>
                        ))}
                        <div className="mx-3 my-1 border-t border-[var(--bg-border)]" />
                        <button type="button" onClick={() => { onGoToAgents?.(); setShowCapMenu(false); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                          <IconRobot className="h-4 w-4" /> Switch Agent
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1" />

                <div className="relative flex h-9 min-w-[7.5rem] items-center justify-end pr-1">
                  <select
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    aria-label="Model"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    {MODEL_CATALOG.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none flex items-center gap-0.5 text-[13px] text-[var(--text-secondary)]">
                    {shortModelLabel(selectedModel)}
                    <IconChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </span>
                </div>

                <span className="flex h-9 w-9 items-center justify-center text-[var(--text-muted)]" aria-hidden title="Voice">
                  <ClaudeWaveform className="h-4 w-5" />
                </span>

                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" title="Voice input">
                  <IconMicrophone className="h-4 w-4" />
                </button>

                {isStreaming ? (
                  <button type="button" onClick={() => abortRef.current?.abort()}
                    className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors hover:border-[#ef4444]/40 hover:bg-red-500/10 hover:text-red-500 dark:hover:bg-[#3f1f1f] dark:hover:text-[#fca5a5]">
                    <IconX className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={() => void sendMessage()} disabled={!input.trim()}
                    className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center quivo-btn-primary transition-all disabled:opacity-25 disabled:hover:brightness-100">
                    <IconSend className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center font-sans text-[10px] leading-relaxed text-[var(--text-muted)]">
              Quivo AI can make mistakes. Verify all financial, tax, and legal information with a licensed professional.
            </p>
            {messages.length === 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {WELCOME_SHORTCUTS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      disabled={isStreaming}
                      onClick={() => void sendMessage(s.prompt)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--bg-border)] bg-[var(--bg-card)] px-3.5 py-2 text-[13px] font-normal text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)] disabled:opacity-40"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" stroke={1.5} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
