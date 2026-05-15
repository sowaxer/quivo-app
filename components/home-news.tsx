'use client';

import { useState } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

const NEWS = [
  {
    title: 'US markets steady as investors weigh inflation data',
    time: '2h ago',
    body: 'Major indices held narrow ranges ahead of CPI revisions. Traders focused on megacap tech and energy while bond yields eased slightly.',
  },
  { title: 'Tech earnings season: what to watch this week', time: '4h ago', body: null },
  { title: 'Fed speakers signal patience on rate cuts', time: '6h ago', body: null },
  { title: 'Energy sector leads gains amid supply updates', time: '8h ago', body: null },
  { title: 'Treasury yields dip after jobs report revision', time: '10h ago', body: null },
  { title: 'Semiconductor stocks rally on AI capex outlook', time: '12h ago', body: null },
];

export default function HomeNews() {
  const [expanded, setExpanded] = useState(0);

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-canvas)] px-6 py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="quivo-section-title mb-1">Latest headlines</h2>
        <p className="quivo-caption mb-4">Market news · demo feed</p>
        <div className="overflow-hidden rounded-xl border border-[var(--bg-border)]">
          {NEWS.map((n, i) => {
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
                      {n.title}
                    </p>
                    {open && n.body && <p className="quivo-body mt-2 text-[13px]">{n.body}</p>}
                  </div>
                  <span className="flex shrink-0 items-center gap-2 pt-0.5">
                    <span className="quivo-caption">{n.time}</span>
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
      </div>
    </div>
  );
}
