'use client';

import { useState } from 'react';
import HomeFocusBar, { type HomeTopic } from '@/components/home-focus-bar';
import FinanceDiscover from '@/components/finance-discover';
import HomeNews from '@/components/home-news';
import AttioOverview from '@/components/attio-overview';

type View = string;

export default function HomeHub({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const [topic, setTopic] = useState<HomeTopic>('dashboard');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HomeFocusBar active={topic} onChange={setTopic} />
      {topic === 'dashboard' && (
        <div className="flex-1 overflow-hidden">
          <AttioOverview onNavigate={onNavigate} />
        </div>
      )}
      {topic === 'finance' && <FinanceDiscover />}
      {topic === 'news' && <HomeNews />}
    </div>
  );
}
