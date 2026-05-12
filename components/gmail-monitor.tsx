'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconMail, IconSearch, IconArchive, IconTrash, IconSend,
  IconRefresh, IconLoader2, IconX, IconArrowBackUp, IconBrandGoogle,
} from '@tabler/icons-react';
import { useGoogleConnection } from '@/lib/use-google-connection';

type GmailTab = 'inbox' | 'sent' | 'starred';

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body?: string;
  unread: boolean;
  labelIds: string[];
}

function formatDate(raw: string) {
  if (!raw) return '';
  const d = new Date(raw);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function senderName(from: string) {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.replace(/<.*>/, '').trim();
}

// ─── Not-connected placeholder ────────────────────────────────────────────────
function ConnectPrompt({ onConnect }: { onConnect: () => void }) {
  const [diag, setDiag] = useState<{ checks: { label: string; ok: boolean; note?: string }[]; nextStep?: string } | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  async function loadDiag() {
    setShowDiag(true);
    try {
      const res = await fetch('/api/google/auth/diagnose', { credentials: 'include' });
      if (res.ok) setDiag(await res.json());
    } catch { /* ignore */ }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-6 text-center px-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#141b26] border border-[#1e2836]">
        <IconMail className="h-8 w-8 text-[#3b82f6]" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#e6edf3]">Connect Gmail</h3>
        <p className="mt-1 max-w-sm text-sm text-[#8b949e]">
          Connect your Google account to read, send, and manage emails directly from Finedge.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onConnect}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/40 hover:shadow-blue-900/60 transition-all"
        >
          <IconBrandGoogle className="h-4 w-4" />
          Connect Google Workspace
        </button>
        <button onClick={loadDiag} className="text-[11px] text-[#8b949e] underline hover:text-[#3b82f6]">
          Not working? Run diagnostics
        </button>
      </div>

      {showDiag && (
        <div className="w-full max-w-md rounded-2xl border border-[#1e2836] bg-[#141b26] p-4 text-left">
          <p className="mb-3 text-xs font-bold text-[#e6edf3]">Google OAuth Diagnostics</p>
          {!diag ? (
            <p className="text-xs text-[#8b949e]">Loading...</p>
          ) : (
            <div className="space-y-2">
              {diag.checks.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`mt-0.5 text-xs ${c.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{c.ok ? '✓' : '✗'}</span>
                  <div>
                    <p className="text-xs font-medium text-[#e6edf3]">{c.label}</p>
                    {c.note && <p className="text-[10px] text-[#8b949e]">{c.note}</p>}
                  </div>
                </div>
              ))}
              {diag.nextStep && (
                <div className="mt-3 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-2 text-[11px] text-[#f59e0b]">
                  Next: {diag.nextStep}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#8b949e]">Grants Gmail, Calendar and Drive read permissions</p>
    </div>
  );
}

export default function GmailMonitor() {
  const { connected, checking, recheck } = useGoogleConnection();
  const [tab, setTab]             = useState<GmailTab>('inbox');
  const [emails, setEmails]       = useState<Email[]>([]);
  const [selected, setSelected]   = useState<Email | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [searchQ, setSearchQ]     = useState('');
  const [composeTo, setComposeTo]   = useState('');
  const [composeSub, setComposeSub] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending]     = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setSelected(null);
    const queries: Record<GmailTab, string> = {
      inbox:   q ? q : 'in:inbox',
      sent:    'in:sent',
      starred: 'is:starred',
    };
    try {
      const res = await fetch(
        `/api/google/gmail?action=list&maxResults=50&q=${encodeURIComponent(queries[tab])}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.code === 'NOT_CONNECTED') { recheck(); return; }
      setEmails(data.emails ?? []);
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [tab, recheck]);

  useEffect(() => {
    if (connected) load();
  }, [connected, load]);

  const openEmail = async (email: Email) => {
    setSelected(email);
    setBodyLoading(true);
    try {
      const res = await fetch(`/api/google/gmail?action=read&id=${email.id}`, { credentials: 'include' });
      const data = await res.json();
      setSelected({ ...email, body: data.body || data.snippet });
      if (email.unread) {
        fetch('/api/google/gmail', {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markRead', id: email.id }),
        });
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e));
      }
    } finally {
      setBodyLoading(false);
    }
  };

  const archive = async (id: string) => {
    await fetch('/api/google/gmail', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive', id }),
    });
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const trash = async (id: string) => {
    await fetch('/api/google/gmail', {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const send = async () => {
    if (!composeTo || !composeSub || !composeBody) return;
    setSending(true);
    try {
      await fetch('/api/google/gmail', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: composeTo, subject: composeSub, body: composeBody }),
      });
      setShowCompose(false);
      setComposeTo(''); setComposeSub(''); setComposeBody('');
    } finally {
      setSending(false);
    }
  };

  const reply = () => {
    if (!selected) return;
    setComposeTo(selected.from);
    setComposeSub(`Re: ${selected.subject}`);
    setComposeBody(`\n\n--- Original ---\n${selected.snippet}`);
    setShowCompose(true);
  };

  const connectGoogle = () => { window.location.href = '/api/google/auth'; };

  // ── Checking state (max 5 s, then shows Connect) ─────────────────────────
  if (checking) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3">
        <IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
        <p className="text-xs text-[#8b949e]">Checking Google connection…</p>
      </div>
    );
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!connected) {
    return <ConnectPrompt onConnect={connectGoogle} />;
  }

  const unreadCount = emails.filter(e => e.unread).length;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-[#1e2836] bg-[#0f1419] px-6 py-3">
        <div className="flex gap-1">
          {(['inbox', 'sent', 'starred'] as GmailTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' : 'text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3]'}`}>
              {t}
              {t === 'inbox' && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-[9px] font-bold text-white">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b949e]" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(searchQ)}
            placeholder="Search emails…"
            className="w-full rounded-lg border border-[#1e2836] bg-[#141b26] py-1.5 pl-8 pr-3 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => load()} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1e2836] bg-[#141b26] text-[#8b949e] hover:text-[#e6edf3]">
            <IconRefresh className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowCompose(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">
            <IconSend className="h-3.5 w-3.5" /> Compose
          </button>
          <button onClick={connectGoogle}
            className="flex items-center gap-1.5 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5 text-[10px] font-semibold text-[#22c55e]">
            <IconBrandGoogle className="h-3 w-3" /> Connected
          </button>
        </div>
      </div>

      {/* Email list + detail */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`overflow-y-auto border-r border-[#1e2836] ${selected ? 'w-80 shrink-0' : 'flex-1'}`}>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-[#8b949e]">No emails found</p>
              <button onClick={() => load()} className="text-xs text-[#3b82f6] hover:underline">Refresh</button>
            </div>
          ) : (
            emails.map(email => (
              <button key={email.id} onClick={() => openEmail(email)}
                className={`group flex w-full gap-3 border-b border-[#1e2836] p-4 text-left transition-all hover:bg-[#1a2030] ${selected?.id === email.id ? 'bg-[#1e2836]' : ''}`}>
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 text-xs font-bold text-white">
                  {senderName(email.from).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-xs ${email.unread ? 'font-bold text-[#e6edf3]' : 'font-medium text-[#8b949e]'}`}>
                      {senderName(email.from)}
                    </p>
                    <span className="shrink-0 text-[10px] text-[#8b949e]">{formatDate(email.date)}</span>
                  </div>
                  <p className={`truncate text-xs ${email.unread ? 'font-semibold text-[#e6edf3]' : 'text-[#8b949e]'}`}>{email.subject}</p>
                  <p className="mt-0.5 truncate text-[10px] text-[#8b949e]">{email.snippet}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-[#1e2836] px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-sm font-bold text-[#e6edf3]">{selected.subject}</h2>
                <button onClick={() => setSelected(null)} className="shrink-0 text-[#8b949e] hover:text-[#e6edf3]">
                  <IconX className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8b949e]">From: <span className="text-[#e6edf3]">{selected.from}</span></p>
                  <p className="text-[10px] text-[#8b949e]">{formatDate(selected.date)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={reply} className="flex items-center gap-1 rounded-lg border border-[#1e2836] bg-[#141b26] px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#3b82f6]">
                    <IconArrowBackUp className="h-3.5 w-3.5" /> Reply
                  </button>
                  <button onClick={() => archive(selected.id)} className="flex items-center gap-1 rounded-lg border border-[#1e2836] bg-[#141b26] px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#f59e0b]">
                    <IconArchive className="h-3.5 w-3.5" /> Archive
                  </button>
                  <button onClick={() => trash(selected.id)} className="flex items-center gap-1 rounded-lg border border-[#1e2836] bg-[#141b26] px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#ef4444]">
                    <IconTrash className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {bodyLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#e6edf3]">
                  {selected.body || selected.snippet}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
          <div className="w-[480px] rounded-2xl border border-[#1e2836] bg-[#0f1419] shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-[#1e2836] px-4 py-3">
              <p className="text-sm font-semibold text-[#e6edf3]">New Message</p>
              <button onClick={() => setShowCompose(false)} className="text-[#8b949e] hover:text-[#e6edf3]">
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="To"
              className="w-full border-b border-[#1e2836] bg-transparent px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none" />
            <input value={composeSub} onChange={e => setComposeSub(e.target.value)} placeholder="Subject"
              className="w-full border-b border-[#1e2836] bg-transparent px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none" />
            <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your message…" rows={8}
              className="w-full bg-transparent px-4 py-3 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none resize-none" />
            <div className="flex items-center justify-between border-t border-[#1e2836] px-4 py-3">
              <button onClick={() => setShowCompose(false)} className="text-xs text-[#8b949e] hover:text-[#ef4444]">Discard</button>
              <button onClick={send} disabled={sending || !composeTo || !composeSub || !composeBody}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                {sending ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconSend className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
