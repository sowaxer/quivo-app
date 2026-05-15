"use client";
// components/ApiKeysModal.tsx
// Modal donde el usuario final configura SUS API keys
// Se guardan en localStorage — nunca en tu base de datos

import { useState, useEffect } from "react";
import { loadApiKeys, saveApiKeys, clearApiKeys, type ApiKeys } from '@/hooks/useAgent';
import { syncAgentKeysToVault } from '@/lib/agent-keys-sync';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SERVICES = [
  {
    key: "anthropic" as keyof ApiKeys,
    label: "Anthropic (Claude)",
    required: true,
    placeholder: "sk-ant-api03-...",
    help: "Obtén tu key en console.anthropic.com",
    link: "https://console.anthropic.com",
    icon: "✦",
    color: "#D4A27F",
  },
  {
    key: "stripe" as keyof ApiKeys,
    label: "Stripe",
    required: false,
    placeholder: "sk_live_... o sk_test_...",
    help: "Dashboard → Developers → API keys",
    link: "https://dashboard.stripe.com/apikeys",
    icon: "💳",
    color: "#635BFF",
  },
  {
    key: "quickbooks" as keyof ApiKeys,
    label: "QuickBooks",
    required: false,
    placeholder: "OAuth access token",
    help: "Autoriza en developer.intuit.com",
    link: "https://developer.intuit.com",
    icon: "📊",
    color: "#2CA01C",
  },
  {
    key: "google" as keyof ApiKeys,
    label: "Google (Gmail + Drive + Calendar)",
    required: false,
    placeholder: "OAuth access token",
    help: "Autoriza en console.cloud.google.com",
    link: "https://console.cloud.google.com",
    icon: "🔵",
    color: "#4285F4",
  },
  {
    key: "supabase" as keyof ApiKeys,
    label: "Supabase (Memoria del agente)",
    required: false,
    placeholder: "sbp_...",
    help: "Project Settings → API → service_role key",
    link: "https://supabase.com/dashboard",
    icon: "🧠",
    color: "#3ECF8E",
  },
];

export default function ApiKeysModal({ open, onClose }: Props) {
  const [keys, setKeys] = useState<ApiKeys>({ anthropic: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [show, setShow] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) setKeys(loadApiKeys());
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!keys.anthropic?.trim()) return;
    setSaving(true);
    setSaveError(null);
    saveApiKeys(keys);
    const vault = await syncAgentKeysToVault(keys);
    setSaving(false);
    if (!vault.ok) {
      setSaveError(vault.error ?? 'No se pudo guardar en tu cuenta');
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    clearApiKeys();
    setKeys({ anthropic: "" });
  };

  const toggleShow = (k: string) =>
    setShow((prev) => ({ ...prev, [k]: !prev[k] }));

  const connectedCount = Object.values(keys).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-base)] border border-[var(--bg-border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-base)] border-b border-[var(--bg-border)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Tus API keys</h2>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
              {connectedCount} de {SERVICES.length} • Quivo no incluye keys de proveedores
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Privacy notice */}
        <div className="mx-6 mt-4 space-y-2">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs font-mono text-blue-400">
            🔒 Tus keys: este navegador + cuenta cifrada. Quivo no paga ni almacena keys de la plataforma.
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Se guardan en este navegador y en tu cuenta (cifradas) para Chat y bank statements.
            Gmail/Calendar: conecta Google en Settings (OAuth).
          </p>
        </div>

        {/* Keys list */}
        <div className="p-6 flex flex-col gap-4">
          {SERVICES.map((svc) => {
            const hasKey = !!keys[svc.key];
            return (
              <div
                key={svc.key}
                className={`border rounded-xl p-4 transition-colors ${
                  hasKey ? "border-green-500/30 bg-green-500/3" : "border-[var(--bg-border)]"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span>{svc.icon}</span>
                  <span className="font-semibold text-sm">{svc.label}</span>
                  {svc.required && (
                    <span className="text-xs bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full font-mono">
                      requerida
                    </span>
                  )}
                  {hasKey && (
                    <span className="ml-auto text-xs text-green-500 font-mono">✓ configurada</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={show[svc.key] ? "text" : "password"}
                    placeholder={svc.placeholder}
                    value={keys[svc.key] || ""}
                    onChange={(e) =>
                      setKeys((prev) => ({ ...prev, [svc.key]: e.target.value }))
                    }
                    className="w-full bg-[var(--bg-card)] border border-[var(--bg-border)] rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--quivo-accent)]/40 focus:border-[var(--quivo-accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(svc.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
                  >
                    {show[svc.key] ? "ocultar" : "ver"}
                  </button>
                </div>

                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-[var(--text-muted)]">{svc.help}</span>
                  <a
                    href={svc.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--quivo-accent)] hover:underline ml-1"
                  >
                    →
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {saveError && (
          <p className="mx-6 mb-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 px-3 py-2 text-xs text-[#ef4444]">
            {saveError}
          </p>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--bg-base)] border-t border-[var(--bg-border)] px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[#ef4444] border border-[var(--bg-border)] rounded-lg transition-colors"
          >
            Borrar todo
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!keys.anthropic?.trim() || saving}
            className="flex-1 py-2.5 bg-[var(--quivo-accent)] text-white font-bold text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar API Keys'}
          </button>
        </div>
      </div>
    </div>
  );
}
