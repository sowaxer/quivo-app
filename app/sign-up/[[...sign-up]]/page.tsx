import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            cardBox: 'shadow-xl',
          },
        }}
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
