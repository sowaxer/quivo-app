'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { IconEye, IconEyeOff, IconCheck, IconX, IconLoader2, IconExternalLink, IconChevronDown, IconChevronUp, IconTrash, IconRefresh, IconRobot, IconTool, IconLink } from '@tabler/icons-react';
import { ProviderBrandMark } from '@/components/provider-brand-icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LS_EXTRA = 'finedge_extra_keys';

function loadExtra(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_EXTRA) ?? '{}'); } catch { return {}; }
}
function saveExtra(data: Record<string, string>) {
  localStorage.setItem(LS_EXTRA, JSON.stringify(data));
}

interface KS { input: string; masked: string | null; has: boolean; saving: boolean; testing: boolean; testResult: { ok: boolean; msg: string } | null; show: boolean; howOpen: boolean; }
const mk = (): KS => ({ input: '', masked: null, has: false, saving: false, testing: false, testResult: null, show: false, howOpen: false });

// ─── Provider definitions ──────────────────────────────────────────────────────
const AI_PROVIDERS = [
  {
    id: 'anthropic', field: 'anthropic_key', storage: 'server',
    name: 'Anthropic Claude',
    badge: 'Recommended',  badgeColor: 'text-emerald-200/90 bg-emerald-400/[0.08] border-emerald-300/20',
    models: 'claude-sonnet-4.5 · claude-opus-4 · claude-haiku-4.5',
    desc: 'Best for accounting analysis, legal reasoning, and long documents.',
    prefix: 'sk-ant-api03-',
    url: 'https://console.anthropic.com/settings/keys',
    testable: true,
    how: `1. Go to console.anthropic.com and sign up\n2. Add a payment method (pay-as-you-go)\n3. Click Settings → API Keys → Create Key\n4. Copy the key starting with sk-ant-api03-\n5. Paste it here and click Save`,
  },
  {
    id: 'google_ai', field: 'google_ai_key', storage: 'server',
    name: 'Google Gemini',
    badge: 'Free tier', badgeColor: 'text-sky-200/90 bg-sky-400/[0.08] border-sky-300/20',
    models: 'gemini-2.5-pro · gemini-2.5-flash · gemini-1.5-pro (1.5M ctx)',
    desc: 'Ideal for very long documents, spreadsheets, and multimodal analysis.',
    prefix: 'AIzaSy',
    url: 'https://aistudio.google.com/app/apikey',
    testable: true,
    how: `1. Go to aistudio.google.com\n2. Sign in with your Google account\n3. Click Get API key → Create API key in new project\n4. Copy the key starting with AIzaSy\n5. Paste it here and click Save`,
  },
  {
    id: 'openai', field: 'openai_key', storage: 'server',
    name: 'OpenAI GPT',
    badge: '', badgeColor: '',
    models: 'gpt-4o · gpt-4.1 · o3 · o4-mini',
    desc: 'Great for multimodal tasks, structured output, and code generation.',
    prefix: 'sk-',
    url: 'https://platform.openai.com/api-keys',
    testable: true,
    how: `1. Go to platform.openai.com\n2. Click API Keys → Create new secret key\n3. Copy the key starting with sk-\n4. Paste it here and click Save`,
  },
  {
    id: 'groq', field: 'groq_key', storage: 'local',
    name: 'Groq (Ultra-Fast)',
    badge: 'Free tier', badgeColor: 'text-sky-200/90 bg-sky-400/[0.08] border-sky-300/20',
    models: 'llama-3.3-70b · mixtral-8x7b · gemma2-9b',
    desc: 'Lightning-fast inference via Groq LPU. Best for real-time tasks.',
    prefix: 'gsk_',
    url: 'https://console.groq.com/keys',
    testable: false,
    how: `1. Go to console.groq.com\n2. Sign up or log in\n3. Click API Keys → Create API Key\n4. Copy the key starting with gsk_\n5. Paste it here and click Save`,
  },
  {
    id: 'mistral', field: 'mistral_key', storage: 'local',
    name: 'Mistral AI',
    badge: '', badgeColor: '',
    models: 'mistral-large-2 · mistral-small-3 · codestral',
    desc: 'European AI with strong multilingual and coding capabilities.',
    prefix: '',
    url: 'https://console.mistral.ai/api-keys/',
    testable: false,
    how: `1. Go to console.mistral.ai\n2. Sign up or log in\n3. Click API Keys → Create new key\n4. Copy the key\n5. Paste it here and click Save`,
  },
  {
    id: 'openrouter', field: 'openrouter_key', storage: 'local',
    name: 'OpenRouter', logo: '🟣',
    badge: 'Multi-provider', badgeColor: 'text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30',
    models: 'Aggregates 300+ models from all providers',
    desc: 'One API key to access models from every provider. Pay-as-you-go.',
    prefix: 'sk-or-',
    url: 'https://openrouter.ai/keys',
    testable: false,
    how: `1. Go to openrouter.ai\n2. Sign in with Google or GitHub\n3. Click Keys → Create Key\n4. Copy the key starting with sk-or-\n5. Paste it here and click Save`,
  },
  {
    id: 'perplexity', field: 'perplexity_key', storage: 'local',
    name: 'Perplexity AI',
    badge: 'Web search', badgeColor: 'text-cyan-200/85 bg-cyan-400/[0.08] border-cyan-300/20',
    models: 'sonar-pro · sonar',
    desc: 'Real-time web search with citations. Great for current IRS rules and news.',
    prefix: 'pplx-',
    url: 'https://www.perplexity.ai/settings/api',
    testable: false,
    how: `1. Go to perplexity.ai and sign up for a paid plan\n2. Go to Settings → API\n3. Generate API key starting with pplx-\n4. Paste it here and click Save`,
  },
  {
    id: 'xai', field: 'xai_key', storage: 'local',
    name: 'xAI Grok',
    badge: '', badgeColor: '',
    models: 'grok-3 · grok-3-mini',
    desc: 'Elon Musk\'s AI with real-time X (Twitter) data access.',
    prefix: 'xai-',
    url: 'https://console.x.ai/',
    testable: false,
    how: `1. Go to console.x.ai\n2. Sign in and create an account\n3. Click API Keys → Create key\n4. Copy the key starting with xai-\n5. Paste it here and click Save`,
  },
];

const TOOL_PROVIDERS = [
  {
    id: 'tavily', field: 'tavily_key', storage: 'server',
    name: 'Tavily Search',
    badge: '1,000 free/mo', badgeColor: 'text-emerald-200/90 bg-emerald-400/[0.08] border-emerald-300/20',
    models: 'Real-time web search API',
    desc: 'Enables the AI to search the web in real-time. Used for IRS updates, market data, and news.',
    prefix: 'tvly-',
    url: 'https://tavily.com/#api',
    testable: false,
    how: `1. Go to tavily.com and sign up (free)\n2. Go to your Dashboard\n3. Copy the API key starting with tvly-\n4. Paste it here and click Save`,
  },
  {
    id: 'twilio_sid', field: 'twilio_sid', storage: 'local',
    name: 'Twilio (Account SID)',
    badge: '', badgeColor: '',
    models: 'SMS · Voice · WhatsApp notifications',
    desc: 'Send automated SMS alerts, payment reminders, and client notifications.',
    prefix: 'AC',
    url: 'https://console.twilio.com/',
    testable: false,
    how: `1. Go to console.twilio.com and sign up\n2. Your Account SID is on the dashboard (starts with AC)\n3. Copy it and paste here\n4. Also add your Auth Token below`,
  },
  {
    id: 'twilio_token', field: 'twilio_token', storage: 'local',
    name: 'Twilio (Auth Token)',
    badge: '', badgeColor: '',
    models: 'Required alongside Account SID',
    desc: 'The secret token that authenticates your Twilio requests.',
    prefix: '',
    url: 'https://console.twilio.com/',
    testable: false,
    how: `1. Found on your Twilio console dashboard\n2. Click "Show" next to Auth Token\n3. Copy and paste here`,
  },
  {
    id: 'sendgrid', field: 'sendgrid_key', storage: 'local',
    name: 'SendGrid Email',
    badge: '100 free/day', badgeColor: 'text-emerald-200/90 bg-emerald-400/[0.08] border-emerald-300/20',
    models: 'Transactional email API',
    desc: 'Send automated email reports, invoices, and notifications to clients.',
    prefix: 'SG.',
    url: 'https://app.sendgrid.com/settings/api_keys',
    testable: false,
    how: `1. Go to app.sendgrid.com and sign up\n2. Go to Settings → API Keys → Create API Key\n3. Copy the key starting with SG.\n4. Paste it here and click Save`,
  },
];

const INTEGRATION_PROVIDERS = [
  {
    id: 'stripe_secret', field: 'stripe_secret', storage: 'server',
    name: 'Stripe Secret Key',
    badge: 'Required for Billing', badgeColor: 'text-violet-200/85 bg-violet-400/[0.08] border-violet-300/20',
    models: 'Billing panel · Revenue reports · Subscriptions',
    desc: 'Access your Stripe account to monitor payments and subscriptions. Use a restricted key.',
    prefix: 'sk_',
    url: 'https://dashboard.stripe.com/apikeys',
    testable: false,
    how: `⚠️ Use a RESTRICTED key with read-only permissions:\n1. Go to dashboard.stripe.com/apikeys\n2. Click Create restricted key\n3. Enable only "read" permissions\n4. Copy the key starting with rk_\n5. Paste it here`,
  },
  {
    id: 'stripe_pub', field: 'stripe_pub', storage: 'server',
    name: 'Stripe Public Key',
    badge: '', badgeColor: '',
    models: 'Frontend payment forms',
    desc: 'Your publishable Stripe key for client-side payment elements.',
    prefix: 'pk_',
    url: 'https://dashboard.stripe.com/apikeys',
    testable: false,
    how: `1. Go to dashboard.stripe.com/apikeys\n2. Copy your Publishable key starting with pk_live_ or pk_test_\n3. Paste it here`,
  },
  {
    id: 'notion', field: 'notion_token', storage: 'server',
    name: 'Notion Integration',
    badge: '', badgeColor: '',
    models: 'Sync Notion pages to Knowledge Base',
    desc: 'Import Notion pages and databases directly into your Knowledge Base for RAG.',
    prefix: 'secret_',
    url: 'https://www.notion.so/my-integrations',
    testable: false,
    how: `1. Go to notion.so/my-integrations\n2. Click New integration\n3. Name it "Finedge" and select your workspace\n4. Copy the Internal Integration Token starting with secret_\n5. Paste it here`,
  },
  {
    id: 'github', field: 'github_token', storage: 'local',
    name: 'GitHub Token',
    badge: '', badgeColor: '',
    models: 'Import private repos to Knowledge Base',
    desc: 'Access private GitHub repositories for Knowledge Base ingestion.',
    prefix: 'ghp_',
    url: 'https://github.com/settings/tokens/new',
    testable: false,
    how: `1. Go to github.com/settings/tokens/new\n2. Select "repo" scope\n3. Generate token starting with ghp_\n4. Paste it here`,
  },
];

type ProviderDef = typeof AI_PROVIDERS[0];

// ─── Provider avatar (real brand mark) ────────────────────────────────────────
function ProviderAvatar({ id, size = 40 }: { id: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      style={{ width: size, height: size }}
    >
      <ProviderBrandMark id={id} size={Math.round(size * 0.58)} />
    </div>
  );
}

// ─── Single key row ───────────────────────────────────────────────────────────
function KeyRow({
  prov, state, onChange, onSave, onRemove, onTest, onToggleShow, onToggleHow,
}: {
  prov: ProviderDef;
  state: KS;
  onChange: (v: string) => void;
  onSave: () => void;
  onRemove: () => void;
  onTest: () => void;
  onToggleShow: () => void;
  onToggleHow: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-card)] overflow-hidden transition-all hover:border-white/[0.12]">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <ProviderAvatar id={prov.id} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{prov.name}</p>
            {prov.badge && (
              <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${prov.badgeColor}`}>
                {prov.badge}
              </span>
            )}
            {state.has && (
              <span className="flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-400/[0.08] px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200/95">
                <IconCheck className="h-2.5 w-2.5" strokeWidth={3} /> Connected
              </span>
            )}
            {!state.has && (
              <span className="flex items-center gap-1 rounded-md border border-rose-300/25 bg-rose-400/[0.08] px-1.5 py-0.5 text-[9px] font-semibold text-rose-200/95">
                <IconX className="h-2.5 w-2.5" strokeWidth={3} /> Not connected
              </span>
            )}
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">{prov.models}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-muted)]">{prov.desc}</p>
        </div>
        <a href={prov.url} target="_blank" rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] hover:bg-white/[0.1] transition-all">
          Get API key <IconExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>

      {/* Input row */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={state.show ? 'text' : 'password'}
              value={state.has && !state.input ? (state.masked ?? '') : state.input}
              onChange={e => onChange(e.target.value)}
              placeholder={state.has ? `${prov.prefix}••••••••••••••••••••` : `Paste your ${prov.name} API key here…`}
              className="w-full rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] py-2.5 pl-4 pr-10 text-[13px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[color-mix(in_srgb,var(--finedge-accent)_45%,transparent)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--finedge-accent)_35%,transparent)] transition-all"
            />
            <button onClick={onToggleShow}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              {state.show ? <IconEyeOff className="h-3.5 w-3.5" /> : <IconEye className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Save */}
          <button onClick={onSave} disabled={state.saving || !state.input.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--finedge-accent)_85%,#2a3038)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100">
            {state.saving ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconCheck className="h-3.5 w-3.5" />}
            Save
          </button>

          {/* Test */}
          {prov.testable && state.has && (
            <button onClick={onTest} disabled={state.testing}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-[var(--text-primary)] transition-all disabled:opacity-40">
              {state.testing ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconRefresh className="h-3.5 w-3.5" />}
              Test
            </button>
          )}

          {/* Remove */}
          {state.has && (
            <button onClick={onRemove}
              className="flex items-center gap-1 rounded-xl border border-rose-300/20 bg-rose-500/[0.06] px-3 py-2.5 text-[12px] text-rose-200/90 hover:bg-rose-500/[0.12] transition-all">
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Test result */}
        {state.testResult && (
          <p className={`mt-2 text-[11px] font-medium flex items-center gap-1.5 ${state.testResult.ok ? 'text-emerald-200/95' : 'text-rose-200/95'}`}>
            {state.testResult.ok ? <IconCheck className="h-3 w-3" /> : <IconX className="h-3 w-3" />}
            {state.testResult.msg ?? (state.testResult.ok ? 'Connection successful!' : 'Connection failed')}
          </p>
        )}

        {/* How to get */}
        <button onClick={onToggleHow}
          className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
          {state.howOpen ? <IconChevronUp className="h-3 w-3" /> : <IconChevronDown className="h-3 w-3" />}
          How to get this key
        </button>
        {state.howOpen && (
          <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-[var(--bg-surface)] p-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {prov.how}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[var(--text-secondary)]">
        {icon}
      </div>
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h2>
        <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-secondary)]">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ApiKeysPanel() {
  const [states, setStates] = useState<Record<string, KS>>({});
  const [loading, setLoading] = useState(true);

  const setOne = useCallback((id: string, patch: Partial<KS>) => {
    setStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? mk()), ...patch } }));
  }, []);

  // ── Load all keys ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user-keys', { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        // Server keys
        setOne('anthropic',    { has: !!d.has.anthropic,  masked: null });
        setOne('google_ai',    { has: !!d.has.google_ai,  masked: null });
        setOne('openai',       { has: !!d.has.openai,     masked: null });
        setOne('stripe_secret',{ has: !!d.has.stripe,     masked: null });
        setOne('stripe_pub',   { has: !!d.has.stripe_pub, masked: null });
        setOne('tavily',       { has: !!d.has.tavily,     masked: null });
        setOne('notion',       { has: !!d.has.notion,     masked: null });
      }
    } catch {/* ignore */} finally {
      setLoading(false);
    }
    // Local keys
    const extra = loadExtra();
    for (const [k, v] of Object.entries(extra)) {
      if (v) setOne(k, { has: true, masked: v.slice(0, 6) + '••••••••' + v.slice(-4) });
    }
  }, [setOne]);

  useEffect(() => { load(); }, [load]);

  // ── Save handler ─────────────────────────────────────────────────────────
  async function save(prov: ProviderDef, state: KS) {
    const val = state.input.trim();
    if (!val) return;
    setOne(prov.id, { saving: true });

    if (prov.storage === 'server') {
      await fetch('/api/user-keys', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [prov.field]: val }),
      });
    } else {
      const extra = loadExtra();
      extra[prov.id] = val;
      saveExtra(extra);
    }
    setOne(prov.id, { saving: false, has: true, input: '', masked: val.slice(0, 6) + '••••••••' + val.slice(-4), testResult: null });
  }

  // ── Remove handler ───────────────────────────────────────────────────────
  async function remove(prov: ProviderDef) {
    if (prov.storage === 'server') {
      await fetch('/api/user-keys', {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: prov.field }),
      });
    } else {
      const extra = loadExtra();
      delete extra[prov.id];
      saveExtra(extra);
    }
    setOne(prov.id, mk());
  }

  // ── Test handler ─────────────────────────────────────────────────────────
  async function test(provId: string) {
    setOne(provId, { testing: true, testResult: null });
    const res = await fetch('/api/user-keys/test', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: provId }),
    });
    const result = await res.json();
    setOne(provId, {
      testing: false,
      testResult: {
        ok: !!result.success,
        msg: result.message ?? (result.success ? 'OK' : 'Failed'),
      },
    });
  }

  const st = (id: string): KS => states[id] ?? mk();
  const connectedCount = Object.values(states).filter(s => s.has).length;
  const totalCount = AI_PROVIDERS.length + TOOL_PROVIDERS.length + INTEGRATION_PROVIDERS.length;

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-base)]">
      <div className="mx-auto max-w-2xl px-6 py-10">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">API Keys</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            Finedge connects your tools. We <strong className="font-semibold text-[var(--text-primary)]">never charge for AI usage</strong> — you pay each provider directly, at their price.
          </p>

          {/* How it works cards */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { title: 'You add keys', desc: 'From Claude, Google, OpenAI, and more.', tone: 'from-sky-400/15 to-violet-400/10' },
              { title: 'We connect them', desc: 'Chat, agents, and automations use your keys.', tone: 'from-violet-400/15 to-rose-400/10' },
              { title: 'You pay providers', desc: 'Only the services you use — not Finedge.', tone: 'from-emerald-400/15 to-sky-400/10' },
            ].map(c => (
              <div key={c.title} className={`rounded-2xl border border-white/[0.08] bg-gradient-to-br ${c.tone} p-4`}>
                <p className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{c.title}</p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--text-secondary)]">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[var(--bg-card)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-300/80" />
              <p className="text-[13px] text-[var(--text-secondary)]">
                <strong className="font-semibold text-[var(--text-primary)]">{loading ? '…' : connectedCount}</strong> of {totalCount} providers connected
              </p>
            </div>
            <p className="text-[12px] text-emerald-200/80">Keys are encrypted. You can remove them anytime.</p>
          </div>
        </div>

        {/* ── AI Providers ───────────────────────────────────────────────── */}
        <div className="mb-10">
          <SectionHeader
            icon={<IconRobot className="h-5 w-5" stroke={1.5} />}
            title="AI providers"
            desc="Add at least one model key to use chat and agents."
          />
          <div className="space-y-3">
            {AI_PROVIDERS.map(prov => (
              <KeyRow key={prov.id} prov={prov} state={st(prov.id)}
                onChange={v => setOne(prov.id, { input: v, testResult: null })}
                onSave={() => save(prov, st(prov.id))}
                onRemove={() => remove(prov)}
                onTest={() => test(prov.id)}
                onToggleShow={() => setOne(prov.id, { show: !st(prov.id).show })}
                onToggleHow={() => setOne(prov.id, { howOpen: !st(prov.id).howOpen })}
              />
            ))}
          </div>
        </div>

        {/* ── Tools & Search ─────────────────────────────────────────────── */}
        <div className="mb-10">
          <SectionHeader
            icon={<IconTool className="h-5 w-5" stroke={1.5} />}
            title="Tools & messages"
            desc="Web search, SMS, and email — optional, add when you need them."
          />
          <div className="space-y-3">
            {TOOL_PROVIDERS.map(prov => (
              <KeyRow key={prov.id} prov={prov} state={st(prov.id)}
                onChange={v => setOne(prov.id, { input: v, testResult: null })}
                onSave={() => save(prov, st(prov.id))}
                onRemove={() => remove(prov)}
                onTest={() => test(prov.id)}
                onToggleShow={() => setOne(prov.id, { show: !st(prov.id).show })}
                onToggleHow={() => setOne(prov.id, { howOpen: !st(prov.id).howOpen })}
              />
            ))}
          </div>
        </div>

        {/* ── Integrations ───────────────────────────────────────────────── */}
        <div className="mb-10">
          <SectionHeader
            icon={<IconLink className="h-5 w-5" stroke={1.5} />}
            title="Business integrations"
            desc="Billing and knowledge sources (Stripe, Notion, GitHub)."
          />
          <div className="space-y-3">
            {INTEGRATION_PROVIDERS.map(prov => (
              <KeyRow key={prov.id} prov={prov} state={st(prov.id)}
                onChange={v => setOne(prov.id, { input: v, testResult: null })}
                onSave={() => save(prov, st(prov.id))}
                onRemove={() => remove(prov)}
                onTest={() => test(prov.id)}
                onToggleShow={() => setOne(prov.id, { show: !st(prov.id).show })}
                onToggleHow={() => setOne(prov.id, { howOpen: !st(prov.id).howOpen })}
              />
            ))}
          </div>
        </div>

        {/* ── Footer note ────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.08] bg-emerald-500/[0.06] p-4 text-center">
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Server keys use <strong className="font-medium text-[var(--text-primary)]">encrypted storage</strong>. Local keys stay in this browser. You can delete any key whenever you like.
          </p>
        </div>

      </div>
    </div>
  );
}
