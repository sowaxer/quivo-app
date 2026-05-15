'use client';

import { mirrorVaultFieldToAgentStorage } from '@/lib/agent-keys-sync';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { IconEye, IconEyeOff, IconCheck, IconX, IconLoader2, IconExternalLink, IconChevronDown, IconChevronUp, IconTrash, IconRefresh, IconRobot, IconTool, IconLink, IconLock } from '@tabler/icons-react';
import { ProviderBrandMark } from '@/components/provider-brand-icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LS_EXTRA = 'quivo_extra_keys';

function loadExtra(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_EXTRA) ?? '{}'); } catch { return {}; }
}
function saveExtra(data: Record<string, string>) {
  localStorage.setItem(LS_EXTRA, JSON.stringify(data));
}

interface KS {
  input: string;
  masked: string | null;
  has: boolean;
  saving: boolean;
  testing: boolean;
  testResult: { ok: boolean; msg: string } | null;
  show: boolean;
  howOpen: boolean;
  saveError: string | null;
}
const mk = (): KS => ({
  input: '',
  masked: null,
  has: false,
  saving: false,
  testing: false,
  testResult: null,
  show: false,
  howOpen: false,
  saveError: null,
});

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
    id: 'deepseek', field: 'deepseek_key', storage: 'server',
    name: 'DeepSeek',
    badge: 'Cheap & powerful', badgeColor: 'text-sky-200/90 bg-sky-500/15 border-sky-400/25',
    models: 'deepseek-chat · deepseek-reasoner (R1)',
    desc: 'Best for complex reasoning at low cost. OpenAI-compatible API.',
    prefix: 'sk-',
    url: 'https://platform.deepseek.com/api_keys',
    testable: true,
    how: `1. Go to platform.deepseek.com and sign in\n2. Open API keys → Create key\n3. Copy the key starting with sk-\n4. Paste here — requests go to https://api.deepseek.com`,
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
    how: `1. Go to notion.so/my-integrations\n2. Click New integration\n3. Name it "Quivo" and select your workspace\n4. Copy the Internal Integration Token starting with secret_\n5. Paste it here`,
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

const AI_PRIMARY = AI_PROVIDERS.filter(p =>
  ['anthropic', 'google_ai', 'openai', 'deepseek'].includes(p.id),
);
const AI_MORE = AI_PROVIDERS.filter(
  p => !['anthropic', 'google_ai', 'openai', 'deepseek'].includes(p.id),
);

type ProviderDef =
  | (typeof AI_PROVIDERS)[number]
  | (typeof TOOL_PROVIDERS)[number]
  | (typeof INTEGRATION_PROVIDERS)[number];

// ─── Provider avatar (real brand mark) ────────────────────────────────────────
function ProviderAvatar({ id, size = 40 }: { id: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      style={{ width: size, height: size }}
    >
      <ProviderBrandMark id={id} size={Math.round(size * 0.58)} />
    </div>
  );
}

function leftAccentClass(id: string): string {
  const m: Record<string, string> = {
    anthropic: 'border-l-orange-500/55',
    google_ai: 'border-l-sky-500/50',
    openai: 'border-l-emerald-500/50',
    deepseek: 'border-l-blue-600/60',
    groq: 'border-l-amber-500/40',
    mistral: 'border-l-orange-300/35',
    openrouter: 'border-l-violet-500/45',
    perplexity: 'border-l-cyan-500/40',
    xai: 'border-l-zinc-400/40',
    tavily: 'border-l-teal-500/45',
    twilio_sid: 'border-l-red-400/35',
    twilio_token: 'border-l-red-400/35',
    sendgrid: 'border-l-blue-400/40',
    stripe_secret: 'border-l-indigo-500/50',
    stripe_pub: 'border-l-violet-400/45',
    notion: 'border-l-stone-400/40',
    github: 'border-l-gray-500/45',
  };
  return m[id] ?? 'border-l-white/[0.08]';
}

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
    <div
      className={`rounded-2xl border border-y border-r border-[var(--bg-border)] border-l-4 bg-[var(--bg-card)] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:opacity-[0.98] ${leftAccentClass(prov.id)}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <ProviderAvatar id={prov.id} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{prov.name}</p>
            {prov.id === 'anthropic' && prov.badge ? (
              <span className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                {prov.badge}
              </span>
            ) : (
              prov.badge && (
                <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${prov.badgeColor}`}>
                  {prov.badge}
                </span>
              )
            )}
            {state.has && (
              <span className="flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/[0.08] px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200/95 shadow-[0_0_14px_rgba(52,211,153,0.22)]">
                <IconCheck className="h-2.5 w-2.5" strokeWidth={3} /> Connected
              </span>
            )}
            {!state.has && (
              <span className="flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-400/[0.08] px-1.5 py-0.5 text-[9px] font-semibold text-rose-200/95 shadow-[0_0_12px_rgba(248,113,113,0.2)]">
                <IconX className="h-2.5 w-2.5" strokeWidth={3} /> Not connected
              </span>
            )}
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">{prov.models}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-muted)]">{prov.desc}</p>
        </div>
        <a href={prov.url} target="_blank" rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--bg-border)] bg-gradient-to-r from-sky-500/12 via-violet-500/10 to-fuchsia-500/12 px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] transition-all hover:from-sky-500/20 hover:via-violet-500/18 hover:to-fuchsia-500/20 dark:text-zinc-200 dark:hover:text-white">
          Get API key <IconExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>

      {/* Input row */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {state.has && (
              <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-emerald-300/85">
                <IconLock className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
            <input
              type={state.show ? 'text' : 'password'}
              value={state.has && !state.input ? (state.masked ?? '') : state.input}
              onChange={e => onChange(e.target.value)}
              placeholder={state.has ? `${prov.prefix}••••••••••••••••••••` : `Paste your ${prov.name} API key here…`}
              className={`w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] py-2.5 pr-10 text-[13px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-violet-400/35 focus:outline-none focus:ring-1 focus:ring-violet-500/25 transition-all ${state.has ? 'pl-10' : 'pl-4'}`}
            />
            <button onClick={onToggleShow}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {state.show ? <IconEyeOff className="h-3.5 w-3.5" /> : <IconEye className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Save */}
          <button onClick={onSave} disabled={state.saving || !state.input.trim()}
            className="quivo-btn-green-glass flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {state.saving ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconCheck className="h-3.5 w-3.5" />}
            Save
          </button>

          {/* Test */}
          {prov.testable && state.has && (
            <button onClick={onTest} disabled={state.testing}
              className="flex items-center gap-1.5 rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-2.5 text-[12px] font-medium text-[var(--text-secondary)] transition-all hover:border-violet-400/25 hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-40">
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

        {state.saveError && (
          <p className="mt-2 text-[12px] font-medium text-rose-300/95">{state.saveError}</p>
        )}

        {/* Test result */}
        {state.testResult && (
          <p className={`mt-2 text-[11px] font-medium flex items-center gap-1.5 ${state.testResult.ok ? 'text-emerald-200/95' : 'text-rose-200/95'}`}>
            {state.testResult.ok ? <IconCheck className="h-3 w-3" /> : <IconX className="h-3 w-3" />}
            {state.testResult.msg ?? (state.testResult.ok ? 'Connection successful!' : 'Connection failed')}
          </p>
        )}

        {/* How to get */}
        <button onClick={onToggleHow}
          className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
          {state.howOpen ? <IconChevronUp className="h-3 w-3" /> : <IconChevronDown className="h-3 w-3" />}
          How to get this key
        </button>
        {state.howOpen && (
          <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
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
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--bg-border)] bg-gradient-to-br from-sky-500/15 via-violet-500/12 to-emerald-500/15 text-[var(--text-muted)]">
        {icon}
      </div>
      <div>
        <h2 className="relative inline-block text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {title}
          <span className="absolute -bottom-1 left-0 h-0.5 w-16 rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400 opacity-90" aria-hidden />
        </h2>
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
        setOne('anthropic', { has: !!d.has.anthropic, masked: d.previews?.anthropic ?? null, saveError: null });
        setOne('google_ai', { has: !!d.has.google_ai, masked: d.previews?.google_ai ?? null, saveError: null });
        setOne('openai', { has: !!d.has.openai, masked: d.previews?.openai ?? null, saveError: null });
        setOne('deepseek', { has: !!d.has.deepseek, masked: d.previews?.deepseek ?? null, saveError: null });
        setOne('stripe_secret', {
          has: !!d.has.stripe,
          masked: d.previews?.stripe_secret ?? null,
          saveError: null,
        });
        setOne('stripe_pub', { has: !!d.has.stripe_pub, masked: d.previews?.stripe_pub ?? null, saveError: null });
        setOne('tavily', { has: !!d.has.tavily, masked: d.previews?.tavily ?? null, saveError: null });
        setOne('notion', { has: !!d.has.notion, masked: d.previews?.notion ?? null, saveError: null });
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
    setOne(prov.id, { saving: true, saveError: null });

    if (prov.storage === 'server') {
      const res = await fetch('/api/user-keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [prov.field]: val }),
      });
      let errMsg: string | null = null;
      type SaveOk = {
        error?: string;
        success?: boolean;
        has?: {
          anthropic?: boolean;
          openai?: boolean;
          google_ai?: boolean;
          deepseek?: boolean;
          stripe?: boolean;
          stripe_pub?: boolean;
          tavily?: boolean;
          notion?: boolean;
        };
        previews?: Record<string, string | null | undefined>;
      };
      let data: SaveOk | null = null;
      try {
        data = (await res.json()) as SaveOk;
        if (!res.ok) errMsg = data?.error ?? `HTTP ${res.status}`;
      } catch {
        if (!res.ok) errMsg = `HTTP ${res.status}`;
      }
      if (errMsg) {
        setOne(prov.id, { saving: false, saveError: errMsg });
        return;
      }
      mirrorVaultFieldToAgentStorage(prov.field, val);
      if (data?.has && data.previews) {
        setOne('anthropic', { has: !!data.has.anthropic, masked: data.previews.anthropic ?? null, saveError: null });
        setOne('google_ai', { has: !!data.has.google_ai, masked: data.previews.google_ai ?? null, saveError: null });
        setOne('openai', { has: !!data.has.openai, masked: data.previews.openai ?? null, saveError: null });
        setOne('deepseek', { has: !!data.has.deepseek, masked: data.previews.deepseek ?? null, saveError: null });
        setOne('stripe_secret', {
          has: !!data.has.stripe,
          masked: data.previews.stripe_secret ?? null,
          saveError: null,
        });
        setOne('stripe_pub', {
          has: !!data.has.stripe_pub,
          masked: data.previews.stripe_pub ?? null,
          saveError: null,
        });
        setOne('tavily', { has: !!data.has.tavily, masked: data.previews.tavily ?? null, saveError: null });
        setOne('notion', { has: !!data.has.notion, masked: data.previews.notion ?? null, saveError: null });
      }
      setOne(prov.id, { saving: false });
    } else {
      const extra = loadExtra();
      extra[prov.id] = val;
      saveExtra(extra);
      setOne(prov.id, { saving: false, saveError: null });
    }
    await load();
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
            Quivo connects your tools. We <strong className="font-semibold text-[var(--text-primary)]">never charge for AI usage</strong> — you pay each provider directly, at their price.
          </p>

          {/* How it works — flat panels (same canvas as rest of app) */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                title: 'You add keys',
                desc: 'From Claude, Google, OpenAI, DeepSeek, and more.',
              },
              {
                title: 'We connect them',
                desc: 'Chat, agents, and automations use your keys.',
              },
              {
                title: 'You pay providers',
                desc: 'Only the services you use — not Quivo.',
              },
            ].map(c => (
              <div
                key={c.title}
                className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-base)] p-4 shadow-none"
              >
                <p className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{c.title}</p>
                <p className="mt-1 text-[12px] leading-snug text-[var(--text-secondary)]">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.55)]" />
                <p className="text-[13px] text-[var(--text-secondary)]">
                  <strong className="font-semibold text-[var(--text-primary)]">{loading ? '…' : connectedCount}</strong>{' '}
                  of {totalCount} providers connected
                </p>
              </div>
              <p className="text-[12px] bg-gradient-to-r from-emerald-300/90 via-sky-300/85 to-violet-300/90 bg-clip-text font-medium text-transparent">
                Keys are encrypted. You can remove them anytime.
              </p>
            </div>
            {!loading && totalCount > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.round((connectedCount / totalCount) * 100))}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── AI Providers ───────────────────────────────────────────────── */}
        <div className="mb-10">
          <SectionHeader
            icon={<IconRobot className="h-5 w-5" stroke={1.5} />}
            title="AI models"
            desc="Claude, Gemini, GPT, and DeepSeek — add the keys for models you want in Chat."
          />
          <div className="space-y-3">
            {AI_PRIMARY.map(prov => (
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

        {AI_MORE.length > 0 && (
          <div className="mb-10">
            <SectionHeader
              icon={<IconRobot className="h-5 w-5" stroke={1.5} />}
              title="More AI providers"
              desc="Optional — local browser storage or additional hosts."
            />
            <div className="space-y-3">
              {AI_MORE.map(prov => (
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
        )}

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
        <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Server keys use <strong className="font-medium text-[var(--text-primary)]">encrypted storage</strong>. Local keys stay in this browser. You can delete any key whenever you like.
          </p>
        </div>

      </div>
    </div>
  );
}
