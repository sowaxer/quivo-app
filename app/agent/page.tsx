import AgentChat from '@/components/AgentChat';

export const metadata = {
  title: 'Quivo Agent',
  description: 'Accounting agent with your API keys — Stripe, Gmail, QuickBooks, bank statements',
};

export default function AgentPage() {
  return (
    <div className="flex h-screen flex-col bg-[var(--bg-canvas)]">
      <div className="shrink-0 border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-2 text-center text-[12px] text-[var(--text-muted)]">
        Quivo no incluye keys de IA —{' '}
        <strong className="text-[var(--text-secondary)]">configura las tuyas</strong> con el botón
        API Keys.
      </div>
      <div className="min-h-0 flex-1">
        <AgentChat fullWidth />
      </div>
    </div>
  );
}
