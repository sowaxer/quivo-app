'use client';

import { useState } from 'react';
import {
  IconSparkles, IconX, IconCheck, IconLoader2,
  IconEye, IconEyeOff, IconArrowRight,
} from '@tabler/icons-react';
import { LogoAnthropicClaude } from '@/components/provider-brand-icons';

type Step = 'welcome' | 'anthropic' | 'google' | 'done';

interface Props {
  onClose: () => void;
}

function KeyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#1e2836] bg-[#0a0e1a] py-3 pl-4 pr-10 font-mono text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3]">
        {show ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function OnboardingModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  async function saveKeys() {
    setSaving(true);
    const body: Record<string, string> = {};
    if (anthropicKey.trim()) body.anthropic_key = anthropicKey.trim();
    if (googleKey.trim())    body.google_ai_key  = googleKey.trim();

    if (Object.keys(body).length > 0) {
      await fetch('/api/user-keys', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setSaved(true);
    setStep('done');
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="relative w-[520px] rounded-3xl border border-[#1e2836] bg-[#0f1419] shadow-2xl shadow-black/60">

        {/* Close (only after welcome) */}
        {step !== 'welcome' && (
          <button onClick={onClose} className="absolute right-4 top-4 text-[#8b949e] hover:text-[#e6edf3]">
            <IconX className="h-4 w-4" />
          </button>
        )}

        {/* ── Welcome ─────────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center gap-6 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl shadow-blue-900/40">
              <IconSparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#e6edf3]">Welcome to Finedge</h2>
              <p className="mt-2 text-sm text-[#8b949e] max-w-sm">
                Finedge connects your favorite AI models, Gmail, Calendar, and Stripe in one dashboard.
                <span className="block mt-1 font-semibold text-[#3b82f6]">You use your own API keys — we're just the bridge.</span>
              </p>
            </div>

            <div className="w-full rounded-2xl border border-[#1e2836] bg-[#141b26] p-5 text-left space-y-3">
              {[
                { icon: '🤖', title: 'Bring your AI keys', desc: 'Claude, Gemini, or GPT — your choice' },
                { icon: '📧', title: 'Connect Google Workspace', desc: 'Gmail, Calendar, Drive in one place' },
                { icon: '💳', title: 'Stripe billing', desc: 'See your MRR, invoices, customers live' },
                { icon: '📝', title: 'Smart notes & reminders', desc: 'AI reads your notes and reminds you' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-xs font-bold text-[#e6edf3]">{title}</p>
                    <p className="text-[10px] text-[#8b949e]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep('anthropic')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/40 hover:shadow-blue-900/60 transition-all">
              Get started <IconArrowRight className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="text-xs text-[#8b949e] hover:text-[#e6edf3]">Skip for now</button>
          </div>
        )}

        {/* ── API Keys ─────────────────────────────────────────────────── */}
        {step === 'anthropic' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#30363d] bg-[#141b26]">
                <LogoAnthropicClaude size={40} className="rounded-lg" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e6edf3]">Add your AI API keys</h3>
                <p className="text-xs text-[#8b949e]">Step 1 of 2 · You can change these anytime in Settings</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#8b949e]">Anthropic Claude key <span className="text-[#3b82f6]">(recommended)</span></label>
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-[#3b82f6] hover:underline">Get key →</a>
                </div>
                <KeyInput value={anthropicKey} onChange={setAnthropicKey} placeholder="sk-ant-api03-..." />
                <p className="mt-1 text-[10px] text-[#8b949e]">Powers Claude Sonnet (best for financial analysis)</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#8b949e]">Google Gemini key</label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-[#3b82f6] hover:underline">Get key →</a>
                </div>
                <KeyInput value={googleKey} onChange={setGoogleKey} placeholder="AIzaSy..." />
                <p className="mt-1 text-[10px] text-[#8b949e]">Powers Gemini 1.5 Pro (great for long documents)</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 px-4 py-3">
              <p className="text-xs text-[#f59e0b]">🔒 Keys are stored encrypted server-side. You pay AI providers directly — Finedge charges nothing for AI usage.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('welcome')} className="flex-1 rounded-xl border border-[#1e2836] py-2.5 text-xs font-semibold text-[#8b949e] hover:text-[#e6edf3]">Back</button>
              <button onClick={() => setStep('google')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-2.5 text-xs font-semibold text-white">
                Continue <IconArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={() => setStep('google')} className="w-full text-center text-[11px] text-[#8b949e] hover:text-[#e6edf3]">Skip AI keys for now</button>
          </div>
        )}

        {/* ── Google Connect ───────────────────────────────────────────── */}
        {step === 'google' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                <span className="text-xl">📧</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e6edf3]">Connect Google Workspace</h3>
                <p className="text-xs text-[#8b949e]">Step 2 of 2 · Optional — you can do this later</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1e2836] bg-[#141b26] p-5 space-y-3">
              {['Gmail — read & send emails from dashboard', 'Calendar — see upcoming events', 'Drive — browse & search documents'].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-xs text-[#8b949e]">
                  <IconCheck className="h-3.5 w-3.5 shrink-0 text-[#22c55e]" strokeWidth={2.5} />
                  {f}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={async () => { await saveKeys(); window.location.href = '/api/google/auth'; }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-md hover:shadow-blue-900/40">
                {saving ? <IconLoader2 className="h-4 w-4 animate-spin" /> : '🔐'}
                Connect Google Workspace
              </button>
              <button onClick={saveKeys} disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1e2836] py-2.5 text-xs font-semibold text-[#8b949e] hover:text-[#e6edf3]">
                {saving ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Skip — I&apos;ll connect later
              </button>
            </div>
          </div>
        )}

        {/* ── Done ─────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-6 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/30">
              <IconCheck className="h-8 w-8 text-[#22c55e]" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e6edf3]">You&apos;re all set!</h2>
              <p className="mt-2 text-sm text-[#8b949e]">
                {saved ? 'Your API keys are saved.' : 'Setup complete.'} Start chatting with AI Agents or browse your integrations.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 text-sm font-semibold text-white">
                Open Dashboard <IconArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
