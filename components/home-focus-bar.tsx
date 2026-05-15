'use client';

import { useCallback, useEffect, useState } from 'react';

export type HomeTopic = 'dashboard' | 'finance' | 'news';

type Quote = { symbol: string; shortName: string; price: number; changePct: number };

const TOPICS: { id: HomeTopic; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'finance', label: 'Finance' },
  { id: 'news', label: 'News' },
];

type Props = {
  active: HomeTopic;
  onChange: (topic: HomeTopic) => void;
};

export default function HomeFocusBar({ active, onChange }: Props) {
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

  return (
    <div className="shrink-0 border-b border-[var(--bg-border)] bg-[var(--bg-canvas)]">
      <div className="flex items-center justify-center gap-8 px-4 pt-3">
        {TOPICS.map(t => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`pb-2.5 text-[14px] font-medium tracking-tight transition-colors ${
                isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t.label}
              {isActive ? (
                <span className="mx-auto mt-1.5 block h-0.5 w-6 rounded-full bg-[var(--text-primary)]" />
              ) : (
                <span className="mt-1.5 block h-0.5 w-6" />
              )}
            </button>
          );
        })}
      </div>

      {active === 'finance' && quotes.length > 0 && (
        <div className="flex items-center gap-5 overflow-x-auto border-t border-[var(--bg-border)] px-4 py-2">
          {quotes.map(q => (
            <div key={q.symbol} className="flex shrink-0 items-baseline gap-2 whitespace-nowrap text-[12px]">
              <span className="text-[var(--text-muted)]">{q.shortName}</span>
              <span className="font-medium tabular-nums text-[var(--text-primary)]">
                {q.price >= 1000
                  ? q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              <span className="tabular-nums text-[var(--text-muted)]">
                {q.changePct >= 0 ? '+' : ''}
                {q.changePct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
