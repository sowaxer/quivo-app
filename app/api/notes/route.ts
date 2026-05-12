import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { IdSchema, NoteCreateSchema, NotePatchSchema, sanitizeTextContent } from '@/lib/db-safe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function getSupabase() {
  return getSupabaseAdmin();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('notes-get', userId));
  if (rlDenied) return rlDenied;

  try {
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ notes: [] });
    return NextResponse.json({ notes: data ?? [] });
  } catch {
    return NextResponse.json({ notes: [] });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('notes-post', userId));
  if (rlDenied) return rlDenied;

  const raw = await req.json();
  const parsed = NoteCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { content, priority = 'normal', reminder_at, tags = [] } = parsed.data;
  const safeContent = sanitizeTextContent(content);

  const { data, error } = await getSupabase()
    .from('notes')
    .insert({
      user_id: userId,
      content: safeContent,
      status: 'pending',
      priority,
      reminder_at: reminder_at ?? null,
      tags,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('notes-patch', userId));
  if (rlDenied) return rlDenied;

  const raw = await req.json();
  const parsed = NotePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { noteId, ...updates } = parsed.data;

  const allowed = ['status', 'content', 'priority', 'reminder_at', 'reminded', 'tags'] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (k in updates && updates[k as keyof typeof updates] !== undefined) {
      const v = updates[k as keyof typeof updates];
      if (k === 'content' && typeof v === 'string') patch[k] = sanitizeTextContent(v);
      else patch[k] = v;
    }
  }

  const { error } = await getSupabase()
    .from('notes')
    .update(patch)
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('notes-del', userId));
  if (rlDenied) return rlDenied;

  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 });
  const idParsed = IdSchema.safeParse({ id: noteId });
  if (!idParsed.success) return NextResponse.json({ error: 'Invalid noteId' }, { status: 400 });

  const { error } = await getSupabase()
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
