import AgentChat from '@/components/AgentChat';

export const metadata = {
  title: 'Quivo Agent',
  description: 'Accounting agent with your API keys — Stripe, Gmail, QuickBooks, bank statements',
};

export default function AgentPage() {
  return (
    <div className="flex h-screen flex-col bg-[var(--bg-canvas)]">
      <div className="min-h-0 flex-1">
        <AgentChat fullWidth showBack />
      </div>
    </div>
  );
}
