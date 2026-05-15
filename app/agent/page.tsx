import AgentChat from '@/components/AgentChat';

export const metadata = {
  title: 'Quivo Agent',
  description: 'Accounting agent with your API keys — Stripe, Gmail, QuickBooks, bank statements',
};

export default function AgentPage() {
  return (
    <div className="flex h-screen flex-col bg-[var(--bg-base)]">
      <AgentChat />
    </div>
  );
}
