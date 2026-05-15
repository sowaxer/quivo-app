'use client';

import { useUser } from '@clerk/nextjs';
import { UserAvatar } from '@/components/user-avatar';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { getUserDisplayName } from '@/lib/user-display';
import { IconLogin, IconLogout, IconSwitchHorizontal } from '@tabler/icons-react';

export function SidebarUserMenu({ today }: { today: string }) {
  const { isLoaded, isSignedIn, logout, switchAccount, login } = useAuthActions();
  const { user } = useUser();
  const name = getUserDisplayName(user);
  const firstName = name.split(' ')[0] ?? name;
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="border-b border-[var(--bg-border)] px-4 py-3">
      <div className="flex items-center gap-3">
        <UserAvatar size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {isLoaded ? (isSignedIn ? `Hi, ${firstName}` : 'Welcome') : '…'}
          </p>
          <p className="truncate text-[12px] text-[var(--text-muted)]">
            {isLoaded && isSignedIn ? (email ?? today) : 'Sign in to sync your workspace'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {isSignedIn ? (
          <>
            <button
              type="button"
              onClick={() => void switchAccount()}
              className="quivo-btn-primary flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[12px] font-semibold"
            >
              <IconSwitchHorizontal className="h-4 w-4" stroke={1.75} />
              Switch account
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="quivo-btn-ghost flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium"
            >
              <IconLogout className="h-4 w-4" stroke={1.75} />
              Log out
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={login}
            className="quivo-btn-primary flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[12px] font-semibold"
          >
            <IconLogin className="h-4 w-4" stroke={2} />
            Log in
          </button>
        )}
      </div>
    </div>
  );
}
