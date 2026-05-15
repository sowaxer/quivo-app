'use client';

import { useState } from 'react';
import HomeFocusBar, { type HomeTopic } from '@/components/home-focus-bar';
import FinanceDiscover from '@/components/finance-discover';
import AttioOverview from '@/components/attio-overview';

type View = string;

export default function HomeHub({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const [topic, setTopic] = useState<HomeTopic>('finance');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HomeFocusBar active={topic} onChange={setTopic} />
      {topic === 'finance' && <FinanceDiscover />}
      {topic === 'market' && (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="max-w-md text-[14px] text-[var(--text-muted)]">
            Market-wide view coming soon — powered by Yahoo Finance data.
          </p>
        </div>
      )}
      {topic === 'politics' && (
        <div className="flex-1 overflow-hidden">
          <AttioOverview onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

function motion({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}
