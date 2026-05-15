'use client';

import { useMemo } from 'react';

type Props = {
  positive: boolean;
  id: string;
  width?: number;
  height?: number;
};

/** Minimal sparkline with soft gradient fill (Perplexity Finance style). */
export function FinanceSparkline({ positive, id, width = 88, height = 36 }: Props) {
  const { line, area } = useMemo(() => {
    const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const pts: { x: number; y: number }[] = [];
    const n = 10;
    let y = height * (positive ? 0.72 : 0.28);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const drift = positive ? -1.2 : 1.2;
      y += drift + Math.sin(seed * 0.3 + i * 0.9) * 2.8;
      y = Math.max(4, Math.min(height - 4, y));
      pts.push({ x, y });
    }
    const lineStr = pts.map(p => `${p.x},${p.y}`).join(' ');
    const areaStr = `${lineStr} ${width},${height} 0,${height}`;
    return { line: lineStr, area: areaStr };
  }, [positive, id, width, height]);

  const stroke = positive ? 'var(--finance-up)' : 'var(--finance-down)';
  const gradId = `spark-${id.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function changeClass(pct: number) {
  if (pct > 0) return 'quivo-finance-up';
  if (pct < 0) return 'quivo-finance-down';
  return 'text-[var(--text-muted)]';
}

export function formatChange(pct: number) {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}
