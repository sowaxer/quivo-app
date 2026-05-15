"use client";
// components/AgentChat.tsx
// UI principal del agente — chat + upload de PDFs + estado de conexiones

import { useState, useRef, useEffect } from "react";
import { useAgent, loadApiKeys } from "@/hooks/useAgent";
import ApiKeysModal from "./ApiKeysModal";
import ReactMarkdown from "react-markdown"; // npm install react-markdown

// Comandos rápidos para contabilidad
const QUICK_COMMANDS = [
  { label: "📊 P&L este mes", cmd: "Muéstrame el P&L de este mes desde QuickBooks" },
  { label: "💰 Cobros pendientes", cmd: "¿Qué facturas están pendientes de pago?" },
  { label: "📧 Email de cobro", cmd: "Redacta un email de cobro profesional para un cliente con 30 días de mora" },
  { label: "🏦 Balance sheet", cmd: "Muéstrame el balance sheet actual" },
  { label: "📅 Deadlines fiscales", cmd: "¿Cuáles son los próximos deadlines fiscales importantes?" },
  { label: "💳 Pagos Stripe", cmd: "¿Cuánto recibimos en Stripe este mes?" },
];

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function AgentChat() {
  const { messages, isLoading, sendMessage, clearChat } = useAgent();
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Verificar si hay keys configuradas
  useEffect(() => {
    const keys = loadApiKeys();
    setHasKeys(!!keys.anthropic);
  }, [keysOpen]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !file) return;
    setInput("");
    setFile(null);
    await sendMessage(text, file || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-border)]">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${hasKeys ? "bg-green-500" : "bg-orange-400"} animate-pulse`} />
          <span className="font-bold text-sm">Quivo Agent</span>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {hasKeys ? "listo" : "configura tus API keys"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-card)] transition-colors"
          >
            Limpiar chat
          </button>
          <button
            onClick={() => setKeysOpen(true)}
            className="text-xs bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]/80 px-3 py-1.5 rounded-lg font-mono transition-colors flex items-center gap-1.5"
          >
            🔑 API Keys
            {!hasKeys && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="text-5xl">✦</div>
            <div>
              <p className="font-bold text-xl">Quivo Agent</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Tu asistente de contabilidad con IA. Conecta tus herramientas y empieza.
              </p>
            </div>

            {!hasKeys && (
              <button
                onClick={() => setKeysOpen(true)}
                className="px-6 py-3 bg-[var(--quivo-accent)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                🔑 Configurar API Keys para empezar
              </button>
            )}

            {hasKeys && (
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {QUICK_COMMANDS.map((q) => (
                  <button
                    key={q.cmd}
                    onClick={() => sendMessage(q.cmd)}
                    className="text-left text-xs border border-[var(--bg-border)] rounded-xl px-3 py-2.5 hover: border-[var(--quivo-accent)]/50 hover:bg-[var(--bg-card)] transition-all font-medium"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0
              ${msg.role === "user" ? "bg-[var(--quivo-accent)]/15 text-[var(--quivo-accent)]" : "bg-[var(--bg-card)] text-[var(--text-primary)]"}
            `}>
              {msg.role === "user" ? "👤" : "✦"}
            </div>

            {/* Bubble */}
            <div className={`
              max-w-[80%] rounded-2xl px-4 py-3 text-sm
              ${msg.role === "user"
                ? "bg-[var(--quivo-accent)] text-white rounded-tr-sm"
                : msg.error
                  ? "bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] rounded-tl-sm"
                  : "bg-[var(--bg-card)] rounded-tl-sm"
              }
            `}>
              {/* File attachment badge */}
              {msg.file && (
                <div className="flex items-center gap-2 mb-2 text-xs opacity-70 font-mono">
                  📄 {msg.file.name}
                </div>
              )}

              {/* Content */}
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* Connected services badge */}
              {msg.connectedServices && msg.connectedServices.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[var(--bg-border)]/30">
                  {msg.connectedServices.map((s) => (
                    <span key={s} className="text-xs font-mono bg-[var(--bg-base)]/50 px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className={`text-xs mt-1.5 opacity-50 font-mono ${msg.role === "user" ? "text-right" : ""}`}>
                {fmtTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center text-sm">✦</div>
            <div className="bg-[var(--bg-card)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--quivo-accent)] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--quivo-accent)] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--quivo-accent)] animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-[var(--bg-border)] px-4 py-3">

        {/* File preview */}
        {file && (
          <div className="flex items-center gap-2 mb-2 bg-[var(--bg-card)] rounded-lg px-3 py-2 text-xs font-mono">
            <span>📄</span>
            <span className="flex-1 truncate">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-[var(--text-muted)] hover:text-[#ef4444]">✕</button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* PDF attach */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition-colors flex-shrink-0"
            title="Adjuntar bank statement PDF"
          >
            📎
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasKeys ? "Pregunta algo o sube un PDF..." : "Configura tus API keys primero..."}
            disabled={!hasKeys || isLoading}
            rows={1}
            className="flex-1 bg-[var(--bg-card)] rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--quivo-accent)]/40 disabled:opacity-50 max-h-32 font-sans"
            style={{ overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !file) || !hasKeys || isLoading}
            className="w-9 h-9 bg-[var(--quivo-accent)] text-white rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all flex-shrink-0"
          >
            ↑
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)] font-mono mt-2 text-center">
          Enter para enviar · Shift+Enter para nueva línea · 📎 para PDFs
        </p>
      </div>

      {/* API Keys Modal */}
      <ApiKeysModal open={keysOpen} onClose={() => setKeysOpen(false)} />
    </div>
  );
}
