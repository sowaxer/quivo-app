'use client';

import { useCallback } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';

const SIGN_IN_URL = '/sign-in';

function redirectToSignIn() {
  const url = `${SIGN_IN_URL}?redirect_url=${encodeURIComponent('/dashboard')}`;
  window.location.assign(url);
}

export function useAuthActions() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut, openSignIn } = useClerk();

  const logout = useCallback(async () => {
    try {
      if (isSignedIn) {
        await signOut();
      }
    } catch {
      /* session may already be invalid */
    }
    redirectToSignIn();
  }, [isSignedIn, signOut]);

  const switchAccount = useCallback(async () => {
    await logout();
  }, [logout]);

  const login = useCallback(() => {
    if (isSignedIn) {
      redirectToSignIn();
      return;
    }
    try {
      openSignIn({ forceRedirectUrl: '/dashboard' });
    } catch {
      redirectToSignIn();
    }
  }, [isSignedIn, openSignIn]);

  return { isLoaded, isSignedIn, logout, switchAccount, login };
}
