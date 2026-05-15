'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconSearch, IconPlus, IconTrash, IconEdit, IconCopy,
  IconCheck, IconX, IconLoader2, IconTag, IconSparkles,
} from '@tabler/icons-react';

// ─── Prebuilt agents (always available, not stored in DB) ─────────────────────
const PREBUILT = [
  {
    id: 'pre_bank_reader',  category: 'Accounting', icon: '🏦',
    title: 'Bank Statement Reader',
    content: `Analyze this bank statement and provide:
1. Total income vs total expenses
2. Top 5 spending categories
3. Unusual or recurring charges
4. Cash flow trend
5. Recommendations to optimize spending

Statement data: [PASTE STATEMENT HERE]`,
    tags: ['finance', 'bank', 'analysis'],
  },
  {
    id: 'pre_invoice_drafter', category: 'Accounting', icon: '📄',
    title: 'Invoice Drafter',
    content: `Create a professional invoice for:
- Client: [CLIENT NAME]
- Service: [DESCRIBE SERVICE]
- Amount: $[AMOUNT]
- Due date: [DATE]
- Payment terms: Net 30

Include line items, professional language, and payment instructions.`,
    tags: ['invoice', 'billing', 'draft'],
  },
  {
    id: 'pre_mrr_analysis', category: 'Finance', icon: '📈',
    title: 'MRR & Revenue Analysis',
    content: `Query my Stripe account and tell me:
1. Current MRR
2. Overdue invoices and which clients haven't paid
3. Top 3 paying customers
4. Month-over-month revenue trend
5. Any accounts at risk of churn

Give me a concise executive summary.`,
    tags: ['stripe', 'mrr', 'revenue'],
  },
  {
    id: 'pre_email_summary', category: 'Gmail', icon: '📧',
    title: 'Inbox Daily Briefing',
    content: `Check my Gmail inbox and give me:
1. Unread emails that need urgent attention
2. Any emails from clients or customers
3. Action items I need to respond to
4. Emails I can archive or ignore

Be concise. Prioritize by urgency.`,
    tags: ['gmail', 'email', 'briefing'],
  },
  {
    id: 'pre_calendar_brief', category: 'Calendar', icon: '📅',
    title: 'Weekly Schedule Summary',
    content: `Check my Google Calendar for the next 7 days and tell me:
1. All meetings with dates and times
2. Any conflicts or back-to-back meetings
3. Preparation needed for key meetings
4. Free blocks for deep work

Format as a clean daily schedule.`,
    tags: ['calendar', 'schedule', 'meetings'],
  },
  {
    id: 'pre_legal_check', category: 'Legal', icon: '⚖️',
    title: 'LLC Compliance Checker',
    content: `Research and tell me the current compliance requirements for an LLC in [STATE]:
1. Annual report filing deadline and fees
2. Registered agent requirements
3. Operating agreement requirements
4. State tax obligations
5. Any recent law changes in [YEAR]

Sources: only use official state government websites.`,
    tags: ['legal', 'llc', 'compliance'],
  },
  {
    id: 'pre_client_email', category: 'Communication', icon: '✉️',
    title: 'Professional Client Email',
    content: `Write a professional email to [CLIENT NAME] about:
[DESCRIBE THE SITUATION]

Tone: [professional/friendly/firm]
Goal: [what do you want them to do]
Include: greeting, main message, clear call-to-action, professional closing.`,
    tags: ['email', 'client', 'communication'],
  },
  {
    id: 'pre_kpi_pack', category: 'Analytics', icon: '📉',
    title: 'KPI & variance pack',
    content: `Build a KPI pack for my finance team covering:
1. Revenue, gross margin, and operating margin vs prior quarter
2. Cash conversion cycle and working capital drivers
3. Top 5 expense variances with likely causes
4. Unit economics if SaaS (MRR, churn, NRR)
5. Three bullet recommendations for the next board update

Context: [INDUSTRY / COMPANY STAGE]`,
    tags: ['kpi', 'variance', 'board'],
  },
  {
    id: 'pre_compliance_gap', category: 'Compliance', icon: '🛡️',
    title: 'Compliance gap scan',
    content: `Act as a compliance analyst. For [REGULATION FRAMEWORK e.g. SOC 2 / GDPR / FINRA]:
1. List common control gaps for a [COMPANY SIZE] [INDUSTRY] firm
2. Map each gap to evidence we should collect
3. Suggest remediation owners (Legal, IT, Ops)
4. Flag overlaps with audit and infosec work
5. Output as a concise checklist table

Disclaimer: not legal advice — confirm with counsel.`,
    tags: ['soc2', 'gdpr', 'risk'],
  },
  {
    id: 'pre_web_research', category: 'Research', icon: '🔍',
    title: 'Competitor Research',
    content: `Search the web and research [COMPANY/COMPETITOR NAME]:
1. Their main products and services
2. Pricing (if public)
3. Recent news and announcements
4. Customer reviews and pain points
5. How we compare

Give me actionable insights in bullet points.`,
    tags: ['research', 'competitor', 'web'],
  },
  {
    id: 'pre_tax_prep', category: 'Tax & IRS', icon: '🧾',
    title: 'Tax Season Checklist',
    content: `Help me prepare for tax season for my [TYPE OF BUSINESS]:
1. List of documents I need to gather
2. Deductible expenses I might be missing
3. Deadline reminders
4. Questions to ask my accountant
5. Estimated tax payment schedule

My business type: [LLC/S-Corp/Sole Proprietor]
State: [STATE]`,
    tags: ['tax', 'accounting', 'checklist'],
  },
  {
    id: 'pre_overdue_followup', category: 'Finance', icon: '💬',
    title: 'Overdue Invoice Follow-up',
    content: `Check my Stripe for overdue invoices, then write a professional follow-up email for each overdue client.

For each client:
- Reference their specific invoice number and amount
- Be firm but professional
- Include a clear payment link request
- Set a final deadline

Template tone: firm but relationship-preserving.`,
    tags: ['stripe', 'invoice', 'followup'],
  },
];

const CATEGORIES = ['All', 'Accounting', 'Finance', 'Analytics', 'Compliance', 'Tax & IRS', 'Research', 'Legal', 'Gmail', 'Calendar', 'Communication', 'Custom'];

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  icon: string;
  tags: string[];
  created_at?: string;
}

interface Props {
  onUsePrompt?: (content: string) => void;
}

function PromptModal({ prompt, onClose, onSave }: {
  prompt?: Partial<Prompt>;
  onClose: () => void;
  onSave: (p: Omit<Prompt, 'id' | 'created_at'>) => void;
}) {
  const [title,    setTitle]    = useState(prompt?.title    ?? '');
  const [content,  setContent]  = useState(prompt?.content  ?? '');
  const [category, setCategory] = useState(prompt?.category ?? 'Custom');
  const [icon,     setIcon]     = useState(prompt?.icon     ?? '💬');
  const [tagInput, setTagInput] = useState('');
  const [tags,     setTags]     = useState<string[]>(prompt?.tags ?? []);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[580px] max-h-[90vh] flex flex-col rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-5 py-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{prompt?.id ? 'Edit Prompt' : 'New Prompt'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><IconX className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="mb-1 block text-[10px] font-semibold text-[var(--text-muted)]">Icon</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={2}
                className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] py-2 text-center text-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/20" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-semibold text-[var(--text-muted)]">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Bank Statement Reader"
                className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/20" />
            </div>
            <div className="w-36">
              <label className="mb-1 block text-[10px] font-semibold text-[var(--text-muted)]">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold text-[var(--text-muted)]">Prompt content *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write your reusable prompt here. Use [PLACEHOLDERS] for parts the user fills in."
              rows={10}
              className="w-full resize-none rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/20 font-mono" />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold text-[var(--text-muted)]">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 rounded-md border border-[var(--bg-border)] bg-[var(--bg-hover)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                  {t} <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><IconX className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Add tag and press Enter"
                className="flex-1 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" />
              <button type="button" onClick={addTag} className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <IconTag className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--bg-border)] px-5 py-4">
          <button type="button" onClick={onClose} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
          <button type="button" onClick={() => { if (title && content) { onSave({ title, content, category, icon, tags }); onClose(); } }}
            disabled={!title.trim() || !content.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-5 py-2 text-xs font-semibold text-[var(--bg-base)] transition-opacity hover:opacity-90 disabled:opacity-40">
            <IconCheck className="h-3.5 w-3.5" /> Save Prompt
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromptsPanel({ onUsePrompt }: Props) {
  const [userPrompts, setUserPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');
  const [tab, setTab]                 = useState<'library' | 'mine'>('library');
  const [showModal, setShowModal]     = useState(false);
  const [editPrompt, setEditPrompt]   = useState<Prompt | null>(null);
  const [copied, setCopied]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prompts', { credentials: 'include' });
      if (res.ok) { const d = await res.json(); setUserPrompts(d.prompts ?? []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePrompt(data: Omit<Prompt, 'id' | 'created_at'>) {
    if (editPrompt) {
      await fetch('/api/prompts', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: editPrompt.id, ...data }),
      });
      setUserPrompts(prev => prev.map(p => p.id === editPrompt.id ? { ...p, ...data } : p));
    } else {
      const res = await fetch('/api/prompts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (d.prompt) setUserPrompts(prev => [d.prompt, ...prev]);
      else load();
    }
    setEditPrompt(null);
  }

  async function deletePrompt(id: string) {
    setUserPrompts(prev => prev.filter(p => p.id !== id));
    await fetch('/api/prompts', {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId: id }),
    });
  }

  async function copyPrompt(p: Prompt) {
    await navigator.clipboard.writeText(p.content);
    setCopied(p.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const sourcePrompts: Prompt[] = tab === 'library'
    ? PREBUILT as Prompt[]
    : userPrompts;

  const filtered = sourcePrompts.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
    const matchC = category === 'All' || p.category === category;
    return matchQ && matchC;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-base)]">
      {(showModal || editPrompt) && (
        <PromptModal
          prompt={editPrompt ?? undefined}
          onClose={() => { setShowModal(false); setEditPrompt(null); }}
          onSave={savePrompt}
        />
      )}

      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-[var(--bg-border)] bg-[var(--bg-sidebar)] p-4 overflow-y-auto">
        <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Prompt Library</p>
        <div className="space-y-1">
          {(['library', 'mine'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${tab === t ? 'bg-[var(--text-primary)] text-[var(--bg-base)] ring-1 ring-white/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
              <span>{t === 'library' ? '⚡ Prebuilt Agents' : '📚 My Prompts'}</span>
              <span className={`text-[10px] font-bold ${tab === t ? 'opacity-70' : 'text-[var(--text-muted)]'}`}>
                {t === 'library' ? PREBUILT.length : userPrompts.length}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Categories</p>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`flex w-full items-center rounded-lg px-3 py-1.5 text-xs transition-all ${category === c ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {category === c && <span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]" />}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--bg-border)] bg-[var(--bg-base)] px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prompts…"
                className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/15" />
            </div>
            <button onClick={() => { setEditPrompt(null); setShowModal(true); }}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-[var(--bg-base)] transition-all hover:opacity-90">
              <IconPlus className="h-3.5 w-3.5" /> New Prompt
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && tab === 'mine' ? (
            <div className="flex h-40 items-center justify-center">
              <IconLoader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
              <IconSparkles className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {tab === 'mine' ? 'No saved prompts yet' : 'No prompts found'}
              </p>
              {tab === 'mine' && (
                <button type="button" onClick={() => setShowModal(true)} className="text-xs font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">Create your first prompt</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {filtered.map(p => (
                <div key={p.id} className="group flex h-full min-h-[220px] flex-col rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--text-primary)]/20 hover:bg-[var(--bg-hover)]">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{p.title}</p>
                      <span className="text-[10px] text-[var(--text-muted)]">{p.category}</span>
                    </div>
                  </div>

                  <p className="flex-1 text-xs leading-relaxed text-[var(--text-muted)] line-clamp-3 mb-3">{p.content}</p>

                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.tags.slice(0, 3).map(t => (
                        <span key={t} className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">#{t}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-2">
                    {onUsePrompt && (
                      <button type="button" onClick={() => onUsePrompt(p.content)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--bg-border)] bg-[var(--text-primary)] py-1.5 text-xs font-semibold text-[var(--bg-base)] transition-all hover:opacity-90">
                        <IconSparkles className="h-3 w-3" /> Use in Chat
                      </button>
                    )}
                    <button type="button" onClick={() => copyPrompt(p)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                      {copied === p.id ? <IconCheck className="h-3.5 w-3.5 text-emerald-500" /> : <IconCopy className="h-3.5 w-3.5" />}
                    </button>
                    {tab === 'mine' && (
                      <>
                        <button type="button" onClick={() => setEditPrompt(p)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                          <IconEdit className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => deletePrompt(p.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--bg-border)] text-[var(--text-muted)] transition-colors hover:text-red-500">
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
