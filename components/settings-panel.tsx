'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  IconRobot, IconPlug, IconSettings, IconDatabase,
  IconCheck, IconX, IconLoader2, IconEye, IconEyeOff,
  IconTrash, IconDownload, IconRefresh, IconExternalLink,
  IconBrandGoogle, IconBrandStripe, IconSparkles,
  IconAlertTriangle, IconSend, IconUpload, IconKey, IconLock,
} from '@tabler/icons-react';
import { useTheme } from '@/components/theme-provider';
import { GeminiMarkIcon, OpenAIMarkIcon, AnthropicMarkIcon, LogoDeepseek } from '@/components/provider-brand-icons';

// ─── Inline theme toggle for settings ────────────────────────────────────────
function ThemeToggleInline() {
  const { theme, setTheme } = useTheme();
  const opts = [
    { value: 'dark'   as const, label: 'Dark',   icon: '🌙' },
    { value: 'light'  as const, label: 'Light',  icon: '☀️' },
    { value: 'system' as const, label: 'System', icon: '💻' },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[#1e2836] bg-[#0a0e1a] p-1 w-fit">
      {opts.map(o => (
        <button key={o.value} onClick={() => setTheme(o.value)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            theme === o.value ? 'bg-[#1e2836] text-[#e6edf3] shadow-sm' : 'text-[#8b949e] hover:text-[#e6edf3]'
          }`}>
          <span>{o.icon}</span> {o.label}
          {theme === o.value && <IconCheck className="h-3.5 w-3.5 text-[#22c55e]" />}
        </button>
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'ai' | 'integrations' | 'preferences' | 'data';

interface KeyState {
  has:       boolean;
  masked:    string | null;
  input:     string;
  show:      boolean;
  testing:   boolean;
  testResult: { success: boolean; message: string } | null;
  saving:    boolean;
}

function mkKey(): KeyState {
  return { has: false, masked: null, input: '', show: false, testing: false, testResult: null, saving: false };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
        active ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-violet-900/35'
               : 'text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3]'}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatusBadge({ ok, msg }: { ok: boolean | null; msg?: string }) {
  if (ok === null) return <span className="flex items-center gap-1 text-[11px] text-[#8b949e]"><IconLoader2 className="h-3 w-3 animate-spin" /> Checking…</span>;
  if (ok) return <span className="flex items-center gap-1 rounded-md bg-[#22c55e]/10 px-2 py-0.5 text-[11px] font-semibold text-[#22c55e]"><IconCheck className="h-3 w-3" strokeWidth={2.5} /> {msg ?? 'Connected'}</span>;
  return <span className="flex items-center gap-1 rounded-md bg-[#ef4444]/10 px-2 py-0.5 text-[11px] font-semibold text-[#ef4444]"><IconX className="h-3 w-3" strokeWidth={2.5} /> {msg ?? 'Not connected'}</span>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-[#1e2836]'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#1e2836] bg-[#141b26] p-6">
      <div className="mb-5">
        <h3 className="text-sm font-bold text-[#e6edf3]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[#8b949e]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Provider Key Editor ──────────────────────────────────────────────────────
function ProviderKeyEditor({
  name, icon: Icon, iconColor, keyPrefix, placeholder, docUrl,
  state, onChange, onSave, onRemove, onTest, howToGet, onToggleShow,
}: {
  name: string; icon: React.ElementType; iconColor: string; keyPrefix?: string;
  placeholder: string; docUrl: string; howToGet?: string;
  state: KeyState;
  onChange: (input: string) => void;
  onSave: () => void;
  onRemove: () => void;
  onTest: () => void;
  onToggleShow: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#1e2836] bg-[#0f1419] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[#1e2836] ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e6edf3]">{name}</p>
            {keyPrefix && <p className="text-[10px] text-[#8b949e]">Key starts with: <code className="text-[#3b82f6]">{keyPrefix}</code></p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.has && <StatusBadge ok={state.testResult ? state.testResult.success : true} msg={state.testResult?.message} />}
          {!state.has && <StatusBadge ok={false} msg="Not connected" />}
          <a href={docUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-[#3b82f6] hover:text-cyan-400">
            Get API key <IconExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* Key input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {state.has && (
            <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-emerald-400/90">
              <IconLock className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
          <input
            type={state.show ? 'text' : 'password'}
            value={state.input || (state.has ? (state.masked ?? '••••••••••••••••••••••••') : '')}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-xl border border-[#1e2836] bg-[#0a0e1a] py-2.5 pr-10 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none font-mono ${state.has ? 'pl-10' : 'pl-4'}`}
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3]"
          >
            {state.show ? <IconEyeOff className="h-3.5 w-3.5" /> : <IconEye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <button onClick={onSave} disabled={!state.input || state.saving}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40 hover:shadow-lg hover:shadow-blue-900/30 transition-all">
          {state.saving ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconKey className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>

      {/* How to get key — collapsible guide */}
      {!state.has && howToGet && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-[#8b949e] hover:text-[#3b82f6]">How to get this key?</summary>
          <div className="mt-2 rounded-lg border border-[#1e2836] bg-[#0a0e1a] px-3 py-2 text-[11px] text-[#8b949e] leading-relaxed whitespace-pre-line">{howToGet}</div>
        </details>
      )}

      {/* Actions */}
      {state.has && (
        <div className="mt-3 flex items-center gap-3">
          <button onClick={onTest} disabled={state.testing}
            className="flex items-center gap-1.5 rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#3b82f6] hover:border-[#3b82f6]/40 transition-all">
            {state.testing ? <IconLoader2 className="h-3 w-3 animate-spin" /> : <IconSend className="h-3 w-3" />}
            Test Connection
          </button>
          <button onClick={onRemove}
            className="flex items-center gap-1.5 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 px-3 py-1.5 text-xs text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
            <IconTrash className="h-3 w-3" /> Remove
          </button>
          {state.testResult && (
            <span className={`ml-auto text-[11px] ${state.testResult.success ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {state.testResult.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('ai');

  // Keys state
  const [anthropic, setAnthropic] = useState<KeyState>(mkKey());
  const [openai, setOpenai]       = useState<KeyState>(mkKey());
  const [googleAI, setGoogleAI]   = useState<KeyState>(mkKey());
  const [stripeSecret, setStripeSecret] = useState<KeyState>(mkKey());
  const [stripePub, setStripePub]       = useState<KeyState>(mkKey());
  const [deepseek, setDeepseek] = useState<KeyState>(mkKey());
  const [tavily, setTavily] = useState<KeyState>(mkKey());
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [dropboxOauthReady, setDropboxOauthReady] = useState(true);

  // Integration status
  const [googleConnected, setGoogleConnected]   = useState<boolean | null>(null);
  const [dropboxConnected, setDropboxConnected] = useState<boolean | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(true);

  // Preferences
  const [prefs, setPrefs] = useState({
    defaultModel:         'claude-sonnet-4-5',
    streamResponses:      true,
    soundNotifications:   false,
    enterToSend:          true,
    language:             'en',
    emailNotifications:   false,
    desktopNotifications: false,
    theme:                'dark',
    fontSize:             'medium',
    chatWidth:            'standard',
  });
  const [prefSaved, setPrefSaved] = useState(false);
  const [oauthRedirectBase, setOauthRedirectBase] = useState('');

  useEffect(() => {
    setOauthRedirectBase(typeof window !== 'undefined' ? window.location.origin : '');
  }, []);

  // ── Load keys from server ──────────────────────────────────────────────────
  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const [keysRes, googleRes, dropboxRes] = await Promise.allSettled([
        fetch('/api/user-keys', { credentials: 'include' }),
        fetch('/api/google/auth?status=1', { credentials: 'include' }),
        fetch('/api/dropbox/auth?status=1', { credentials: 'include' }),
      ]);

      if (keysRes.status === 'fulfilled' && keysRes.value.ok) {
        const d = await keysRes.value.json();
        const update = (
          setter: React.Dispatch<React.SetStateAction<KeyState>>,
          field: string,
          preview?: string | null,
        ) => {
          setter(prev => ({ ...prev, has: d.has[field] ?? false, masked: preview ?? null }));
        };
        update(setAnthropic, 'anthropic', d.previews?.anthropic);
        update(setOpenai,    'openai',    d.previews?.openai);
        update(setGoogleAI,  'google_ai', d.previews?.google_ai);
        update(setDeepseek,  'deepseek',  d.previews?.deepseek);
        setStripeSecret(prev => ({
          ...prev,
          has: d.has.stripe ?? false,
          masked: d.previews?.stripe_secret ?? null,
        }));
        setStripePub(prev => ({
          ...prev,
          has: d.has.stripe_pub ?? false,
          masked: d.previews?.stripe_pub ?? null,
        }));
        setTavily(prev => ({ ...prev, has: d.has.tavily ?? false, masked: d.previews?.tavily ?? null }));
        setDropboxOauthReady(d.dropbox_oauth_configured !== false);
      }

      if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
        const g = await googleRes.value.json();
        setGoogleConnected(g.connected);
        setGoogleEmail(typeof g.email === 'string' ? g.email : null);
      } else {
        setGoogleConnected(false);
        setGoogleEmail(null);
      }

      if (dropboxRes.status === 'fulfilled' && dropboxRes.value.ok) {
        const d = await dropboxRes.value.json();
        setDropboxConnected(d.connected);
      } else {
        setDropboxConnected(false);
      }
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  // ── Generic save key ───────────────────────────────────────────────────────
  async function saveKey(
    field: string,
    input: string,
    setter: React.Dispatch<React.SetStateAction<KeyState>>,
  ) {
    if (!input.trim()) return;
    setter(p => ({ ...p, saving: true, testResult: null }));
    const res = await fetch('/api/user-keys', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: input.trim() }),
    });
    let msg: string | undefined;
    try {
      const data = (await res.json()) as { error?: string };
      if (!res.ok) msg = data.error ?? `HTTP ${res.status}`;
    } catch {
      if (!res.ok) msg = `HTTP ${res.status}`;
    }
    if (msg) {
      setter(p => ({ ...p, saving: false, testResult: { success: false, message: msg } }));
      return;
    }
    await loadKeys();
    setter(p => ({ ...p, saving: false, input: '' }));
  }

  // ── Generic remove key ─────────────────────────────────────────────────────
  async function removeKey(field: string, setter: React.Dispatch<React.SetStateAction<KeyState>>) {
    await fetch('/api/user-keys', {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
    });
    setter(mkKey());
  }

  // ── Generic test key ───────────────────────────────────────────────────────
  async function testKey(provider: string, setter: React.Dispatch<React.SetStateAction<KeyState>>) {
    setter(p => ({ ...p, testing: true, testResult: null }));
    const res = await fetch('/api/user-keys/test', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const result = await res.json();
    setter(p => ({ ...p, testing: false, testResult: result }));
  }

  // ── Save preferences ───────────────────────────────────────────────────────
  async function savePrefs() {
    await fetch('/api/user-keys', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: prefs }),
    });
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2000);
  }

  // ── Export chats ───────────────────────────────────────────────────────────
  async function exportChats() {
    const res = await fetch('/api/notes', { credentials: 'include' });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finedge-export-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loadingKeys) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-[#1e2836] bg-[#0d1117] p-4 overflow-y-auto">
        <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">Settings</p>
        <div className="flex flex-col gap-1">
          <TabBtn active={tab === 'ai'}           onClick={() => setTab('ai')}           icon={IconRobot}    label="AI Providers" />
          <TabBtn active={tab === 'integrations'} onClick={() => setTab('integrations')} icon={IconPlug}     label="Integrations" />
          <TabBtn active={tab === 'preferences'}  onClick={() => setTab('preferences')}  icon={IconSettings} label="Preferences" />
          <TabBtn active={tab === 'data'}         onClick={() => setTab('data')}         icon={IconDatabase} label="Data & Export" />
        </div>

        <div className="mt-6 rounded-xl border border-[#1e2836] bg-[#141b26] p-3">
          <p className="text-[10px] font-bold text-[#e6edf3]">{user?.firstName ?? 'User'}</p>
          <p className="text-[10px] text-[#8b949e] truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e] font-medium">Pro Plan</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* ══ TAB: AI PROVIDERS ══════════════════════════════════════════════ */}
        {tab === 'ai' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Your API Keys</h2>
              <p className="mt-1 text-sm text-[#8b949e]">
                Finedge is an orchestration platform — we connect your tools but never charge for AI usage.
              </p>
            </div>

            {/* Platform architecture explanation */}
            <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-5 space-y-3">
              <p className="text-xs font-bold text-[#3b82f6] uppercase tracking-wider">How it works</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: '🔑', title: 'You add keys', desc: 'From Claude, Stripe, Google, etc.' },
                  { icon: '⚡', title: 'Finedge connects', desc: 'We orchestrate everything together' },
                  { icon: '💰', title: 'You pay providers', desc: 'Directly at their rate — not us' },
                ].map(item => (
                  <div key={item.title} className="rounded-xl border border-[#1e2836] bg-[#0f1419] p-3">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <p className="text-[11px] font-bold text-[#e6edf3]">{item.title}</p>
                    <p className="text-[10px] text-[#8b949e]">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#8b949e] text-center">
                🔒 Keys are encrypted server-side. Never shared. Delete anytime.
              </p>
            </div>

            <SectionCard title="Anthropic Claude" subtitle="claude-sonnet-4-5 · claude-haiku · claude-opus-4 — Best for financial analysis">
              <ProviderKeyEditor
                name="Anthropic" icon={AnthropicMarkIcon} iconColor="bg-[#141b26] border border-[#30363d]"
                keyPrefix="sk-ant-api03-" placeholder="sk-ant-api03-..."
                docUrl="https://console.anthropic.com/settings/keys"
                howToGet={`1. Go to console.anthropic.com and create an account\n2. Add a payment method (pay-as-you-go, ~$0.003/1K tokens)\n3. Go to Settings → API Keys → Create Key\n4. Copy the key that starts with sk-ant-api03-\n5. Paste it above and click Save`}
                state={anthropic} onChange={v => setAnthropic(p => ({ ...p, input: v }))}
                onSave={() => saveKey('anthropic_key', anthropic.input, setAnthropic)}
                onRemove={() => removeKey('anthropic_key', setAnthropic)}
                onTest={() => testKey('anthropic', setAnthropic)}
                onToggleShow={() => setAnthropic(p => ({ ...p, show: !p.show }))}
              />
            </SectionCard>

            <SectionCard title="Google Gemini" subtitle="gemini-1.5-pro · gemini-2.0-flash — Great for long documents">
              <ProviderKeyEditor
                name="Google AI Studio" icon={GeminiMarkIcon} iconColor="bg-[#141b26] border border-[#30363d]"
                keyPrefix="AIza" placeholder="AIzaSy..."
                docUrl="https://aistudio.google.com/app/apikey"
                howToGet={`1. Go to aistudio.google.com\n2. Sign in with your Google account\n3. Click "Get API Key" in the top menu\n4. Create a new API key (free tier available)\n5. Copy the key that starts with AIzaSy\n6. Paste it above and click Save`}
                state={googleAI} onChange={v => setGoogleAI(p => ({ ...p, input: v }))}
                onSave={() => saveKey('google_ai_key', googleAI.input, setGoogleAI)}
                onRemove={() => removeKey('google_ai_key', setGoogleAI)}
                onTest={() => testKey('google_ai', setGoogleAI)}
                onToggleShow={() => setGoogleAI(p => ({ ...p, show: !p.show }))}
              />
            </SectionCard>

            <SectionCard title="OpenAI GPT" subtitle="gpt-4o · gpt-4o-mini · o3 · o4-mini">
              <ProviderKeyEditor
                name="OpenAI" icon={OpenAIMarkIcon} iconColor="bg-[#141b26] border border-[#30363d]"
                keyPrefix="sk-" placeholder="sk-..."
                docUrl="https://platform.openai.com/api-keys"
                howToGet={`1. Go to platform.openai.com and create an account\n2. Add a payment method in Billing settings\n3. Go to API Keys → Create new secret key\n4. Copy the key that starts with sk-\n5. Paste it above and click Save`}
                state={openai} onChange={v => setOpenai(p => ({ ...p, input: v }))}
                onSave={() => saveKey('openai_key', openai.input, setOpenai)}
                onRemove={() => removeKey('openai_key', setOpenai)}
                onTest={() => testKey('openai', setOpenai)}
                onToggleShow={() => setOpenai(p => ({ ...p, show: !p.show }))}
              />
            </SectionCard>

            <SectionCard title="DeepSeek" subtitle="deepseek-chat · deepseek-reasoner (R1) — Low cost, strong reasoning">
              <ProviderKeyEditor
                name="DeepSeek" icon={LogoDeepseek} iconColor="bg-[#141b26] border border-[#30363d]"
                keyPrefix="sk-" placeholder="sk-..."
                docUrl="https://platform.deepseek.com/api_keys"
                howToGet={`1. Go to platform.deepseek.com and sign in\n2. Open API keys → Create key\n3. Copy the key starting with sk-\n4. Paste above — API base is https://api.deepseek.com`}
                state={deepseek} onChange={v => setDeepseek(p => ({ ...p, input: v }))}
                onSave={() => saveKey('deepseek_key', deepseek.input, setDeepseek)}
                onRemove={() => removeKey('deepseek_key', setDeepseek)}
                onTest={() => testKey('deepseek', setDeepseek)}
                onToggleShow={() => setDeepseek(p => ({ ...p, show: !p.show }))}
              />
            </SectionCard>

            <SectionCard title="Tavily Search" subtitle="Real-time web search · Give your AI internet access">
              <ProviderKeyEditor
                name="Tavily" icon={IconSparkles} iconColor="bg-[#06b6d4]/10 text-[#06b6d4]"
                keyPrefix="tvly-" placeholder="tvly-..."
                docUrl="https://app.tavily.com"
                howToGet={`1. Go to app.tavily.com and create a free account\n2. Go to API Keys in your dashboard\n3. Your key starts with tvly-\n4. Free plan: 1,000 searches/month\n5. Paste it above and click Save\n\nOnce added, your AI agents can search the web in real-time.`}
                state={tavily} onChange={v => setTavily(p => ({ ...p, input: v }))}
                onSave={() => saveKey('tavily_key', tavily.input, setTavily)}
                onRemove={() => removeKey('tavily_key', setTavily)}
                onTest={() => {}}
                onToggleShow={() => setTavily(p => ({ ...p, show: !p.show }))}
              />
            </SectionCard>
          </div>
        )}

        {/* ══ TAB: INTEGRATIONS ══════════════════════════════════════════════ */}
        {tab === 'integrations' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Integrations</h2>
              <p className="mt-1 text-sm text-[#8b949e]">Connect external services to unlock Gmail, Calendar, Drive, and payments.</p>
            </div>

            {/* Google Workspace */}
            <SectionCard title="Google Workspace" subtitle="Gmail · Calendar · Drive · Contacts">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141b26] border border-[#1e2836]">
                    <IconBrandGoogle className="h-5 w-5 text-[#e6edf3]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#e6edf3]">Google OAuth 2.0</p>
                    <p className="text-xs text-[#8b949e]">Scopes: Gmail read/send · Calendar · Drive</p>
                    <div className="mt-1 space-y-0.5">
                      <StatusBadge
                        ok={googleConnected}
                        msg={
                          googleConnected
                            ? googleEmail
                              ? `Connected · ${googleEmail}`
                              : 'Workspace connected'
                            : 'Not connected'
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {googleConnected ? (
                    <button
                      onClick={async () => {
                        await fetch('/api/google/auth', { method: 'DELETE', credentials: 'include' });
                        setGoogleConnected(false);
                        setGoogleEmail(null);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 px-3 py-2 text-xs text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                      <IconX className="h-3.5 w-3.5" /> Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => { window.location.href = '/api/google/auth'; }}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-900/40 hover:shadow-blue-900/60 transition-all">
                      <IconBrandGoogle className="h-3.5 w-3.5" /> Connect Google
                    </button>
                  )}
                  <button onClick={loadKeys} className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-[#e6edf3]">
                    <IconRefresh className="h-3 w-3" /> Refresh
                  </button>
                </div>
              </div>

              {/* Redirect URI setup guide — only shown when not connected */}
              {!googleConnected && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-[11px] font-semibold text-[#f59e0b] hover:text-[#fbbf24]">
                    Getting redirect_uri_mismatch error? Click here to fix it
                  </summary>
                  <div className="mt-3 space-y-3 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4 text-[11px] text-[#8b949e]">
                    <p className="font-semibold text-[#f59e0b]">In Google Cloud Console you must add this exact Authorized Redirect URI:</p>
                    <code className="block select-all rounded-lg border border-[#1e2836] bg-[#0d1117] px-3 py-2 text-[#22c55e] font-mono text-xs">
                      {oauthRedirectBase || '(your app origin)'}/api/google/auth/callback
                    </code>
                    <ol className="space-y-1.5 list-decimal list-inside">
                      <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] underline">console.cloud.google.com/apis/credentials</a></li>
                      <li>Click your OAuth 2.0 Client ID (Finedge Dashboard)</li>
                      <li>Under <strong className="text-[#e6edf3]">Authorized redirect URIs</strong>, click <strong className="text-[#e6edf3]">+ ADD URI</strong></li>
                      <li>
                        Paste:{' '}
                        <code className="text-[#22c55e]">
                          {oauthRedirectBase || 'https://YOUR_DOMAIN'}/api/google/auth/callback
                        </code>
                      </li>
                      <li>Click <strong className="text-[#e6edf3]">SAVE</strong>, wait 30 seconds, then try connecting again</li>
                    </ol>
                    <p className="text-[10px] text-[#8b949e]/70">
                      Production tip: set server env <code className="text-[#fcd34d]">GOOGLE_OAUTH_REDIRECT_URI</code> to the
                      exact URI registered in Google (e.g. https://app.quivo.site/api/google/auth/callback) so token exchange
                      matches the authorize step even if <code className="text-[#fcd34d]">NEXT_PUBLIC_APP_URL</code> differs.
                    </p>
                  </div>
                </details>
              )}
            </SectionCard>

            {/* Stripe */}
            <SectionCard title="Stripe" subtitle="Invoices · Subscriptions · Payments · MRR">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#8b949e]">Secret Key (sk_live_ or sk_test_)</label>
                  <ProviderKeyEditor
                    name="Stripe Secret" icon={IconBrandStripe} iconColor="bg-[#6366f1]/10 text-[#6366f1]"
                    keyPrefix="sk_live_ / sk_test_" placeholder="sk_live_..."
                    docUrl="https://dashboard.stripe.com/apikeys"
                    state={stripeSecret} onChange={v => setStripeSecret(p => ({ ...p, input: v }))}
                    onSave={() => saveKey('stripe_secret', stripeSecret.input, setStripeSecret)}
                    onRemove={() => removeKey('stripe_secret', setStripeSecret)}
                    onTest={() => testKey('stripe', setStripeSecret)}
                    onToggleShow={() => setStripeSecret(p => ({ ...p, show: !p.show }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#8b949e]">Publishable Key (pk_live_ or pk_test_)</label>
                  <ProviderKeyEditor
                    name="Stripe Publishable" icon={IconBrandStripe} iconColor="bg-[#6366f1]/10 text-[#6366f1]"
                    keyPrefix="pk_live_ / pk_test_" placeholder="pk_live_..."
                    docUrl="https://dashboard.stripe.com/apikeys"
                    state={stripePub} onChange={v => setStripePub(p => ({ ...p, input: v }))}
                    onSave={() => saveKey('stripe_pub', stripePub.input, setStripePub)}
                    onRemove={() => removeKey('stripe_pub', setStripePub)}
                    onTest={() => {}}
                    onToggleShow={() => setStripePub(p => ({ ...p, show: !p.show }))}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Dropbox */}
            <SectionCard title="Dropbox" subtitle="Files · Documents · Team folders">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141b26] border border-[#1e2836] text-xl">📦</div>
                  <div>
                    <p className="text-sm font-semibold text-[#e6edf3]">Dropbox OAuth 2.0</p>
                    <p className="text-xs text-[#8b949e]">Browse and search your Dropbox files</p>
                    <div className="mt-1">
                      <StatusBadge ok={dropboxConnected} msg={dropboxConnected ? 'Dropbox connected' : 'Not connected'} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {dropboxConnected ? (
                    <button onClick={async () => { await fetch('/api/dropbox/auth', { method: 'DELETE', credentials: 'include' }); setDropboxConnected(false); }}
                      className="flex items-center gap-1.5 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 px-3 py-2 text-xs text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                      <IconX className="h-3.5 w-3.5" /> Disconnect
                    </button>
                  ) : (
                    <button onClick={() => { window.location.href = '/api/dropbox/auth'; }}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:shadow-blue-900/40 transition-all">
                      📦 Connect Dropbox
                    </button>
                  )}
                </div>
              </div>
              {!dropboxOauthReady && !dropboxConnected && (
                <div className="mt-3 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 px-3 py-2 text-[11px] text-[#f59e0b]">
                  Set <code className="text-[#fcd34d]">DROPBOX_CLIENT_ID</code> and{' '}
                  <code className="text-[#fcd34d]">DROPBOX_CLIENT_SECRET</code> in Vercel Environment Variables (or{' '}
                  <code className="text-[#fcd34d]">.env.local</code> for dev). Create an app at{' '}
                  <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">
                    dropbox.com/developers
                  </a>
                  , add redirect URI <code className="text-[#fcd34d]">{oauthRedirectBase || 'http://localhost:3000'}/api/dropbox/auth/callback</code>
                  , then redeploy.
                </div>
              )}
            </SectionCard>

            {/* Notion (coming soon) */}
            <SectionCard title="Notion" subtitle="Pages · Databases · Knowledge base">
              <div className="flex items-center gap-3 opacity-60">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141b26] border border-[#1e2836] text-lg">📝</div>
                <div>
                  <p className="text-sm font-semibold text-[#e6edf3]">Notion OAuth 2.0</p>
                  <p className="text-xs text-[#8b949e]">Connect your Notion workspace</p>
                </div>
                <span className="ml-auto rounded-md bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-bold text-[#f59e0b]">Coming Soon</span>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ══ TAB: PREFERENCES ══════════════════════════════════════════════ */}
        {tab === 'preferences' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Preferences</h2>
              <p className="mt-1 text-sm text-[#8b949e]">Customize your Finedge experience.</p>
            </div>

            <SectionCard title="Appearance">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#8b949e]">Theme</label>
                <ThemeToggleInline />
              </div>
            </SectionCard>

            <SectionCard title="AI Settings">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#8b949e]">Default AI Model</label>
                  <select value={prefs.defaultModel} onChange={e => setPrefs(p => ({ ...p, defaultModel: e.target.value }))}
                    className="w-full rounded-xl border border-[#1e2836] bg-[#0a0e1a] px-4 py-2.5 text-sm text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none">
                    <optgroup label="Anthropic">
                      <option value="claude-opus-4">Claude Opus 4</option>
                      <option value="claude-sonnet-4-5">Claude Sonnet 4.5 ✓</option>
                      <option value="claude-haiku-4-5">Claude Haiku 4.5 (fast)</option>
                    </optgroup>
                    <optgroup label="Google">
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (fast)</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                    </optgroup>
                    <optgroup label="OpenAI">
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (fast)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Chat Behavior">
              {[
                { label: 'Stream AI responses (typing animation)', sub: 'See responses word by word as they generate', key: 'streamResponses' },
                { label: 'Sound notifications', sub: 'Play a sound when AI finishes a response', key: 'soundNotifications' },
                { label: 'Enter to send', sub: 'Use Shift+Enter for a new line', key: 'enterToSend' },
                { label: 'Email notifications', sub: 'Get notified of important updates by email', key: 'emailNotifications' },
                { label: 'Desktop notifications', sub: 'Browser push notifications', key: 'desktopNotifications' },
              ].map(({ label, sub, key }) => (
                <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-[#1e2836] last:border-0">
                  <div>
                    <p className="text-sm text-[#e6edf3]">{label}</p>
                    <p className="text-xs text-[#8b949e]">{sub}</p>
                  </div>
                  <Toggle
                    checked={prefs[key as keyof typeof prefs] as boolean}
                    onChange={v => setPrefs(p => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
            </SectionCard>

            <SectionCard title="Appearance">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#8b949e]">Font Size</label>
                  <select value={prefs.fontSize} onChange={e => setPrefs(p => ({ ...p, fontSize: e.target.value }))}
                    className="w-full rounded-xl border border-[#1e2836] bg-[#0a0e1a] px-4 py-2.5 text-sm text-[#e6edf3] focus:outline-none">
                    <option value="small">Small</option>
                    <option value="medium">Medium (default)</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#8b949e]">Chat Content Width</label>
                  <select value={prefs.chatWidth} onChange={e => setPrefs(p => ({ ...p, chatWidth: e.target.value }))}
                    className="w-full rounded-xl border border-[#1e2836] bg-[#0a0e1a] px-4 py-2.5 text-sm text-[#e6edf3] focus:outline-none">
                    <option value="narrow">Narrow</option>
                    <option value="standard">Standard (default)</option>
                    <option value="wide">Wide</option>
                    <option value="full">Full width</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#8b949e]">Language</label>
                  <select value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                    className="w-full rounded-xl border border-[#1e2836] bg-[#0a0e1a] px-4 py-2.5 text-sm text-[#e6edf3] focus:outline-none">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="pt">Português</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            <button onClick={savePrefs}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-blue-900/40 transition-all">
              {prefSaved ? <><IconCheck className="h-4 w-4" /> Saved!</> : 'Save Preferences'}
            </button>
          </div>
        )}

        {/* ══ TAB: DATA & EXPORT ════════════════════════════════════════════ */}
        {tab === 'data' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#e6edf3]">Data & Storage</h2>
              <p className="mt-1 text-sm text-[#8b949e]">Export your data or manage your account.</p>
            </div>

            <SectionCard title="Export Data" subtitle="Download your Finedge data at any time">
              <div className="flex flex-col gap-3">
                <button onClick={exportChats}
                  className="flex items-center gap-3 rounded-xl border border-[#1e2836] bg-[#0f1419] p-4 text-left hover:border-[#3b82f6]/40 hover:bg-[#1a2030] transition-all">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                    <IconDownload className="h-4 w-4 text-[#3b82f6]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#e6edf3]">Export Notes & Chat History</p>
                    <p className="text-xs text-[#8b949e]">JSON format · includes all messages and notes</p>
                  </div>
                </button>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#1e2836] bg-[#0f1419] p-4 text-left hover:border-[#3b82f6]/40 hover:bg-[#1a2030] transition-all">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22c55e]/10">
                    <IconUpload className="h-4 w-4 text-[#22c55e]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#e6edf3]">Import Data</p>
                    <p className="text-xs text-[#8b949e]">Restore from a previous export file</p>
                  </div>
                  <input type="file" accept=".json" className="hidden" />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Storage Usage">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#8b949e]">Chat History</span>
                    <span className="text-[#e6edf3]">~2 MB</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1e2836]">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600" style={{ width: '15%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#8b949e]">Notes & Documents</span>
                    <span className="text-[#e6edf3]">~0.5 MB</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1e2836]">
                    <div className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600" style={{ width: '5%' }} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Danger Zone">
              <div className="space-y-3">
                <button
                  onClick={() => { if (confirm('Clear all chat history? This cannot be undone.')) {} }}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-4 text-left hover:bg-[#ef4444]/10 transition-all">
                  <IconTrash className="h-4 w-4 text-[#ef4444]" />
                  <div>
                    <p className="text-sm font-semibold text-[#ef4444]">Clear All Chat History</p>
                    <p className="text-xs text-[#8b949e]">Permanently delete all conversations</p>
                  </div>
                </button>
                <button
                  onClick={() => { if (confirm('Delete your Finedge account? This is permanent.')) {} }}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-4 text-left hover:bg-[#ef4444]/10 transition-all">
                  <IconX className="h-4 w-4 text-[#ef4444]" />
                  <div>
                    <p className="text-sm font-semibold text-[#ef4444]">Delete Account</p>
                    <p className="text-xs text-[#8b949e]">Remove all data and close your account permanently</p>
                  </div>
                </button>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
