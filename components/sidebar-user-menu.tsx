'use client';

import { SignInButton, SignOutButton, useUser } from '@clerk/nextjs';
import { UserAvatar } from '@/components/user-avatar';
import { getUserDisplayName } from '@/lib/user-display';
import { IconLogin, IconLogout } from '@tabler/icons-react';

export function SidebarUserMenu({ today }: { today: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const name = getUserDisplayName(user);
  const firstName = name.split(' ')[0] ?? name;

  return (
    <div className="border-b border-[var(--bg-border)] px-4 py-3">
      <div className="flex items-center gap-3">
        <UserAvatar size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {isLoaded ? (isSignedIn ? `Hi, ${firstName}` : 'Welcome') : '…'}
          </p>
          <p className="truncate text-[12px] text-[var(--text-muted)]">
            {isLoaded && isSignedIn ? today : 'Sign in to sync your workspace'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {isSignedIn ? (
          <SignOutButton redirectUrl="/sign-in">
            <button
              type="button"
              className="quivo-btn-ghost flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium"
            >
              <IconLogout className="h-4 w-4" stroke={1.75} />
              Log out
            </button>
          </SignOutButton>
        ) : (
          <SignInButton mode="modal">
            <button
              type="button"
              className="quivo-btn-gradient flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-semibold"
            >
              <IconLogin className="h-4 w-4" stroke={2} />
              Log in
            </button>
          </SignInButton>
        )}
      </div>
    </div>
  );
}
