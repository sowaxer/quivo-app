'use client';

import { useCallback, useEffect, useState } from 'react';
import { changeClass, formatChange } from '@/components/finance-sparkline';

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
      <div className="flex items-center justify-center gap-10 px-4 pt-3">
        {TOPICS.map(t => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`pb-2.5 text-[13px] tracking-[-0.02em] transition-colors ${
                isActive
                  ? 'font-medium text-[var(--text-primary)]'
                  : 'font-normal text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t.label}
              {isActive ? (
                <span className="mx-auto mt-2 block h-px w-full max-w-[2rem] bg-[var(--text-primary)]" />
              ) : (
                <span className="mt-2 block h-px w-full max-w-[2rem]" />
              )}
            </button>
          );
        })}
      </div>

      {active === 'finance' && quotes.length > 0 && (
        <div className="flex items-center gap-6 overflow-x-auto border-t border-[var(--bg-border)] px-4 py-2.5">
          {quotes.map(q => (
            <div key={q.symbol} className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
              <span className="quivo-label">{q.shortName}</span>
              <span className="text-[12px] font-medium tabular-nums text-[var(--text-primary)]">
                {q.price >= 1000
                  ? q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              <span className={changeClass(q.changePct)}>{formatChange(q.changePct)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
