import { z } from 'zod';

/**
 * Conservative string cleanup for display / keyword use only.
 * Prefer Zod + parameterized Supabase filters (`.eq`, `.ilike`) for real safety.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .trim()
    .slice(0, 500);
}

/** Same SQL-ish stripping as `sanitizeString` but preserves long text (e.g. notes). */
export function sanitizeTextContent(input: string, maxLen = 100_000): string {
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .trim()
    .slice(0, maxLen);
}

/** PostgreSQL uuid v1–v5 style ids (row ids), not Clerk user ids. */
export function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** Clerk publishes user ids as `user_…` — never treat them as UUIDs. */
const clerkUserIdSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^user_[a-zA-Z0-9_]+$/, 'Expected Clerk user id');

export function assertValidClerkUserId(userId: string | null | undefined): string {
  const r = clerkUserIdSchema.safeParse(userId);
  if (!r.success) throw new Error('Unauthorized: invalid user id');
  return r.data;
}

export const SearchSchema = z.object({
  query: z.string().min(1).max(200).trim(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
});

export const TavilySearchBodySchema = z.object({
  query: z.string().min(1).max(4000).trim(),
  depth: z.enum(['basic', 'advanced']).optional(),
  max_results: z.number().int().min(1).max(25).optional(),
});

export const UserInputSchema = z.object({
  text: z.string().min(1).max(10000).trim(),
  userId: z.string().regex(/^user_[a-zA-Z0-9_]+$/),
});

export const IdSchema = z.object({
  id: z.string().uuid(),
});

const notePriority = z.enum(['low', 'normal', 'high']);

export const NoteCreateSchema = z.object({
  content: z.string().min(1).max(100_000),
  priority: notePriority.optional(),
  reminder_at: z.union([z.string(), z.null()]).optional(),
  tags: z.array(z.string().max(100)).max(100).optional(),
});

export const NotePatchSchema = z.object({
  noteId: z.string().uuid(),
  status: z.enum(['pending', 'done']).optional(),
  content: z.string().min(1).max(100_000).optional(),
  priority: notePriority.optional(),
  reminder_at: z.union([z.string(), z.null()]).optional(),
  reminded: z.boolean().optional(),
  tags: z.array(z.string().max(100)).max(100).optional(),
});

export const PromptCreateSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100_000),
  tags: z.array(z.string().max(100)).max(100).optional(),
  category: z.string().max(100).optional(),
  icon: z.string().max(32).optional(),
});

export const PromptPatchSchema = z.object({
  promptId: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(100_000).optional(),
  tags: z.array(z.string().max(100)).max(100).optional(),
  category: z.string().max(100).optional(),
  icon: z.string().max(32).optional(),
});

export const DriveUploadBodySchema = z.object({
  name: z.string().min(1).max(500),
  content: z.string().min(1).max(15_000_000),
  mimeType: z.string().max(200).optional(),
  folderId: z.string().max(200).optional(),
});

export const UserKeysDeleteFieldSchema = z.object({
  field: z.enum([
    'anthropic_key',
    'openai_key',
    'google_ai_key',
    'deepseek_key',
    'stripe_secret',
    'stripe_pub',
    'tavily_key',
    'notion_token',
  ]),
});
