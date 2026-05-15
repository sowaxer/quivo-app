'use client';

import { IconX, IconFileInvoice } from '@tabler/icons-react';
import BankStatementProcessor from '@/components/BankStatementProcessor';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BankStatementSidePanel({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar panel"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-[var(--bg-border)] bg-[var(--bg-sidebar)] shadow-2xl"
        role="dialog"
        aria-labelledby="bank-statement-panel-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--bg-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-card)] text-[var(--quivo-accent)]">
              <IconFileInvoice className="h-5 w-5" stroke={1.75} />
            </span>
            <div>
              <h2
                id="bank-statement-panel-title"
                className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
              >
                Bank statements
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">PDF → Excel · Schedule C</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            aria-label="Cerrar"
          >
            <IconX className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <BankStatementProcessor compact />
        </div>
      </aside>
    </>
  );
}
