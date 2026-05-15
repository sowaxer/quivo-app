/** App-wide primary for Clerk UI (sign-in / sign-up). */
export const CLERK_PRIMARY = '#2563eb';
export const CLERK_PRIMARY_LIGHT = '#3b82f6';

/** High-contrast dark Clerk card — readable text, blue primary. */
export const clerkAppearance = {
  variables: {
    colorPrimary: CLERK_PRIMARY,
    colorDanger: '#ef4444',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorBackground: '#1c1c1c',
    colorInputBackground: '#27272a',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#d4d4d8',
    colorTextOnPrimaryBackground: '#ffffff',
    colorNeutral: '#a1a1aa',
    colorMuted: '#27272a',
    colorMutedForeground: '#e4e4e7',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full max-w-[400px]',
    card: 'bg-[#1c1c1c] border border-[#52525b] shadow-2xl',
    headerTitle: 'text-white text-lg font-semibold !text-white',
    headerSubtitle: 'text-zinc-300',
    socialButtonsBlockButton:
      'bg-zinc-800 border border-zinc-600 text-white hover:bg-zinc-700 [&_*]:text-white',
    socialButtonsBlockButtonText: 'text-white font-medium',
    socialButtonsProviderIcon: 'opacity-100',
    dividerLine: 'bg-zinc-600',
    dividerText: 'text-zinc-400',
    formFieldLabel: 'text-zinc-200',
    formFieldInput:
      'bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-blue-500',
    formButtonPrimary:
      'bg-blue-600 text-white hover:bg-blue-500 font-semibold shadow-none normal-case',
    footerActionText: 'text-zinc-400',
    footerActionLink: 'text-blue-400 hover:text-blue-300 font-medium',
    identityPreviewText: 'text-white',
    identityPreviewEditButton: 'text-blue-400',
    formResendCodeLink: 'text-blue-400',
    otpCodeFieldInput: 'bg-zinc-800 border-zinc-600 text-white',
    alertText: 'text-white',
    formFieldInputShowPasswordButton: 'text-zinc-400',
    footer: 'bg-transparent',
    navbar: 'hidden',
    logoBox: 'hidden',
    formHeaderTitle: 'text-white',
    formHeaderSubtitle: 'text-zinc-300',
    alternativeMethodsBlockButton: 'text-white border-zinc-600',
  },
} as const;
