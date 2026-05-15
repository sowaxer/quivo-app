/** Provider ids accepted by /api/keys/* (must match verifySecretBeforeSave + vault). */
export const KEYS_API_PROVIDERS = new Set([
  'anthropic',
  'openai',
  'google_ai',
  'deepseek',
  'stripe_secret',
  'stripe_publishable',
  'tavily',
  'notion',
]);
