'use client';

import { useEffect, useState, useCallback } from 'react';

type Quote = { symbol: string; shortName: string; price: number; changePct: number };

/** Minimal top strip on Chat home — markets only (Perplexity-style, no category tabs). */
export default function PerplexityFocusBar() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/market-ticker', { cache: 'no-store' });
      const d = (await r.json()) as { quotes?: Quote[] };
      if (Array.isArray(d.quotes)) setQuotes(d.quotes);
    } catch {
      setQuotes([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 90_000);
    return () => clearInterval(id);
  }, [load]);

  if (quotes.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-[var(--bg-border)] bg-[var(--bg-base)]/90 px-4 py-2 backdrop-blur-md">
      <div className="flex items-center gap-4 overflow-x-auto">
        {quotes.slice(0, 6).map(q => (
          <div key={q.symbol} className="flex shrink-0 items-baseline gap-2 whitespace-nowrap text-[12px]">
            <span className="text-[var(--text-muted)]">{q.shortName}</span>
            <span className="font-medium tabular-nums text-[var(--text-primary)]">
              {q.price >= 1000
                ? q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                : q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span
              className={`font-medium tabular-nums ${
                q.changePct >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {q.changePct >= 0 ? '+' : ''}
              {q.changePct.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
