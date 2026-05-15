'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch, IconPlus, IconX, IconCheck, IconChevronDown,
  IconTrash, IconEdit, IconFile, IconBookmark, IconBrain,
  IconUpload, IconWorld, IconCode, IconTool, IconBolt,
  IconMail, IconRobot, IconSparkles,
} from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  systemInstruction: string;
  model: string;
  category: string;
  isPrebuilt?: boolean;
  tags?: string[];
  webSearch?: boolean;
  fileContext?: boolean;
}

interface Memory { id: string; text: string; createdAt: string; }
interface SavedChat { id: string; title: string; summary: string; savedAt: string; }

// ─── Prebuilt finance agents ──────────────────────────────────────────────────
const PREBUILT_AGENTS: Agent[] = [
  { id: 'pre_tax', name: 'Tax Advisor', avatar: '🧾', category: 'Tax & IRS', isPrebuilt: true, tags: ['irs', 'tax', 'deductions'],
    model: 'claude-sonnet-4-5', description: 'IRS compliance, tax planning, deductions, and filing strategy for businesses and individuals.',
    systemInstruction: `You are a senior U.S. tax advisor specializing in IRS compliance, business tax strategy, deductions, and filing for LLCs, S-Corps, and sole proprietors. Today: ${new Date().toLocaleDateString()}. Always cite relevant IRS codes and publications. Be precise with dollar amounts.` },
  { id: 'pre_bookkeeper', name: 'Bookkeeper AI', avatar: '📒', category: 'Accounting', isPrebuilt: true, tags: ['bookkeeping', 'gaap'],
    model: 'claude-sonnet-4-5', description: 'Journal entries, bank reconciliation, chart of accounts, AP/AR.',
    systemInstruction: 'You are a professional bookkeeper with expertise in QuickBooks, Xero, and GAAP accounting. Help with journal entries, bank reconciliation, chart of accounts setup, and financial statement preparation.' },
  { id: 'pre_analyst', name: 'Financial Analyst', avatar: '📈', category: 'Finance', isPrebuilt: true, tags: ['dcf', 'kpi', 'modeling'],
    model: 'claude-sonnet-4-5', description: 'DCF, LBO, cash flow analysis, KPI dashboards, ratios, forecasting.',
    systemInstruction: 'You are a CFA-level financial analyst. Help with financial modeling (DCF, LBO, comparables), cash flow analysis, KPI dashboards, ratio analysis, budgeting, and forecasting. Format numbers clearly.' },
  { id: 'pre_audit', name: 'Audit Assistant', avatar: '🔍', category: 'Audit', isPrebuilt: true, tags: ['sox', 'gaas', 'risk'],
    model: 'claude-sonnet-4-5', description: 'Internal audit, SOX compliance, risk assessment, GAAP/GAAS.',
    systemInstruction: 'You are an internal audit specialist with knowledge of GAAP, GAAS, SOX compliance, and risk assessment frameworks. Help with audit planning, control testing, risk matrices, and audit report writing.' },
  { id: 'pre_payroll', name: 'Payroll Specialist', avatar: '💰', category: 'Payroll', isPrebuilt: true, tags: ['w2', '1099', 'flsa'],
    model: 'claude-sonnet-4-5', description: 'Payroll processing, W-2/1099 prep, employee taxes, FLSA compliance.',
    systemInstruction: 'You are a payroll specialist with expertise in federal and state payroll taxes, W-2/1099 preparation, FLSA compliance, benefits deductions, and payroll journal entries.' },
  { id: 'pre_cfo', name: 'Virtual CFO', avatar: '💼', category: 'Finance', isPrebuilt: true, tags: ['strategy', 'fundraising', 'm&a'],
    model: 'claude-sonnet-4-5', description: 'Strategic CFO: cash management, M&A, fundraising, board presentations.',
    systemInstruction: 'You are an experienced CFO advisor for small and mid-size businesses. Provide strategic financial guidance on cash management, investor relations, M&A, fundraising strategy, and board presentations.' },
  { id: 'pre_invoice', name: 'Invoice Processor', avatar: '📄', category: 'Accounting', isPrebuilt: true, tags: ['ar', 'collections'],
    model: 'claude-sonnet-4-5', description: 'Draft invoices, collections strategy, AR aging reports.',
    systemInstruction: 'You are an accounts receivable specialist. Help draft professional invoices, write overdue payment follow-up emails, create collections strategies, and analyze aging reports.' },
  { id: 'pre_compliance', name: 'Compliance Officer', avatar: '⚖️', category: 'Compliance', isPrebuilt: true, tags: ['sec', 'aml', 'kyc'],
    model: 'claude-sonnet-4-5', description: 'SEC, FINRA, AML/KYC, corporate governance compliance.',
    systemInstruction: 'You are a compliance officer with expertise in SEC regulations, FINRA rules, AML/KYC requirements, corporate governance, and state business law. Help draft compliance policies and assess regulatory risk.' },
  { id: 'pre_budget', name: 'Budget Planner', avatar: '🗂️', category: 'Finance', isPrebuilt: true, tags: ['budget', 'variance', 'cost'],
    model: 'claude-sonnet-4-5', description: 'Annual budgets, variance analysis, cost optimization.',
    systemInstruction: 'You are a budget planning expert. Help build annual operating budgets, analyze budget-vs-actual variances, identify cost optimization opportunities, and create financial forecasts.' },
  { id: 'pre_bankstmt', name: 'Bank Statement Reader', avatar: '🏦', category: 'Accounting', isPrebuilt: true, tags: ['bank', 'transactions'],
    model: 'claude-sonnet-4-5', description: 'Parse bank statements, categorize transactions, identify trends.',
    systemInstruction: 'You are a financial data analyst specializing in bank statement analysis. Identify income vs expenses, top spending categories, unusual charges, cash flow trends, and provide actionable recommendations.' },
  { id: 'pre_consultant', name: 'Business Consultant', avatar: '🤝', category: 'Consulting', isPrebuilt: true, tags: ['strategy', 'growth'],
    model: 'claude-sonnet-4-5', description: 'Business strategy, process optimization, client retention, growth.',
    systemInstruction: 'You are a senior business consultant with expertise in financial services and accounting firms. Help with strategic planning, operational efficiency, client retention, pricing strategy, and growth roadmaps.' },
  { id: 'pre_mrr', name: 'SaaS & MRR Metrics', avatar: '📊', category: 'Finance', isPrebuilt: true, tags: ['mrr', 'arr', 'churn', 'saas'],
    model: 'claude-sonnet-4-5', description: 'MRR/ARR tracking, churn analysis, LTV/CAC, SaaS unit economics.',
    systemInstruction: 'You are a SaaS finance expert specializing in subscription metrics. Help with MRR/ARR calculations, churn analysis, LTV/CAC ratios, revenue recognition, and cohort analysis.' },
  { id: 'pre_duediligence', name: 'Due Diligence', avatar: '🔬', category: 'M&A', isPrebuilt: true, tags: ['valuation', 'ma', 'risk'],
    model: 'claude-sonnet-4-5', description: 'M&A financial due diligence, business valuation, risk assessment.',
    systemInstruction: 'You are an M&A due diligence specialist. Help with financial statement analysis for acquisitions, identifying red flags, business valuation (DCF, multiples), and synergy analysis.' },
  { id: 'pre_entity', name: 'Entity & Corp Law', avatar: '🏛️', category: 'Legal', isPrebuilt: true, tags: ['llc', 'corp', 'delaware'],
    model: 'claude-sonnet-4-5', description: 'LLC/Corp formation, Delaware law, registered agents, filings.',
    systemInstruction: 'You are a corporate law specialist focused on business entity formation. Help with LLC vs S-Corp vs C-Corp decisions, Delaware formation, annual report filings, and operating agreements.' },
  { id: 'pre_irs_notices', name: 'IRS Notice Handler', avatar: '📬', category: 'Tax & IRS', isPrebuilt: true, tags: ['irs', 'notices', 'response'],
    model: 'claude-sonnet-4-5', description: 'Respond to IRS notices, CP2000, CP notices, audit letters.',
    systemInstruction: 'You are a tax professional specializing in IRS correspondence. Help interpret IRS notices (CP2000, CP501, etc.), draft professional response letters, and advise on next steps. Always recommend consulting a CPA for complex issues.' },
  { id: 'pre_grant', name: 'Grant & Funding Advisor', avatar: '🏆', category: 'Consulting', isPrebuilt: true, tags: ['grants', 'sba', 'funding'],
    model: 'claude-sonnet-4-5', description: 'SBA loans, business grants, R&D credits, funding sources.',
    systemInstruction: 'You are a business funding specialist. Help identify SBA loans, federal/state grants, R&D tax credits, angel funding, and other funding sources for small businesses. Provide actionable steps for applying.' },
];

const CATEGORIES = ['All', 'Finance', 'Accounting', 'Tax & IRS', 'Audit', 'Compliance', 'Payroll', 'Consulting', 'M&A', 'Legal', 'Custom'];
const MODELS = [
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'gemini', label: 'Gemini 1.5 Pro' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-reasoner', label: 'DeepSeek R1 (reasoning)' },
];
const AVATARS = ['🤖','🧾','📒','📈','🔍','💰','💼','📄','⚖️','🗂️','🏦','🤝','🏛️','📊','🔬','💡','🎯','🛡️','📬','🏆'];

const LS_AGENTS   = 'quivo_user_agents';
const LS_MEMORIES = 'quivo_memories';
const LS_SAVED    = 'quivo_saved_chats';

function loadUserAgents(): Agent[] { try { return JSON.parse(localStorage.getItem(LS_AGENTS) ?? '[]'); } catch { return []; } }
function saveUserAgents(a: Agent[]) { localStorage.setItem(LS_AGENTS, JSON.stringify(a)); }
function loadMemories(): Memory[] { try { return JSON.parse(localStorage.getItem(LS_MEMORIES) ?? '[]'); } catch { return []; } }
function saveMemories(m: Memory[]) { localStorage.setItem(LS_MEMORIES, JSON.stringify(m)); }
function loadSavedChats(): SavedChat[] { try { return JSON.parse(localStorage.getItem(LS_SAVED) ?? '[]'); } catch { return []; } }

// ─── Category badge ────────────────────────────────────────────────────────────
const catColor: Record<string, string> = {
  'Finance': 'text-[#9b9b9b]', 'Accounting': 'text-[#9b9b9b]', 'Tax & IRS': 'text-[#9b9b9b]',
  'Audit': 'text-[#9b9b9b]', 'Compliance': 'text-[#9b9b9b]', 'Payroll': 'text-[#9b9b9b]',
  'Consulting': 'text-[#9b9b9b]', 'M&A': 'text-[#9b9b9b]', 'Legal': 'text-[#9b9b9b]',
  'Custom': 'text-[#8b949e]',
};

// ─── Create Agent Form ─────────────────────────────────────────────────────────
function CreateAgentForm({ onSave, onCancel, existing }: {
  onSave: (a: Agent) => void; onCancel: () => void; existing?: Agent;
}) {
  const [name, setName]         = useState(existing?.name ?? '');
  const [avatar, setAvatar]     = useState(existing?.avatar ?? '🤖');
  const [description, setDesc]  = useState(existing?.description ?? '');
  const [category, setCat]      = useState(existing?.category ?? 'Finance');
  const [instructions, setInst] = useState(existing?.systemInstruction ?? '');
  const [model, setModel]       = useState(existing?.model ?? 'claude-sonnet-4-5');
  const [webSearch, setWebSearch] = useState(existing?.webSearch ?? false);
  const [fileContext, setFileCtx] = useState(existing?.fileContext ?? false);
  const [showAvatars, setShowAvatars] = useState(false);
  const [tags, setTags]         = useState((existing?.tags ?? []).join(', '));

  const valid = name.trim().length > 0 && instructions.trim().length > 0;

  function submit() {
    if (!valid) return;
    onSave({
      id: existing?.id ?? `custom_${Date.now()}`,
      name: name.trim(), avatar, description: description.trim(),
      systemInstruction: instructions.trim(), model, category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      webSearch, fileContext,
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e2836] px-4 py-3">
        <div className="flex items-center gap-2">
          <select className="rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-1.5 text-xs font-semibold text-[#e6edf3] focus:outline-none">
            <option>{existing ? 'Edit Agent' : 'Create New Agent'}</option>
          </select>
          <IconChevronDown className="h-3.5 w-3.5 text-[#8b949e]" />
        </div>
      </div>

      {/* Avatar */}
      <div className="flex justify-center py-5 border-b border-[#1e2836] relative">
        <button onClick={() => setShowAvatars(v => !v)}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#1e2836] text-4xl hover:border-[#3b82f6]/40 transition-all">
          {avatar}
        </button>
        <AnimatePresence>
          {showAvatars && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-20 z-10 flex flex-wrap w-52 gap-1 rounded-2xl border border-[#1e2836] bg-[#0f1419] p-3 shadow-2xl">
              {AVATARS.map(em => (
                <button key={em} onClick={() => { setAvatar(em); setShowAvatars(false); }}
                  className={`h-9 w-9 rounded-xl text-xl hover:bg-[#1e2836] transition-all ${avatar === em ? 'bg-[#3b82f6]/20 ring-1 ring-[#3b82f6]' : ''}`}>{em}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="absolute bottom-2 text-[10px] text-[#8b949e]">Click to change</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#e6edf3]">Name <span className="text-[#ef4444]">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional: the name of the agent"
            className="w-full rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e]/60 focus:border-[#3b82f6]/50 focus:outline-none" />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#e6edf3]">Description</label>
          <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional: Describe your Agent here"
            className="w-full rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e]/60 focus:border-[#3b82f6]/50 focus:outline-none" />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#e6edf3]">Category <span className="text-[#ef4444]">*</span></label>
          <div className="relative">
            <select value={category} onChange={e => setCat(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none">
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b949e]" />
          </div>
        </div>

        {/* Instructions */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-[#e6edf3]">Instructions</label>
            <button className="flex items-center gap-1 rounded-full border border-[#1e2836] px-2 py-0.5 text-[10px] text-[#8b949e] hover:text-[#e6edf3]">
              <IconSparkles className="h-3 w-3" /> Variables
            </button>
          </div>
          <textarea value={instructions} onChange={e => setInst(e.target.value)} rows={5}
            placeholder="The system instructions that the agent uses"
            className="w-full resize-none rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e]/60 focus:border-[#3b82f6]/50 focus:outline-none" />
        </div>

        {/* Model */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#e6edf3]">Model <span className="text-[#ef4444]">*</span></label>
          <div className="relative">
            <select value={model} onChange={e => setModel(e.target.value)}
              className="w-full appearance-none rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none">
              <option value="">Select a model</option>
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b949e]" />
          </div>
        </div>

        {/* Capabilities */}
        <div className="rounded-lg border border-[#1e2836] bg-[#141b26] p-3 space-y-3">
          <p className="text-xs font-bold text-[#e6edf3]">Capabilities</p>

          {/* Web Search */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#8b949e]">Web Search</p>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={webSearch} onChange={e => setWebSearch(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#3b82f6]" />
              <IconWorld className="h-3.5 w-3.5 text-[#8b949e]" />
              <span className="text-xs text-[#e6edf3]">Web Search</span>
              <span className="ml-auto text-[#8b949e]">🔑</span>
            </label>
          </div>

          {/* File Context */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#8b949e]">File Context</p>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={fileContext} onChange={e => setFileCtx(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#3b82f6]" />
              <span className="text-xs text-[#e6edf3]">Enable File Context</span>
            </label>
            {fileContext && (
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1e2836] px-3 py-2 text-xs text-[#8b949e] hover:text-[#e6edf3] hover:border-[#3b82f6]/40 transition-all">
                <IconUpload className="h-3.5 w-3.5" /> Upload File Context
              </button>
            )}
          </div>

          {/* Knowledge Base */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#8b949e]">Knowledge Base</p>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1e2836] px-3 py-2 text-xs text-[#8b949e] hover:text-[#e6edf3] hover:border-[#3b82f6]/40 transition-all">
              <IconFile className="h-3.5 w-3.5" /> Link Knowledge Base
            </button>
          </div>

          {/* Tools */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#8b949e]">Tools and Actions</p>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#1e2836] px-2 py-1.5 text-[11px] font-semibold text-[#e6edf3] hover:bg-[#1e2836] transition-all">
                <IconTool className="h-3 w-3" /> Add Tools
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#1e2836] px-2 py-1.5 text-[11px] font-semibold text-[#e6edf3] hover:bg-[#1e2836] transition-all">
                <IconBolt className="h-3 w-3" /> Add Actions
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#8b949e]">Tags (comma-separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="tax, irs, compliance"
            className="w-full rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e]/60 focus:border-[#3b82f6]/50 focus:outline-none" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e2836] p-4 space-y-2">
        <button onClick={submit} disabled={!valid}
          className="w-full rounded-xl bg-[#22c55e] py-2.5 text-sm font-bold text-white hover:bg-[#16a34a] disabled:opacity-40 transition-all">
          {existing ? 'Save Changes' : 'Create'}
        </button>
        <button onClick={onCancel}
          className="w-full rounded-xl border border-[#1e2836] py-2 text-xs text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3] transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Left panel: Files / Bookmarks / Memories ─────────────────────────────────
type LeftPanel = 'files' | 'bookmarks' | 'memories' | null;

function LeftPanelContent({ panel, onClose }: { panel: LeftPanel; onClose: () => void }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [savedChats] = useState<SavedChat[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [showNewMemory, setShowNewMemory] = useState(false);

  useEffect(() => { setMemories(loadMemories()); }, []);

  function addMemory() {
    if (!newMemory.trim()) return;
    const m: Memory = { id: `mem_${Date.now()}`, text: newMemory.trim(), createdAt: new Date().toISOString() };
    const updated = [m, ...memories];
    setMemories(updated);
    saveMemories(updated);
    setNewMemory('');
    setShowNewMemory(false);
  }

  function deleteMemory(id: string) {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    saveMemories(updated);
  }

  if (panel === 'files') return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[#1e2836] px-3 py-2">
        <input placeholder="Filter files…" className="flex-1 rounded-lg bg-[#141b26] border border-[#1e2836] px-2 py-1.5 text-[11px] text-[#e6edf3] placeholder-[#8b949e] focus:outline-none" />
      </div>
      <div className="flex items-center justify-between border-b border-[#1e2836] px-3 py-2 text-[10px] text-[#8b949e] font-semibold">
        <span>Name ↕</span><span>Date ↕</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[11px] text-[#8b949e]">No results.</p>
      </div>
      <div className="border-t border-[#1e2836] flex items-center justify-between px-3 py-2 text-[10px] text-[#8b949e]">
        <span>Prev</span>
        <button className="text-[#8b949e] hover:text-[#e6edf3]">Manage Files</button>
        <span>1 / 0 Next</span>
      </div>
    </div>
  );

  if (panel === 'bookmarks') return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[#1e2836] px-3 py-2">
        <input placeholder="Filter bookmarks…" className="flex-1 rounded-lg bg-[#141b26] border border-[#1e2836] px-2 py-1.5 text-[11px] text-[#e6edf3] placeholder-[#8b949e] focus:outline-none" />
        <button className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#1e2836] bg-[#141b26] text-[#8b949e] hover:text-[#e6edf3]">
          <IconPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <IconBookmark className="mb-2 h-8 w-8 text-[#8b949e]" />
        <p className="text-xs font-semibold text-[#e6edf3]">No bookmarks yet</p>
        <p className="text-[10px] text-[#8b949e]">Click on a chat to add one</p>
      </div>
      {savedChats.length > 0 && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedChats.map(c => (
            <div key={c.id} className="rounded-lg border border-[#1e2836] bg-[#141b26] p-2.5">
              <p className="text-xs font-semibold text-[#e6edf3] truncate">{c.title}</p>
              <p className="text-[10px] text-[#8b949e] truncate">{c.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (panel === 'memories') return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[#1e2836] px-3 py-2">
        <input placeholder="Filter memories…" className="flex-1 rounded-lg bg-[#141b26] border border-[#1e2836] px-2 py-1.5 text-[11px] text-[#e6edf3] placeholder-[#8b949e] focus:outline-none" />
        <button onClick={() => setShowNewMemory(v => !v)}
          className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#1e2836] bg-[#141b26] text-[#8b949e] hover:text-[#e6edf3]">
          <IconPlus className="h-3.5 w-3.5" />
        </button>
      </div>
      {showNewMemory && (
        <div className="border-b border-[#1e2836] p-2 flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-[#22c55e]">
            <input type="checkbox" defaultChecked className="accent-[#22c55e] h-3 w-3" /> User
          </label>
          <input value={newMemory} onChange={e => setNewMemory(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addMemory(); }}
            placeholder="Create Memory…" autoFocus
            className="flex-1 rounded bg-transparent text-[11px] text-[#e6edf3] placeholder-[#8b949e] focus:outline-none" />
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <IconBrain className="mb-2 h-8 w-8 text-[#8b949e]" />
            <p className="text-xs font-semibold text-[#e6edf3]">No memories yet</p>
            <p className="text-[10px] text-[#8b949e]">No memories. Create them manually or prompt the AI to remember something.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {memories.map(m => (
              <div key={m.id} className="group flex items-start gap-2 rounded-lg border border-[#1e2836] bg-[#141b26] p-2.5">
                <p className="flex-1 text-[11px] text-[#e6edf3]">{m.text}</p>
                <button onClick={() => deleteMemory(m.id)}
                  className="mt-0.5 hidden h-4 w-4 items-center justify-center rounded text-[#8b949e] hover:text-[#ef4444] group-hover:flex shrink-0">
                  <IconX className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return null;
}

// ─── Agent card ────────────────────────────────────────────────────────────────
function AgentCard({ agent, onChat, onEdit, onDelete }: {
  agent: Agent; onChat: () => void; onEdit?: () => void; onDelete?: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--text-muted)] hover:bg-[var(--bg-hover)]">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-2xl">{agent.avatar}</div>
        {!agent.isPrebuilt && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3]"><IconEdit className="h-3.5 w-3.5" /></button>}
            {onDelete && <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#ef4444]/10 hover:text-[#ef4444]"><IconTrash className="h-3.5 w-3.5" /></button>}
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#e6edf3]">{agent.name}</h3>
          {agent.isPrebuilt && <span className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Built-in</span>}
        </div>
        <p className={`mb-2 text-[10px] font-semibold ${catColor[agent.category] ?? 'text-[#8b949e]'}`}>{agent.category}</p>
        <p className="text-[11px] text-[#8b949e] line-clamp-2">{agent.description}</p>
      </div>
      <button onClick={onChat}
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-[var(--bg-border)] bg-[var(--text-primary)] py-2 text-xs font-semibold text-[var(--bg-base)] transition-all hover:opacity-90">
        Chat with Agent →
      </button>
    </motion.div>
  );
}

// ─── Main Agents Panel ─────────────────────────────────────────────────────────
interface Props { onChatWithAgent?: (agentId: string) => void; }

export default function AgentsPanel({ onChatWithAgent }: Props) {
  const [userAgents, setUserAgents]   = useState<Agent[]>([]);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('All');
  const [leftPanel, setLeftPanel]     = useState<LeftPanel>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>();
  const [showMyAgents, setShowMyAgents] = useState(false);

  useEffect(() => { setUserAgents(loadUserAgents()); }, []);

  const allAgents   = showMyAgents ? userAgents : PREBUILT_AGENTS;
  const categories  = ['All', ...Array.from(new Set(allAgents.map(a => a.category)))];
  const filtered    = allAgents.filter(a => {
    const mSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      (a.tags ?? []).some(t => t.includes(search.toLowerCase()));
    const mCat = category === 'All' || a.category === category;
    return mSearch && mCat;
  });

  function handleSave(agent: Agent) {
    const updated = editingAgent
      ? userAgents.map(a => a.id === agent.id ? agent : a)
      : [agent, ...userAgents];
    setUserAgents(updated);
    saveUserAgents(updated);
    setShowCreate(false);
    setEditingAgent(undefined);
  }

  function handleDelete(id: string) {
    const updated = userAgents.filter(a => a.id !== id);
    setUserAgents(updated);
    saveUserAgents(updated);
  }

  const leftIcons = [
    { id: 'files' as LeftPanel, icon: IconFile, label: 'Files' },
    { id: 'bookmarks' as LeftPanel, icon: IconBookmark, label: 'Bookmarks' },
    { id: 'memories' as LeftPanel, icon: IconBrain, label: 'Memories' },
  ];

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left icon bar ──────────────────────────────────────────────────── */}
      <div className="flex w-10 shrink-0 flex-col items-center gap-2 border-r border-[var(--bg-border)] bg-[var(--bg-base)] py-3">
        <button onClick={() => { setShowCreate(true); setLeftPanel(null); }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${showCreate ? 'bg-[var(--text-primary)] text-[var(--bg-base)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
          <IconPlus className="h-4 w-4" />
        </button>
        <button onClick={() => { setShowMyAgents(v => !v); setLeftPanel(null); setShowCreate(false); }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${showMyAgents ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
          <IconRobot className="h-4 w-4" />
        </button>
        <div className="my-1 w-6 border-t border-[var(--bg-border)]" />
        {leftIcons.map(({ id, icon: Icon, label }) => (
          <button key={id} title={label}
            onClick={() => { setLeftPanel(p => p === id ? null : id); setShowCreate(false); }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${leftPanel === id ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* ── Left panel content ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {(leftPanel || showCreate) && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-r border-[var(--bg-border)] bg-[var(--bg-base)]" style={{ width: 200 }}>
            {showCreate && (
              <CreateAgentForm
                existing={editingAgent}
                onSave={handleSave}
                onCancel={() => { setShowCreate(false); setEditingAgent(undefined); }}
              />
            )}
            {leftPanel && !showCreate && (
              <LeftPanelContent panel={leftPanel} onClose={() => setLeftPanel(null)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main marketplace ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Marketplace header */}
        <div className="flex flex-col items-center justify-center border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] px-6 py-8">
          <h1 className="mb-1 font-serif text-2xl font-normal tracking-tight text-[var(--text-primary)] md:text-3xl">
            {showMyAgents ? 'My Agents' : 'Agent Marketplace'}
          </h1>
          <p className="mb-5 text-sm text-[var(--text-muted)]">
            {showMyAgents
              ? 'Your custom AI agents for specialized financial tasks'
              : 'Discover and use powerful AI agents to enhance your accounting and finance workflows'}
          </p>

          {/* Search */}
          <div className="relative w-full max-w-lg">
            <IconSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents…"
              className="w-full rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--text-muted)] focus:outline-none" />
          </div>

          {/* Category tabs */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${category === cat ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] ring-1 ring-white/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Agents grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {showMyAgents && userAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-5xl">🤖</div>
              <h3 className="mb-2 text-lg font-bold text-[#e6edf3]">No agents found</h3>
              <p className="mb-4 text-sm text-[#8b949e]">Create your first AI agent using the + button on the left</p>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90">
                <IconPlus className="h-4 w-4" /> Create Agent
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h3 className="text-sm font-semibold text-[#8b949e]">No agents found</h3>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#e6edf3]">
                  {category === 'All' ? (showMyAgents ? 'My Agents' : 'Finance Specialists') : category}
                </h2>
                <p className="text-xs text-[#8b949e]">
                  {category === 'All'
                    ? (showMyAgents ? 'Your custom finance AI agents' : 'AI agents specialized in accounting, tax, audit, and financial consulting')
                    : `${category} agents`}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(agent => (
                  <AgentCard key={agent.id} agent={agent}
                    onChat={() => onChatWithAgent?.(agent.id)}
                    onEdit={() => { setEditingAgent(agent); setShowCreate(true); setLeftPanel(null); }}
                    onDelete={() => handleDelete(agent.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
