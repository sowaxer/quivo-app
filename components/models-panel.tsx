'use client';

import { useState } from 'react';
import { IconSearch, IconCheck, IconChevronRight, IconPlus, IconDots } from '@tabler/icons-react';
import { ProviderLogo } from '@/components/provider-brand-icons';

type ModelRow = {
  id: string;
  /** API host / billing provider (sidebar filter, “Provider” in detail) */
  provider: string;
  /** When the model is from another lab (e.g. Llama on Groq), logo uses this brand */
  brandForLogo?: string;
  name: string;
  ctx: string;
  type: string;
  release: string;
  pricing: { in: number; out: number };
  features: string[];
  desc: string;
};

function logoProvider(m: Pick<ModelRow, 'provider' | 'brandForLogo'>) {
  return m.brandForLogo ?? m.provider;
}

// ─── Model catalogue ───────────────────────────────────────────────────────────
const ALL_MODELS: ModelRow[] = [
  // Anthropic / Claude
  { id: 'claude-opus-4',     provider: 'Anthropic', name: 'Claude Opus 4',      ctx: '200K',  type: 'Text',       release: '2025-06-01', pricing: { in: 15,    out: 75   }, features: ['Vision','Streaming','Thinking mode','Prompt caching'], desc: 'Most capable Claude model for complex reasoning tasks.' },
  { id: 'claude-sonnet-4-5', provider: 'Anthropic', name: 'Claude Sonnet 4.5',  ctx: '200K',  type: 'Text',       release: '2025-08-01', pricing: { in: 3,     out: 15   }, features: ['Vision','Streaming','Thinking mode','Prompt caching'], desc: 'Ideal balance of speed and intelligence for most tasks.' },
  { id: 'claude-haiku-4-5',  provider: 'Anthropic', name: 'Claude Haiku 4.5',   ctx: '200K',  type: 'Text',       release: '2025-08-01', pricing: { in: 0.8,   out: 4    }, features: ['Vision','Streaming','Prompt caching'], desc: 'Fastest Claude model, great for high-volume tasks.' },
  { id: 'claude-opus-3',     provider: 'Anthropic', name: 'Claude Opus 3',       ctx: '200K',  type: 'Text',       release: '2024-03-01', pricing: { in: 15,    out: 75   }, features: ['Vision','Streaming'], desc: 'Previous generation flagship model.' },
  { id: 'claude-sonnet-3-7', provider: 'Anthropic', name: 'Claude Sonnet 3.7',  ctx: '200K',  type: 'Text',       release: '2025-02-01', pricing: { in: 3,     out: 15   }, features: ['Vision','Streaming','Thinking mode'], desc: 'Strong reasoning with extended thinking capability.' },
  // Google / Gemini
  { id: 'gemini-2.5-pro',    provider: 'Google',    name: 'Gemini 2.5 Pro',     ctx: '1.5M',  type: 'Multimodal', release: '2025-03-01', pricing: { in: 2.5,   out: 15   }, features: ['Vision','Streaming','Thinking mode','Long context'], desc: 'Most intelligent Gemini with deep reasoning.' },
  { id: 'gemini-flash-2-5',  provider: 'Google',    name: 'Gemini 2.5 Flash',   ctx: '1.5M',  type: 'Multimodal', release: '2025-05-01', pricing: { in: 0.15,  out: 0.6  }, features: ['Vision','Streaming','Long context'], desc: 'Fastest next-gen Gemini.' },
  { id: 'gemini-2.0-flash',  provider: 'Google',    name: 'Gemini 2.0 Flash',   ctx: '1M',    type: 'Multimodal', release: '2024-12-01', pricing: { in: 0.1,   out: 0.4  }, features: ['Vision','Streaming','Native audio'], desc: 'Latest Gemini with native multimodal output.' },
  { id: 'gemini-1.5-pro',    provider: 'Google',    name: 'Gemini 1.5 Pro',     ctx: '1M',    type: 'Multimodal', release: '2024-05-01', pricing: { in: 1.25,  out: 5    }, features: ['Vision','Streaming','Long context'], desc: 'Google flagship with 1M context window.' },
  { id: 'gemini-1.5-flash',  provider: 'Google',    name: 'Gemini 1.5 Flash',   ctx: '1M',    type: 'Multimodal', release: '2024-05-01', pricing: { in: 0.075, out: 0.3  }, features: ['Vision','Streaming'], desc: 'Fast and efficient Gemini model.' },
  // OpenAI
  { id: 'gpt-4.1',           provider: 'OpenAI',    name: 'GPT-4.1',            ctx: '1M',    type: 'Multimodal', release: '2025-04-01', pricing: { in: 2,     out: 8    }, features: ['Vision','Streaming','Background mode'], desc: 'Improved GPT-4 with 1M context.' },
  { id: 'gpt-4.1-mini',      provider: 'OpenAI',    name: 'GPT-4.1 Mini',       ctx: '1M',    type: 'Multimodal', release: '2025-04-01', pricing: { in: 0.4,   out: 1.6  }, features: ['Vision','Streaming'], desc: 'Efficient GPT-4.1 variant.' },
  { id: 'gpt-4o',            provider: 'OpenAI',    name: 'GPT-4o',             ctx: '128K',  type: 'Multimodal', release: '2024-05-01', pricing: { in: 2.5,   out: 10   }, features: ['Vision','Streaming','Background mode'], desc: "OpenAI's flagship multimodal model." },
  { id: 'gpt-4o-mini',       provider: 'OpenAI',    name: 'GPT-4o Mini',        ctx: '128K',  type: 'Multimodal', release: '2024-07-01', pricing: { in: 0.15,  out: 0.6  }, features: ['Vision','Streaming'], desc: 'Affordable and fast GPT-4 class model.' },
  { id: 'o3',                provider: 'OpenAI',    name: 'o3',                 ctx: '200K',  type: 'Text',       release: '2025-04-01', pricing: { in: 10,    out: 40   }, features: ['Vision','Streaming','Thinking mode'], desc: 'Most capable OpenAI reasoning model.' },
  { id: 'o4-mini',           provider: 'OpenAI',    name: 'o4-mini',            ctx: '128K',  type: 'Text',       release: '2025-04-01', pricing: { in: 1.1,   out: 4.4  }, features: ['Streaming','Thinking mode'], desc: 'Compact reasoning model with chain-of-thought.' },
  // Groq
  { id: 'llama-3.3-70b',     provider: 'Groq', brandForLogo: 'Meta',    name: 'Llama 3.3 70B',      ctx: '128K',  type: 'Text',       release: '2024-12-01', pricing: { in: 0.59,  out: 0.79 }, features: ['Streaming','Fast inference'], desc: 'Meta Llama 3.3 running on Groq LPU — ultra fast.' },
  { id: 'llama-3.1-8b-groq', provider: 'Groq', brandForLogo: 'Meta',    name: 'Llama 3.1 8B',       ctx: '128K',  type: 'Text',       release: '2024-07-01', pricing: { in: 0.05,  out: 0.08 }, features: ['Streaming','Fast inference'], desc: 'Lightweight Llama model with blazing speed.' },
  { id: 'mixtral-8x7b-groq', provider: 'Groq', brandForLogo: 'Mistral', name: 'Mixtral 8x7B',       ctx: '32K',   type: 'Text',       release: '2024-01-01', pricing: { in: 0.24,  out: 0.24 }, features: ['Streaming'], desc: 'MoE model running on Groq LPU.' },
  { id: 'gemma2-9b-groq',    provider: 'Groq', brandForLogo: 'Google',  name: 'Gemma 2 9B',         ctx: '8K',    type: 'Text',       release: '2024-06-01', pricing: { in: 0.2,   out: 0.2  }, features: ['Streaming'], desc: "Google's Gemma 2 on Groq hardware." },
  // Mistral
  { id: 'mistral-large-2',   provider: 'Mistral',   name: 'Mistral Large 2',    ctx: '128K',  type: 'Text',       release: '2024-07-01', pricing: { in: 3,     out: 9    }, features: ['Streaming','Function calling'], desc: "Mistral's flagship model for complex tasks." },
  { id: 'mistral-small-3',   provider: 'Mistral',   name: 'Mistral Small 3.1',  ctx: '128K',  type: 'Text',       release: '2025-03-01', pricing: { in: 0.1,   out: 0.3  }, features: ['Streaming','Vision'], desc: 'Cost-efficient multilingual model.' },
  { id: 'codestral',         provider: 'Mistral',   name: 'Codestral',          ctx: '256K',  type: 'Code',       release: '2024-05-01', pricing: { in: 0.3,   out: 0.9  }, features: ['Streaming','80+ languages'], desc: 'Specialized code generation model.' },
  // Deepseek
  { id: 'deepseek-v3',       provider: 'Deepseek',  name: 'DeepSeek V3',        ctx: '128K',  type: 'Text',       release: '2024-12-01', pricing: { in: 0.27,  out: 1.1  }, features: ['Streaming','Function calling'], desc: 'Mixture-of-Experts model with 671B parameters.' },
  { id: 'deepseek-r1',       provider: 'Deepseek',  name: 'DeepSeek R1',        ctx: '128K',  type: 'Text',       release: '2025-01-01', pricing: { in: 0.55,  out: 2.19 }, features: ['Streaming','Thinking mode'], desc: 'Reasoning model rivaling OpenAI o1.' },
  // xAI / Grok
  { id: 'grok-3',            provider: 'xAI',       name: 'Grok 3',             ctx: '131K',  type: 'Text',       release: '2025-02-01', pricing: { in: 3,     out: 15   }, features: ['Streaming','Real-time data'], desc: "xAI's flagship model with live internet access." },
  { id: 'grok-3-mini',       provider: 'xAI',       name: 'Grok 3 Mini',        ctx: '131K',  type: 'Text',       release: '2025-02-01', pricing: { in: 0.3,   out: 0.5  }, features: ['Streaming','Thinking mode'], desc: 'Compact reasoning model from xAI.' },
  // OpenRouter (meta-provider)
  { id: 'or-auto',           provider: 'OpenRouter',name: 'Auto Router',        ctx: 'Varies',type: 'Text',       release: '2024-01-01', pricing: { in: 0,     out: 0    }, features: ['Dynamic routing','Best price'], desc: 'Automatically routes to the best available model.' },
  // Perplexity
  { id: 'sonar-pro',         provider: 'Perplexity',name: 'Sonar Pro',          ctx: '200K',  type: 'Text',       release: '2025-01-01', pricing: { in: 3,     out: 15   }, features: ['Streaming','Web search','Citations'], desc: 'Advanced online model with real-time web access.' },
  { id: 'sonar',             provider: 'Perplexity',name: 'Sonar',              ctx: '200K',  type: 'Text',       release: '2025-01-01', pricing: { in: 1,     out: 1    }, features: ['Web search','Citations'], desc: 'Fast online model with live search grounding.' },
];

const PROVIDERS = ['All', 'Anthropic', 'OpenAI', 'Google', 'Groq', 'Mistral', 'Deepseek', 'xAI', 'OpenRouter', 'Perplexity'];

const DEFAULTS_ENABLED = new Set(['claude-sonnet-4-5', 'gemini-2.5-pro', 'gpt-4o']);

const FEATURE_COLORS: Record<string, string> = {
  'Vision':          'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]',
  'Streaming':       'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1]',
  'Thinking mode':   'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-[#8b5cf6]',
  'Prompt caching':  'bg-[#14b8a6]/10 border-[#14b8a6]/30 text-[#14b8a6]',
  'Function calling':'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]',
  'Background mode': 'bg-[#ec4899]/10 border-[#ec4899]/30 text-[#ec4899]',
  'Long context':    'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]',
  'Web search':      'bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-[#0ea5e9]',
  'Citations':       'bg-[#84cc16]/10 border-[#84cc16]/30 text-[#84cc16]',
  'Real-time data':  'bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-[#0ea5e9]',
  'Fast inference':  'bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]',
  'Native audio':    'bg-[#a855f7]/10 border-[#a855f7]/30 text-[#a855f7]',
  '80+ languages':   'bg-[#14b8a6]/10 border-[#14b8a6]/30 text-[#14b8a6]',
  'Dynamic routing': 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1]',
  'Best price':      'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]',
  'Code execution':  'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]',
};

const featureClass = (f: string) => FEATURE_COLORS[f] ?? 'bg-[#1e2836] border-[#30363d] text-[#8b949e]';

export default function ModelsPanel() {
  const [search, setSearch]         = useState('');
  const [filterProvider, setFilter] = useState('All');
  const [enabled, setEnabled]       = useState<Set<string>>(new Set(DEFAULTS_ENABLED));
  const [selected, setSelected]     = useState<ModelRow>(ALL_MODELS[1]);
  const [tab, setTab]               = useState<'overview' | 'parameters'>('overview');

  const filtered = ALL_MODELS.filter(m => {
    const q = search.toLowerCase();
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
    const matchP = filterProvider === 'All' || m.provider === filterProvider;
    return matchQ && matchP;
  });

  const providerCount: Record<string, number> = {};
  for (const m of ALL_MODELS) providerCount[m.provider] = (providerCount[m.provider] ?? 0) + 1;

  function toggle(id: string) {
    setEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">

      {/* ── Left: Provider list ──────────────────────────────────────────── */}
      <div className="w-52 shrink-0 overflow-y-auto border-r border-[var(--bg-border)] bg-[var(--bg-base)]">
        <div className="p-4">
          <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">Providers</p>
          <div className="space-y-0.5">
            {PROVIDERS.map(p => {
              const count = p === 'All' ? ALL_MODELS.length : (providerCount[p] ?? 0);
              const enabledCount = p === 'All' ? enabled.size : ALL_MODELS.filter(m => m.provider === p && enabled.has(m.id)).length;
              const active = filterProvider === p;
              return (
                <button key={p} onClick={() => setFilter(p)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 transition-all ${active ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] ring-1 ring-white/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
                  {p !== 'All' ? (
                    <span className="shrink-0"><ProviderLogo provider={p} size={18} /></span>
                  ) : (
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#1e2836] text-[9px] font-bold text-[#8b949e]">✦</span>
                  )}
                  <span className="flex-1 truncate text-xs font-semibold text-left">{p}</span>
                  <span className={`text-[10px] font-semibold ${active ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                    {enabledCount}/{count}
                  </span>
                </button>
              );
            })}
          </div>

          {enabled.size > 0 && (
            <div className="mt-5">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">Enabled ({enabled.size})</p>
              <div className="space-y-0.5">
                {ALL_MODELS.filter(m => enabled.has(m.id)).map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
                    <ProviderLogo provider={logoProvider(m)} size={12} />
                    <span className="truncate text-[10px] text-[#8b949e]">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Model list ───────────────────────────────────────────── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-[var(--bg-border)] bg-[var(--bg-base)]">
        <div className="border-b border-[var(--bg-border)] p-3">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b949e]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models…"
              className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--text-muted)] focus:outline-none" />
          </div>
          <p className="mt-1.5 text-[10px] text-[#8b949e]">Showing {filtered.length} of {ALL_MODELS.length} models</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(m => {
            const isEnabled = enabled.has(m.id);
            const isSelected = selected.id === m.id;
            return (
              <div key={m.id} role="button" tabIndex={0}
                onClick={() => setSelected(m)}
                onKeyDown={e => e.key === 'Enter' && setSelected(m)}
                className={`group flex w-full cursor-pointer items-center gap-3 border-b border-[var(--bg-border)] px-4 py-3 transition-all hover:bg-[var(--bg-hover)] ${isSelected ? 'bg-[var(--bg-elevated)]' : ''}`}>
                {/* Provider logo */}
                <div className="shrink-0 rounded-lg overflow-hidden">
                  <ProviderLogo provider={logoProvider(m)} size={30} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs font-semibold text-[#e6edf3]">{m.name}</p>
                    {isEnabled && <IconCheck className="h-3 w-3 shrink-0 text-[#22c55e]" strokeWidth={2.5} />}
                  </div>
                  <p className="text-[10px] text-[#8b949e]">{m.ctx} context</p>
                </div>
                {/* Toggle */}
                <div role="switch" aria-checked={isEnabled} tabIndex={0}
                  onClick={e => { e.stopPropagation(); toggle(m.id); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggle(m.id); } }}
                  className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${isEnabled ? 'bg-[var(--text-primary)]' : 'bg-[var(--bg-hover)]'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-transform ${isEnabled ? 'translate-x-4 bg-[var(--bg-base)]' : 'translate-x-0.5 bg-[var(--text-muted)]'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Model detail ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-base)]">
        {selected && (
          <div className="max-w-2xl p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-2xl overflow-hidden shadow-lg">
                  <ProviderLogo provider={logoProvider(selected)} size={48} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#e6edf3]">{selected.name}</h2>
                    {enabled.has(selected.id) && (
                      <span className="rounded-md bg-[#22c55e]/10 border border-[#22c55e]/20 px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">✓ Enabled</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[#8b949e]">{selected.desc}</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2 text-xs font-semibold text-[#e6edf3] hover:border-[#3b82f6]/50 transition-all shrink-0">
                <IconPlus className="h-3.5 w-3.5" />
                Add custom model
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--bg-border)] mb-6">
              {(['overview', 'parameters'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-all ${
                    tab === t ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}>
                  {t === 'overview' ? 'Overview' : 'Parameters'}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <>
                {/* Detail rows */}
                <div className="fe-soft-aura mb-6 overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)]">
                  {[
                    {
                      label: 'Model ID',
                      value: <code className="text-xs font-mono text-[#3b82f6] bg-[#3b82f6]/5 rounded px-2 py-0.5">{selected.id}</code>
                    },
                    ...(selected.brandForLogo
                      ? [
                          {
                            label: 'Model family',
                            value: (
                              <div className="flex items-center gap-2">
                                <ProviderLogo provider={selected.brandForLogo} size={16} />
                                <span className="text-sm font-semibold text-[#e6edf3]">{selected.brandForLogo}</span>
                              </div>
                            ),
                          },
                          {
                            label: 'API host',
                            value: (
                              <div className="flex items-center gap-2">
                                <ProviderLogo provider={selected.provider} size={16} />
                                <span className="text-sm font-semibold text-[#e6edf3]">{selected.provider}</span>
                              </div>
                            ),
                          },
                        ]
                      : [
                          {
                            label: 'Provider',
                            value: (
                              <div className="flex items-center gap-2">
                                <ProviderLogo provider={selected.provider} size={16} />
                                <span className="text-sm font-semibold text-[#e6edf3]">{selected.provider}</span>
                              </div>
                            ),
                          },
                        ]),
                    { label: 'Context length', value: <span className="text-sm text-[#e6edf3]">{selected.ctx}</span> },
                    { label: 'Type',            value: <span className="text-sm text-[#e6edf3]">{selected.type}</span> },
                    { label: 'Release date',    value: <span className="text-sm text-[#e6edf3]">{selected.release}</span> },
                    {
                      label: 'Pricing /1M tokens',
                      value: selected.pricing.in === 0 ? (
                        <span className="text-xs font-semibold text-[#22c55e]">Free / routed</span>
                      ) : (
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-[#22c55e]">↑ <span className="font-mono font-semibold">${selected.pricing.in.toFixed(2)}</span> input</span>
                          <span className="text-[#3b82f6]">↓ <span className="font-mono font-semibold">${selected.pricing.out.toFixed(2)}</span> output</span>
                        </div>
                      )
                    },
                    {
                      label: 'Features',
                      value: (
                        <div className="flex flex-wrap gap-1.5">
                          {selected.features.map(f => (
                            <span key={f} className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${featureClass(f)}`}>{f}</span>
                          ))}
                        </div>
                      )
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-4 border-b border-[var(--bg-border)] px-5 py-3.5 last:border-0">
                      <span className="w-36 shrink-0 pt-0.5 text-xs font-semibold text-[var(--text-muted)]">{label}</span>
                      {value}
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <button onClick={() => toggle(selected.id)}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                    enabled.has(selected.id)
                      ? 'border border-[#ef4444]/30 bg-[#ef4444]/5 text-[#ef4444] hover:bg-[#ef4444]/10'
                      : 'bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm hover:opacity-90 hover:-translate-y-0.5'
                  }`}>
                  {enabled.has(selected.id) ? 'Disable Model' : 'Enable Model'}
                  <IconChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {tab === 'parameters' && (
              <div className="space-y-4">
                {[
                  { label: 'Temperature', min: 0, max: 2, step: 0.01, default: 1, desc: 'Controls randomness. Higher = more creative.' },
                  { label: 'Max tokens',  min: 256, max: 8192, step: 64, default: 2048, desc: 'Maximum output length in tokens.' },
                  { label: 'Top P',       min: 0, max: 1, step: 0.01, default: 1, desc: 'Nucleus sampling probability threshold.' },
                ].map(p => (
                  <div key={p.label} className="rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-[#e6edf3]">{p.label}</p>
                      <span className="text-xs font-mono text-[var(--text-secondary)]">{p.default}</span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] mb-3">{p.desc}</p>
                    <input type="range" min={p.min} max={p.max} step={p.step} defaultValue={p.default}
                      className="w-full cursor-pointer"
                      style={{ accentColor: 'var(--text-muted)' }} />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#8b949e]">{p.min}</span>
                      <span className="text-[10px] text-[#8b949e]">{p.max}</span>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
                  <p className="text-sm font-semibold text-[#e6edf3] mb-1">System Prompt Override</p>
                  <p className="text-[11px] text-[#8b949e] mb-3">Override the default system prompt for this model only.</p>
                  <textarea rows={4} placeholder="Leave empty to use default system prompt…"
                    className="w-full resize-none rounded-xl border border-[#1e2836] bg-[#0d1117] p-3 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
