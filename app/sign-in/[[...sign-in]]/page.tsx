'use client';

import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

const DEFAULT_REDIRECT = '/dashboard?view=overview';

const clerkAppearance = {
  variables: {
    colorBackground: '#1a1a1a',
    colorInputBackground: '#111111',
    colorInputText: '#fafafa',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorPrimary: '#e07a3a',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full max-w-[400px]',
    card: 'bg-[#1a1a1a] border border-[#2a2a2a] shadow-2xl',
    headerTitle: 'text-[#fafafa]',
    headerSubtitle: 'text-[#a1a1aa]',
    socialButtonsBlockButton: 'border border-[#333] bg-[#111] text-[#fafafa] hover:bg-[#1f1f1f]',
    formButtonPrimary: 'bg-[#fafafa] text-[#111] hover:bg-[#e4e4e7]',
    footerActionLink: 'text-[#e07a3a] hover:text-[#f59e0b]',
  },
} as const;

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
      appearance={clerkAppearance}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4 py-10">
      <div className="text-center">
        <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Quivo</p>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">Sign in to continue</p>
      </div>
      <Suspense
        fallback={
          <div className="flex h-[420px] w-full max-w-[400px] items-center justify-center rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-hover)]" aria-label="Loading sign in" />
          </div>
        }
      >
        <SignInInner />
      </Suspense>
    </div>
  );
}
