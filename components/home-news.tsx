'use client';

import { IconChevronDown } from '@tabler/icons-react';

const NEWS = [
  { title: 'US markets steady as investors weigh inflation data', time: '2h ago' },
  { title: 'Tech earnings season: what to watch this week', time: '4h ago' },
  { title: 'Fed speakers signal patience on rate cuts', time: '6h ago' },
  { title: 'Energy sector leads gains amid supply updates', time: '8h ago' },
  { title: 'Treasury yields dip after jobs report revision', time: '10h ago' },
  { title: 'Semiconductor stocks rally on AI capex outlook', time: '12h ago' },
];

export default function HomeNews() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">Latest headlines</h2>
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
    </div>
  );
}
