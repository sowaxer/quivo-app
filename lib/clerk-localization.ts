import type { LocalizationResource } from '@clerk/shared/types';

/** Override Clerk dashboard app name in auth UI (e.g. "Sign in to Quivo"). */
export const quivoClerkLocalization: LocalizationResource = {
  signIn: {
    start: {
      title: 'Sign in to Quivo',
      titleCombined: 'Sign in to Quivo',
      subtitle: 'Welcome back — use Google or your email.',
      subtitleCombined: 'Welcome back — use Google or your email.',
    },
  },
  signUp: {
    start: {
      title: 'Create your Quivo account',
      titleCombined: 'Create your Quivo account',
      subtitle: 'Use Google or your email to get started.',
      subtitleCombined: 'Use Google or your email to get started.',
    },
  },
};
