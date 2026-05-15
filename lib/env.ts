import { z } from 'zod';

/**
 * Server-side environment variable validation.
 * This file MUST only be imported in server-side code (API routes, Server Components).
 * It will throw at startup if any required variable is missing.
 */

const serverEnvSchema = z.object({
  // Clerk
  CLERK_SECRET_KEY: z
    .string()
    .min(1, 'CLERK_SECRET_KEY is required')
    .startsWith('sk_', 'CLERK_SECRET_KEY must start with sk_'),

  // Supabase (service role — never expose to client)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  /** Public anon key — optional; only needed if you add a browser Supabase client. Never use service_role in the browser. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks invalid').optional(),
  ),

  /** Optional: dedicated secret for OAuth `state` signing (defaults to CLERK_SECRET_KEY). */
  OAUTH_STATE_SECRET: z.string().min(16).optional(),

  /** Optional: platform Stripe webhooks only (not used for user billing views). */
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  /**
   * 32-byte AES key as 64 hex chars. Prefer **ENCRYPTION_KEY**, then ENCRYPTION_SECRET.
   * Required when persisting user API keys or OAuth tokens at rest.
   */
  ENCRYPTION_SECRET: z.string().min(1).optional(),
  ENCRYPTION_KEY: z.string().min(1).optional(),

  // Google OAuth (optional — app works without it, but Google integrations won't load)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Full callback URL; must match Google Console exactly (e.g. https://app.quivo.site/api/google/auth/callback). */
  GOOGLE_OAUTH_REDIRECT_URI: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  NEXT_PUBLIC_GOOGLE_REDIRECT_URI: z.string().url().optional(),

  /** Dropbox OAuth (optional — Settings → Dropbox “Connect” uses these). */
  DROPBOX_CLIENT_ID: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),
  DROPBOX_CLIENT_SECRET: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),

  /** Upstash Redis (rate limits). Set both URL and token, or omit both (not recommended for production). */
  UPSTASH_REDIS_REST_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().url().optional(),
  ),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional(),
  ),

  /** Bearer token for POST /api/internal/security-log (middleware → server logging). */
  INTERNAL_SECURITY_LOG_SECRET: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(16).optional(),
  ),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
}).superRefine((data, ctx) => {
  const hasUrl = Boolean(data.UPSTASH_REDIS_REST_URL);
  const hasTok = Boolean(data.UPSTASH_REDIS_REST_TOKEN);
  if (hasUrl !== hasTok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or omit both.',
      path: ['UPSTASH_REDIS_REST_URL'],
    });
  }

  const onVercel = process.env.VERCEL === '1';
  const enforceProdSecrets = data.NODE_ENV === 'production' && (onVercel || process.env.ENFORCE_VAULT_ENV === '1');

  if (enforceProdSecrets) {
    if (!data.ENCRYPTION_KEY?.trim() && !data.ENCRYPTION_SECRET?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'ENCRYPTION_KEY (64 hex chars) or ENCRYPTION_SECRET is required for production deploys. On non-Vercel hosts set ENFORCE_VAULT_ENV=1 to fail builds without vault keys.',
        path: ['ENCRYPTION_KEY'],
      });
    }
    if (!hasUrl || !hasTok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for production deploys (API rate limits).',
        path: ['UPSTASH_REDIS_REST_URL'],
      });
    }
  }
});


function validateEnv() {
  const serverResult = serverEnvSchema.safeParse(process.env);

  if (!serverResult.success) {
    const issues = serverResult.error.issues;
    const missing = issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => `  ✗ ${(e.path as unknown[]).join('.')}: ${e.message}`)
      .join('\n');

    throw new Error(
      `\n\n🔴 Missing or invalid environment variables:\n${missing}\n\nCheck your .env.local file.\n`
    );
  }

  return serverResult.data;
}

// Validate once at module load — fails fast at startup
export const env = validateEnv();

// Safe client-side env (only NEXT_PUBLIC_ vars)
export const clientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
