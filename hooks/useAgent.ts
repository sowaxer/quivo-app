// hooks/useAgent.ts
// Maneja: API keys del usuario (localStorage), historial de chat, llamadas al agente

import { useState, useCallback } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ApiKeys {
  anthropic: string;      // REQUERIDA — sin esta no funciona nada
  stripe?: string;        // Opcional
  quickbooks?: string;    // Opcional (OAuth token)
  google?: string;        // Opcional (Gmail + Drive + Calendar)
  supabase?: string;      // Opcional — para memoria persistente
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  file?: { name: string; size: number };
  connectedServices?: string[];
  error?: boolean;
}

// ─── Persistencia de API keys ─────────────────────────────────────────────────
// Las keys viven en localStorage del browser del usuario final
// NUNCA se mandan al servidor más allá de lo necesario para la llamada

const STORAGE_KEY = "quivo_api_keys";

export function loadApiKeys(): ApiKeys {
  if (typeof window === "undefined") return { anthropic: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { anthropic: "" };
  } catch {
    return { anthropic: "" };
  }
}

export function saveApiKeys(keys: ApiKeys) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearApiKeys() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // historial en formato que Claude espera (sin timestamps ni metadata)
  const [claudeHistory, setClaudeHistory] = useState<{ role: string; content: string }[]>([]);

  const sendMessage = useCallback(
    async (text: string, file?: File) => {
      const keys = loadApiKeys();

      if (!keys.anthropic) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Necesitas configurar tu API key de Anthropic para usar Quivo. Ve a Configuración → API Keys.",
            timestamp: new Date(),
            error: true,
          },
        ]);
        return;
      }

      // Agregar mensaje del usuario a la UI
      const userMsg: Message = {
        role: "user",
        content: text,
        timestamp: new Date(),
        ...(file && { file: { name: file.name, size: file.size } }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const fd = new FormData();
        fd.append("message", text);
        fd.append("messages", JSON.stringify(claudeHistory));
        if (file) fd.append("file", file);

        // Headers con las keys del usuario — van al route, que las usa para
        // llamar a Claude y MCP servers. Tu servidor no las almacena.
        const headers: Record<string, string> = {
          "x-anthropic-key": keys.anthropic,
        };
        if (keys.stripe) headers["x-stripe-key"] = keys.stripe;
        if (keys.quickbooks) headers["x-quickbooks-token"] = keys.quickbooks;
        if (keys.google) headers["x-google-token"] = keys.google;
        if (keys.supabase) headers["x-supabase-key"] = keys.supabase;

        const res = await fetch("/api/agent", {
          method: "POST",
          headers,
          body: fd,
          credentials: "include",
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Error desconocido");
        }

        // Guardar historial actualizado para la próxima llamada
        setClaudeHistory(json.updatedHistory);

        // Agregar respuesta del agente a la UI
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.message,
            timestamp: new Date(),
            connectedServices: json.connectedServices,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ Error: ${String(err)}`,
            timestamp: new Date(),
            error: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [claudeHistory]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setClaudeHistory([]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
