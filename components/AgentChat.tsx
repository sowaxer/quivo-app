"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { IconArrowLeft, IconKey, IconPaperclip } from "@tabler/icons-react";
import { useAgent, loadApiKeys } from "@/hooks/useAgent";
import ApiKeysModal from "./ApiKeysModal";
import ReactMarkdown from "react-markdown";

const QUICK_COMMANDS = [
  { label: "P&L este mes", cmd: "Muéstrame el P&L de este mes desde QuickBooks" },
  { label: "Cobros pendientes", cmd: "¿Qué facturas están pendientes de pago?" },
  { label: "Email de cobro", cmd: "Redacta un email de cobro profesional para un cliente con 30 días de mora" },
  { label: "Balance sheet", cmd: "Muéstrame el balance sheet actual" },
];

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

type Props = { fullWidth?: boolean; showBack?: boolean };

export default function AgentChat({ fullWidth = false, showBack = false }: Props) {
  const { messages, isLoading, sendMessage, clearChat } = useAgent();
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const keys = loadApiKeys();
    setHasKeys(!!keys.anthropic);
  }, [keysOpen]);

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
    <div className={`flex h-full w-full flex-col bg-[var(--bg-canvas)] ${fullWidth ? "max-w-none" : "mx-auto max-w-3xl"}`}>
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link
              href="/dashboard?view=overview"
              className="quivo-btn-ghost flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium"
            >
              <IconArrowLeft className="h-4 w-4" stroke={1.75} />
              Back
            </Link>
          )}
          <div className={`h-2 w-2 rounded-full ${hasKeys ? "bg-[var(--finance-up)]" : "bg-[var(--text-muted)]"}`} />
          <span className="text-[14px] font-semibold tracking-[-0.02em]">Quivo Agent</span>
          <span className="text-[12px] text-[var(--text-muted)]">
            {hasKeys ? "Ready" : "Add API keys"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearChat}
            className="text-[12px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setKeysOpen(true)}
            className="quivo-btn-ghost flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
          >
            <IconKey className="h-3.5 w-3.5" stroke={1.75} />
            API Keys
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              ✦
            </div>
            <div>
              <p className="text-[18px] font-semibold tracking-[-0.03em]">Quivo Agent</p>
              <p className="quivo-body mt-2 max-w-md text-[13px]">
                Connect your API keys. We link Claude, Stripe, and Google to your workspace.
              </p>
            </div>
            {!hasKeys && (
              <button
                type="button"
                onClick={() => setKeysOpen(true)}
                className="rounded-full border border-[var(--bg-border)] bg-[var(--text-primary)] px-5 py-2.5 text-[13px] font-medium text-[var(--bg-canvas)] transition-opacity hover:opacity-90"
              >
                Configure API keys
              </button>
            )}
            {hasKeys && (
              <div className="grid w-full max-w-md grid-cols-2 gap-2">
                {QUICK_COMMANDS.map((q) => (
                  <button
                    key={q.cmd}
                    type="button"
                    onClick={() => sendMessage(q.cmd)}
                    className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-[12px] font-normal text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[12px] text-[var(--text-muted)]">
              {msg.role === "user" ? "U" : "✦"}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] ${
                msg.role === "user"
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : msg.error
                    ? "border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--finance-down)]"
                    : "border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              }`}
            >
              {msg.file && (
                <div className="mb-2 text-[11px] text-[var(--text-muted)]">📄 {msg.file.name}</div>
              )}
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className="mt-1.5 text-[10px] text-[var(--text-faint)]">{fmtTime(msg.timestamp)}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)]" />
            <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)] [animation-delay:0.3s]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--bg-border)] px-4 py-3">
        {file && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
            <span className="flex-1 truncate">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="hover:text-[var(--text-primary)]">✕</button>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <IconPaperclip className="h-4 w-4" stroke={1.5} />
          </button>
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasKeys ? "Ask anything…" : "Add API keys to start…"}
            disabled={!hasKeys || isLoading}
            rows={1}
            className="flex-1 resize-none rounded-[22px] border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[14px] focus:border-[var(--text-muted)] focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && !file) || !hasKeys || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--bg-border)] bg-[var(--text-primary)] text-[var(--bg-canvas)] disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </div>

      <ApiKeysModal open={keysOpen} onClose={() => setKeysOpen(false)} />
    </div>
  );
}
