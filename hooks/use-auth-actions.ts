'use client';

import { useCallback } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';

const SIGN_IN_PATH = '/sign-in';
const DEFAULT_AFTER_AUTH = '/dashboard?view=overview';

function signInHref(redirectPath?: string): string {
  const target =
    redirectPath ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}` || DEFAULT_AFTER_AUTH
      : DEFAULT_AFTER_AUTH);
  return `${SIGN_IN_PATH}?redirect_url=${encodeURIComponent(target)}`;
}

export function useAuthActions() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  const logout = useCallback(async () => {
    try {
      await signOut({ redirectUrl: SIGN_IN_PATH });
    } catch {
      window.location.assign(SIGN_IN_PATH);
    }
  }, [signOut]);

  const switchAccount = useCallback(async () => {
    try {
      await signOut({ redirectUrl: signInHref(DEFAULT_AFTER_AUTH) });
    } catch {
      window.location.assign(signInHref(DEFAULT_AFTER_AUTH));
    }
  }, [signOut]);

  /** Full-page sign-in (reliable on Vercel, localhost, and external links — no modal). */
  const login = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isSignedIn) {
      window.location.assign(DEFAULT_AFTER_AUTH);
      return;
    }
    window.location.assign(signInHref());
  }, [isSignedIn]);

  return { isLoaded, isSignedIn, logout, switchAccount, login };
}
