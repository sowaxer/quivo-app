'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';

const FOCUS = [
  { id: 'discover', label: 'Discover' },
  { id: 'finance', label: 'Finance' },
  { id: 'health', label: 'Health' },
  { id: 'academic', label: 'Academic' },
  { id: 'patents', label: 'Patents' },
] as const;

type Quote = { symbol: string; shortName: string; price: number; changePct: number };

export default function PerplexityFocusBar() {
  const { resolved } = useTheme();
  const [focus, setFocus] = useState<(typeof FOCUS)[number]['id']>('finance');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [source, setSource] = useState<'yahoo' | 'finnhub' | 'demo' | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/market-ticker', { cache: 'no-store' });
      const d = (await r.json()) as { quotes?: Quote[]; source?: 'yahoo' | 'finnhub' | 'demo' };
      if (Array.isArray(d.quotes)) {
        setQuotes(d.quotes);
        setSource(d.source ?? 'demo');
      }
    } catch {
      setQuotes([]);
      setSource(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 90_000);
    return () => clearInterval(id);
  }, [load]);

  const isLight = resolved === 'light';

  return (
    <div
      className="shrink-0 border-b border-[var(--bg-border)] bg-[var(--bg-base)]"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1 px-4 py-2">
        {FOCUS.map(item => {
          const active = focus === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFocus(item.id)}
              className={`flex flex-col items-center gap-1.5 pb-0.5 text-[13px] font-medium tracking-tight transition-colors ${
                active
                  ? isLight
                    ? 'text-neutral-900'
                    : 'text-white'
                  : isLight
                    ? 'text-neutral-500 hover:text-neutral-800'
                    : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {item.label}
              {active ? (
                <span
                  className={`h-0.5 w-7 shrink-0 rounded-full ${isLight ? 'bg-neutral-900' : 'bg-white'}`}
                  aria-hidden
                />
              ) : (
                <span className="h-0.5 w-7 shrink-0 opacity-0" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div
        className="flex items-center gap-3 overflow-x-auto border-t border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-1.5"
      >
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            isLight ? 'text-neutral-400' : 'text-neutral-500'
          }`}
        >
          Markets
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-5">
          {quotes.length === 0 ? (
            <span className={isLight ? 'text-xs text-neutral-400' : 'text-xs text-neutral-500'}>
              Loading quotes…
            </span>
          ) : (
            quotes.map(q => (
              <div key={q.symbol} className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
                <span className={isLight ? 'text-xs text-neutral-600' : 'text-xs text-neutral-400'}>
                  {q.shortName}
                </span>
                <span className={isLight ? 'text-xs font-medium tabular-nums text-neutral-900' : 'text-xs font-medium tabular-nums text-neutral-200'}>
                  {q.price >= 1000 ? q.price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-xs font-medium tabular-nums ${
                    q.changePct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {q.changePct >= 0 ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                </span>
              </div>
            ))
          )}
        </div>
        {source === 'demo' ? (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
              isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/15 text-amber-200/90'
            }`}
            title="Cotizaciones de demostración. Para datos en vivo: permitir salida a Yahoo desde el servidor o definir FINNHUB_API_KEY."
          >
            Demo
          </span>
        ) : source === 'finnhub' ? (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
              isLight ? 'bg-sky-100 text-sky-900' : 'bg-sky-500/15 text-sky-200/90'
            }`}
            title="Datos en vivo vía Finnhub (respaldo cuando Yahoo no está disponible)."
          >
            Finnhub
          </span>
        ) : null}
      </div>
    </div>
  );
}
