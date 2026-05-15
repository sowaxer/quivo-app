'use client';

import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { clerkAppearance } from '@/lib/clerk-appearance';

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
      appearance={{
        ...clerkAppearance,
        elements: {
          ...clerkAppearance.elements,
          headerTitle: 'text-white text-lg font-semibold',
          headerSubtitle: 'text-zinc-300 text-sm',
        },
      }}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="quivo-sign-in flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4 py-10">
      <div className="text-center">
        <p className="text-[22px] font-semibold tracking-[-0.03em] text-white">Quivo</p>
        <p className="mt-1 text-[14px] text-zinc-400">Sign in to continue</p>
      </div>
      <Suspense
        fallback={
          <div className="flex h-[420px] w-full max-w-[400px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900">
            <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-700" aria-label="Loading sign in" />
          </div>
        }
      >
        <SignInInner />
      </Suspense>
    </div>
  );
}
