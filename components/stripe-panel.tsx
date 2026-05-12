'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconCreditCard, IconLoader2, IconPlus, IconExternalLink,
  IconTrendingUp, IconAlertTriangle, IconRefresh, IconX,
  IconCheck, IconUsers,
} from '@tabler/icons-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

type StatusFilter = 'all' | 'paid' | 'open' | 'overdue';

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  customer_name: string;
  customer_email?: string;
  due_date: string | null;
  created: string;
  description?: string;
  hosted_invoice_url?: string;
}

interface Overview {
  mrr: number;
  pending_amount: number;
  overdue_amount: number;
  total_customers: number;
  paid_count: number;
  open_count: number;
  overdue_count: number;
  balance: number;
  test_mode: boolean;
}

interface MrrPoint { month: string; amount: number; }

const STATUS_STYLE: Record<string, string> = {
  paid:    'bg-[#06b6d4]/10 text-[#06b6d4]',
  open:    'bg-[#f59e0b]/10 text-[#f59e0b]',
  overdue: 'bg-[#ef4444]/10 text-[#ef4444]',
  void:    'bg-[#8b949e]/10 text-[#8b949e]',
  draft:   'bg-[#1e2836] text-[#8b949e]',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StripePanel() {
  const [overview, setOverview]   = useState<Overview | null>(null);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [mrrHistory, setMrrHistory] = useState<MrrPoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [stripeMissing, setStripeMissing] = useState(false);
  const [filter, setFilter]       = useState<StatusFilter>('all');
  const [selected, setSelected]   = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create invoice form
  const [customers, setCustomers] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [createCustomerId, setCreateCustomerId] = useState('');
  const [createAmount, setCreateAmount]         = useState('');
  const [createDesc, setCreateDesc]             = useState('');
  const [creating, setCreating]                 = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setStripeMissing(false);
    try {
      const fetchOpts: RequestInit = { credentials: 'include' };
      const [overviewRes, invoicesRes, mrrRes] = await Promise.all([
        fetch('/api/stripe?action=overview', fetchOpts),
        fetch('/api/stripe?action=invoices&limit=50', fetchOpts),
        fetch('/api/stripe?action=mrr', fetchOpts),
      ]);

      if (overviewRes.status === 403) {
        const body = await overviewRes.json().catch(() => ({}));
        if ((body as { code?: string }).code === 'STRIPE_NOT_CONNECTED') {
          setStripeMissing(true);
          setOverview(null);
          setInvoices([]);
          setMrrHistory([]);
          return;
        }
      }

      const [ov, inv, mrr] = await Promise.all([overviewRes.json(), invoicesRes.json(), mrrRes.json()]);
      setOverview(ov);
      setInvoices(inv.invoices ?? []);
      setMrrHistory(mrr.history ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadCustomers = async () => {
    const res = await fetch('/api/stripe?action=customers&limit=50', { credentials: 'include' });
    const data = await res.json();
    setCustomers(data.customers ?? []);
  };

  const createInvoice = async () => {
    if (!createCustomerId || !createAmount) return;
    setCreating(true);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:     'create_invoice',
          customerId: createCustomerId,
          amount:     parseFloat(createAmount),
          description: createDesc || 'Services',
        }),
      });
      const data = await res.json();
      if (data.id) {
        setShowCreate(false);
        setCreateCustomerId(''); setCreateAmount(''); setCreateDesc('');
        await loadAll();
      }
    } finally {
      setCreating(false);
    }
  };

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" /></div>;
  }

  if (stripeMissing) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1e2836] bg-[#141b26]">
          <IconCreditCard className="h-8 w-8 text-[#8b949e]" />
        </div>
        <h2 className="text-lg font-bold text-[#e6edf3]">Connect your Stripe account</h2>
        <p className="max-w-md text-sm text-[#8b949e]">
          Billing uses <strong className="text-[#e6edf3]">your</strong> Stripe secret key. Add it under{' '}
          <strong className="text-[#e6edf3]">Settings → AI Providers</strong> or <strong className="text-[#e6edf3]">API Keys</strong>.
          Keys are encrypted and only used on the server.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Stats */}
      <div className="border-b border-[#1e2836] bg-[#0f1419] px-6 py-4">
        {overview?.test_mode && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 px-3 py-2">
            <IconAlertTriangle className="h-3.5 w-3.5 text-[#f59e0b]" />
            <p className="text-xs font-semibold text-[#f59e0b]">Test mode — using sk_test_ key</p>
          </div>
        )}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'MRR (This Month)', value: fmt(overview?.mrr ?? 0),              color: 'text-[#22c55e]', icon: IconTrendingUp },
            { label: 'Pending',          value: fmt(overview?.pending_amount ?? 0),    color: 'text-[#f59e0b]', icon: IconCreditCard },
            { label: 'Overdue',          value: fmt(overview?.overdue_amount ?? 0),    color: 'text-[#ef4444]', icon: IconAlertTriangle },
            { label: 'Stripe Balance',   value: fmt(overview?.balance ?? 0),           color: 'text-[#3b82f6]', icon: IconTrendingUp },
            { label: 'Customers',        value: String(overview?.total_customers ?? 0), color: 'text-[#06b6d4]', icon: IconUsers },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-[#1e2836] bg-[#141b26] p-4">
              <stat.icon className={`mb-2 h-4 w-4 ${stat.color}`} />
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-[#8b949e]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: list */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Filters + actions */}
          <div className="flex items-center gap-3 border-b border-[#1e2836] px-6 py-3">
            <div className="flex gap-1">
              {(['all', 'paid', 'open', 'overdue'] as StatusFilter[]).map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-all ${
                    filter === s ? 'bg-[#3b82f6] text-white' : 'text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3]'
                  }`}>
                  {s}
                  <span className="ml-1 text-[9px] opacity-70">
                    {s === 'all'    ? invoices.length
                    : s === 'paid'  ? overview?.paid_count ?? 0
                    : s === 'open'  ? overview?.open_count ?? 0
                    :                 overview?.overdue_count ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={loadAll} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1e2836] text-[#8b949e] hover:text-[#e6edf3]">
                <IconRefresh className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setShowCreate(true); loadCustomers(); }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white">
                <IconPlus className="h-3.5 w-3.5" strokeWidth={2.5} /> New Invoice
              </button>
            </div>
          </div>

          {/* Invoice table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filtered.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-[#8b949e]">No invoices found</div>
            ) : (
              <div className="rounded-2xl border border-[#1e2836] bg-[#141b26] overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-[#1e2836] px-4 py-3">
                  {['Client', 'Amount', 'Due Date', 'Status', ''].map(h => (
                    <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">{h}</p>
                  ))}
                </div>
                {filtered.map(inv => (
                  <button key={inv.id} onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                    className={`group grid w-full grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-[#1e2836] px-4 py-3 text-left transition-colors hover:bg-[#1a2030] last:border-0 ${
                      selected?.id === inv.id ? 'bg-[#1e2836]' : ''
                    }`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#e6edf3]">{inv.customer_name}</p>
                      <p className="truncate text-[10px] text-[#8b949e]">{inv.number ?? inv.id.slice(-8)}</p>
                    </div>
                    <p className="self-center text-sm font-bold text-[#e6edf3]">
                      {fmt(inv.amount_due)} <span className="text-[10px] font-normal text-[#8b949e]">{inv.currency}</span>
                    </p>
                    <p className="self-center text-xs text-[#8b949e]">{fmtDate(inv.due_date)}</p>
                    <div className="self-center">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft}`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 self-center">
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#141b26] hover:text-[#3b82f6]">
                          <IconExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: detail + MRR chart */}
        <div className="w-72 shrink-0 overflow-y-auto border-l border-[#1e2836] bg-[#0f1419] p-5">
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8b949e]">Invoice Detail</p>
                <button onClick={() => setSelected(null)} className="text-[#8b949e] hover:text-[#e6edf3]"><IconX className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div><p className="text-[10px] text-[#8b949e]">Client</p><p className="font-semibold text-[#e6edf3]">{selected.customer_name}</p></div>
                {selected.customer_email && <div><p className="text-[10px] text-[#8b949e]">Email</p><p className="text-[#e6edf3]">{selected.customer_email}</p></div>}
                <div><p className="text-[10px] text-[#8b949e]">Invoice #</p><p className="text-[#e6edf3]">{selected.number ?? '—'}</p></div>
                <div><p className="text-[10px] text-[#8b949e]">Amount</p><p className="text-2xl font-bold text-[#e6edf3]">{fmt(selected.amount_due)}</p></div>
                <div><p className="text-[10px] text-[#8b949e]">Due</p><p className="text-[#e6edf3]">{fmtDate(selected.due_date)}</p></div>
                <div><p className="text-[10px] text-[#8b949e]">Created</p><p className="text-[#e6edf3]">{fmtDate(selected.created)}</p></div>
                <div>
                  <p className="text-[10px] text-[#8b949e]">Status</p>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLE[selected.status] ?? ''}`}>{selected.status}</span>
                </div>
              </div>
              {selected.hosted_invoice_url && (
                <a href={selected.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 py-2.5 text-xs font-semibold text-[#3b82f6] hover:bg-[#3b82f6]/20">
                  <IconExternalLink className="h-3.5 w-3.5" /> View Invoice
                </a>
              )}
            </>
          ) : (
            <>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8b949e]">MRR History</p>
              {mrrHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={mrrHistory} barSize={14}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#8b949e' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#141b26', border: '1px solid #1e2836', borderRadius: 8, fontSize: 11 }}
                      formatter={(v) => [fmt(Number(v)), 'MRR']} labelStyle={{ color: '#8b949e' }} />
                    <Bar dataKey="amount" fill="url(#mrrGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-[#8b949e]">No MRR data yet</p>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between rounded-lg bg-[#141b26] px-3 py-2">
                  <span className="text-xs text-[#8b949e]">Paid invoices</span>
                  <span className="text-xs font-bold text-[#22c55e]">{overview?.paid_count ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#141b26] px-3 py-2">
                  <span className="text-xs text-[#8b949e]">Open invoices</span>
                  <span className="text-xs font-bold text-[#f59e0b]">{overview?.open_count ?? 0}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-[#141b26] px-3 py-2">
                  <span className="text-xs text-[#8b949e]">Overdue</span>
                  <span className="text-xs font-bold text-[#ef4444]">{overview?.overdue_count ?? 0}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create invoice modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" style={{ backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl border border-[#1e2836] bg-[#0f1419] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#e6edf3]">New Invoice</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#8b949e] hover:text-[#e6edf3]"><IconX className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-[#8b949e]">Customer *</label>
                <select value={createCustomerId} onChange={e => setCreateCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-4 py-2.5 text-sm text-[#e6edf3] focus:border-[#3b82f6]/50 focus:outline-none">
                  <option value="">Select customer…</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-[#8b949e]">Amount (USD) *</label>
                <input type="number" value={createAmount} onChange={e => setCreateAmount(e.target.value)} placeholder="e.g. 850"
                  className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-[#8b949e]">Description</label>
                <input value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="e.g. Monthly accounting services"
                  className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="rounded-xl border border-[#1e2836] px-4 py-2 text-xs text-[#8b949e] hover:bg-[#1e2836]">Cancel</button>
              <button onClick={createInvoice} disabled={creating || !createCustomerId || !createAmount}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                {creating ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
