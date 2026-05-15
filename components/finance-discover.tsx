'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconSearch, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { FinanceSparkline, changeClass, formatChange } from '@/components/finance-sparkline';

type Quote = { symbol: string; shortName: string; price: number; changePct: number };

const SUMMARY = [
  {
    title: 'US markets steady as investors weigh inflation data',
    time: '2h ago',
    body: 'Major indices held narrow ranges ahead of CPI revisions. Traders focused on megacap tech and energy while bond yields eased slightly.',
  },
  { title: 'Tech earnings season: what to watch this week', time: '4h ago', body: null },
  { title: 'Fed speakers signal patience on rate cuts', time: '6h ago', body: null },
  { title: 'Energy sector leads gains amid supply updates', time: '8h ago', body: null },
];

const WATCHLIST = [
  { symbol: 'META', name: 'Meta', price: 612.4, changePct: 1.24 },
  { symbol: 'AAPL', name: 'Apple', price: 227.8, changePct: -0.38 },
  { symbol: 'NVDA', name: 'NVIDIA', price: 128.5, changePct: 2.91 },
  { symbol: 'MSFT', name: 'Microsoft', price: 442.1, changePct: 0.52 },
];

export default function FinanceDiscover() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(0);

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
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-canvas)]">
      <div className="shrink-0 px-6 py-5">
        <div className="relative mx-auto max-w-xl">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" stroke={1.5} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search stocks, crypto, and more…"
            className="w-full rounded-full border border-[var(--bg-border)] bg-[var(--bg-elevated)] py-2.5 pl-11 pr-4 text-[14px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--text-muted)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-8">
            {quotes.length > 0 && (
              <section>
                <h2 className="quivo-section-title mb-3">Top Assets</h2>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {quotes.map(q => (
                    <div key={q.symbol} className="quivo-finance-card flex flex-col gap-2 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="quivo-label truncate">{q.shortName}</p>
                          <p className="quivo-data-lg mt-0.5">
                            {q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </p>
                          <p className={changeClass(q.changePct)}>{formatChange(q.changePct)}</p>
                        </div>
                        <FinanceSparkline positive={q.changePct >= 0} id={q.symbol} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="quivo-section-title mb-1">Market Summary</h2>
              <p className="quivo-caption mb-3">Curated headlines · demo</p>
              <div className="overflow-hidden rounded-xl border border-[var(--bg-border)] bg-[var(--bg-canvas)]">
                {SUMMARY.map((item, i) => {
                  const open = expanded === i;
                  return (
                    <div key={i} className="quivo-finance-row">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? -1 : i)}
                        className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-[var(--bg-elevated)]/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[14px] leading-snug tracking-[-0.02em] ${
                              open ? 'font-medium text-[var(--text-primary)]' : 'font-normal text-[var(--text-secondary)]'
                            }`}
                          >
                            {item.title}
                          </p>
                          {open && item.body && (
                            <p className="quivo-body mt-2 text-[13px]">{item.body}</p>
                          )}
                        </div>
                        <span className="flex shrink-0 items-center gap-2 pt-0.5">
                          <span className="quivo-caption">{item.time}</span>
                          {open ? (
                            <IconChevronUp className="h-4 w-4 text-[var(--text-faint)]" stroke={1.5} />
                          ) : (
                            <IconChevronDown className="h-4 w-4 text-[var(--text-faint)]" stroke={1.5} />
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3">
              <p className="text-[13px] font-normal text-[var(--text-muted)]">
                Ask anything about US markets in{' '}
                <span className="font-medium text-[var(--text-primary)]">Chat</span>
                <span className="text-[var(--text-faint)]"> — your keys, your providers.</span>
              </p>
            </div>
          </div>

          <aside className="space-y-6">
            <section>
              <h2 className="quivo-section-title mb-3">Watchlist</h2>
              <div className="overflow-hidden rounded-xl border border-[var(--bg-border)]">
                {WATCHLIST.map((w, i) => (
                  <div
                    key={w.symbol}
                    className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-[var(--bg-border)]' : ''}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[11px] font-semibold text-[var(--text-muted)]">
                      {w.symbol.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="quivo-label-strong">{w.name}</p>
                      <p className="quivo-caption">{w.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="quivo-data-md">{w.price.toFixed(2)}</p>
                      <p className={changeClass(w.changePct)}>{formatChange(w.changePct)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
