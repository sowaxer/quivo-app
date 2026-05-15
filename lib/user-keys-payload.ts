import { getSecretKeyPreviews, getSecretPresence } from '@/lib/user-secret-store';

/** Public shape for GET /api/user-keys and successful POST (same fields, no secret material). */
export async function buildUserKeysPublicPayload(userId: string) {
  const { has, preferences } = await getSecretPresence(userId);
  const previews = await getSecretKeyPreviews(userId);

  return {
    preferences,
    has: {
      anthropic: has.anthropic,
      openai: has.openai,
      google_ai: has.google_ai,
      deepseek: has.deepseek,
      stripe: has.stripe,
      stripe_pub: has.stripe_publishable,
      tavily: has.tavily,
      notion: has.notion,
    },
    previews,
    dropbox_oauth_configured: Boolean(
      process.env.DROPBOX_CLIENT_ID?.trim() && process.env.DROPBOX_CLIENT_SECRET?.trim(),
    ),
    anthropic_key: null,
    openai_key: null,
    google_ai_key: null,
    deepseek_key: null,
    stripe_secret: null,
    stripe_pub: null,
    tavily_key: null,
    notion_token: null,
  };
}
