'use client';

import { IconArrowLeft, IconSearch } from '@tabler/icons-react';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

type Props = {
  title: string;
  subtitle?: string;
  showBack: boolean;
  onBack: () => void;
  showSearch?: boolean;
};

export function ViewChrome({ title, subtitle, showBack, onBack, showSearch = true }: Props) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--bg-border)] bg-[var(--bg-canvas)]/90 px-4 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="quivo-btn-ghost flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium"
            aria-label="Go back"
          >
            <IconArrowLeft className="h-4 w-4" stroke={2} />
            <span className="hidden sm:inline">Back</span>
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[12px] text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showSearch ? (
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bg-border)] bg-[var(--bg-card)]/60 text-[var(--text-secondary)] backdrop-blur-sm transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            aria-label="Search"
          >
            <IconSearch className="h-4 w-4" stroke={1.75} />
          </button>
        ) : null}
        <NotificationsDropdown />
      </div>
    </header>
  );
}
