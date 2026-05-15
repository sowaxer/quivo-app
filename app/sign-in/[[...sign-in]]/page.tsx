'use client';

import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

const DEFAULT_REDIRECT = '/dashboard?view=overview';

function SignInInner() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || DEFAULT_REDIRECT;

  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      forceRedirectUrl={redirectUrl}
      fallbackRedirectUrl={redirectUrl}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4">
      <Suspense fallback={<div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-hover)]" aria-hidden />}>
        <SignInInner />
      </Suspense>
    </div>
  );
}
