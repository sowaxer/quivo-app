import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { IdSchema, PromptCreateSchema, PromptPatchSchema, sanitizeTextContent } from '@/lib/db-safe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function db() {
  return getSupabaseAdmin();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('prompts-get', userId));
  if (rlDenied) return rlDenied;

  try {
    const { data } = await db()
      .from('user_prompts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return NextResponse.json({ prompts: data ?? [] });
  } catch { return NextResponse.json({ prompts: [] }); }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('prompts-post', userId));
  if (rlDenied) return rlDenied;

  const raw = await req.json();
  const parsed = PromptCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { title, content, tags = [], category = 'Custom', icon = '💬' } = parsed.data;

  const { data, error } = await db()
    .from('user_prompts')
    .insert({
      user_id: userId,
      title: sanitizeTextContent(title, 500),
      content: sanitizeTextContent(content),
      tags,
      category: sanitizeTextContent(category, 100),
      icon: sanitizeTextContent(icon, 32),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('prompts-del', userId));
  if (rlDenied) return rlDenied;

  const { promptId } = await req.json();
  if (!promptId) return NextResponse.json({ error: 'promptId required' }, { status: 400 });
  const idParsed = IdSchema.safeParse({ id: promptId });
  if (!idParsed.success) return NextResponse.json({ error: 'Invalid promptId' }, { status: 400 });

  await db().from('user_prompts').delete().eq('id', promptId).eq('user_id', userId);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('prompts-patch', userId));
  if (rlDenied) return rlDenied;

  const raw = await req.json();
  const parsed = PromptPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { promptId, ...updates } = parsed.data;

  const allowed = ['title', 'content', 'tags', 'category', 'icon'] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    const v = updates[k];
    if (v === undefined) continue;
    if (k === 'title' && typeof v === 'string') patch[k] = sanitizeTextContent(v, 500);
    else if (k === 'content' && typeof v === 'string') patch[k] = sanitizeTextContent(v);
    else if (k === 'category' && typeof v === 'string') patch[k] = sanitizeTextContent(v, 100);
    else if (k === 'icon' && typeof v === 'string') patch[k] = sanitizeTextContent(v, 32);
    else patch[k] = v;
  }

  await db().from('user_prompts').update(patch).eq('id', promptId).eq('user_id', userId);
  return NextResponse.json({ success: true });
}
