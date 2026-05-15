'use client';

import { SignUp } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerk-appearance';

export default function SignUpPage() {
  return (
    <div className="quivo-sign-in flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4 py-10">
      <div className="text-center">
        <p className="text-[22px] font-semibold tracking-[-0.03em] text-white">Quivo</p>
        <p className="mt-1 text-[14px] text-zinc-400">Create your account</p>
      </div>
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard?view=overview"
        fallbackRedirectUrl="/dashboard?view=overview"
        appearance={{
          ...clerkAppearance,
          elements: {
            ...clerkAppearance.elements,
            headerTitle: 'text-white text-lg font-semibold',
            headerSubtitle: 'text-zinc-300 text-sm',
          },
        }}
      />
    </div>
  );
}
