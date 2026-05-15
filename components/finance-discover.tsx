'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconSearch, IconChevronDown } from '@tabler/icons-react';

type Quote = { symbol: string; shortName: string; price: number; changePct: number };

const NEWS = [
  { title: 'US markets steady as investors weigh inflation data', time: '2h ago' },
  { title: 'Tech earnings season: what to watch this week', time: '4h ago' },
  { title: 'Fed speakers signal patience on rate cuts', time: '6h ago' },
  { title: 'Energy sector leads gains amid supply updates', time: '8h ago' },
];

export default function FinanceDiscover() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/market-ticker', { cache: 'no-store' });
      const d = (await r.json()) as { quotes?: Quote[] };
      if (Array.isArray(d.quotes)) setQuotes(d.quotes.slice(0, 4));
    } catch {
      setQuotes([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[var(--bg-border)] px-6 py-4">
        <div className="relative mx-auto max-w-2xl">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search stocks, crypto, and more…"
            className="w-full rounded-full border border-[var(--bg-border)] bg-[var(--bg-card)] py-3 pl-11 pr-4 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--text-muted)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-4xl space-y-6">
          {quotes.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quotes.map(q => (
                <div
                  key={q.symbol}
                  className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-4 transition hover:bg-[var(--bg-hover)]"
                >
                  <p className="text-[12px] text-[var(--text-muted)]">{q.shortName}</p>
                  <p className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
                    {q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-0.5 text-[12px] tabular-nums text-[var(--text-secondary)]">
                    {q.changePct >= 0 ? '+' : ''}
                    {q.changePct.toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          )}

          <div>
            <h2 className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">Market summary</h2>
            <div className="divide-y divide-[var(--bg-border)] rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)]">
              {NEWS.map((n, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-[var(--bg-hover)]"
                >
                  <span className="text-[14px] text-[var(--text-primary)]">{n.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] text-[var(--text-muted)]">
                    {n.time}
                    <IconChevronDown className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              Ask anything about US markets in{' '}
              <span className="text-[var(--text-primary)]">Chat</span> — your keys, your providers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
