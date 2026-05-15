/**
 * GET /api/dropbox/files?path=/   → list files
 * GET /api/dropbox/files?search=query → search files
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { sanitizeTextContent } from '@/lib/db-safe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { decryptOptionalToken } from '@/lib/encrypted-field';

function db() {
  return getSupabaseAdmin();
}

async function getToken(userId: string): Promise<string | null> {
  const { data } = await db().from('dropbox_tokens').select('access_token').eq('user_id', userId).single();
  return decryptOptionalToken(data?.access_token as string | undefined);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('dropbox-files', userId));
  if (rlDenied) return rlDenied;

  const token = await getToken(userId);
  if (!token) return NextResponse.json({ code: 'NOT_CONNECTED' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const searchRaw = searchParams.get('search');
  const pathRaw = searchParams.get('path') ?? '';
  const search = searchRaw ? sanitizeTextContent(searchRaw, 500) : null;
  const path = sanitizeTextContent(pathRaw, 2000);

  try {
    if (search) {
      const res = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: search, options: { max_results: 20 } }),
      });
      const data = await res.json();
      return NextResponse.json({ files: data.matches?.map((m: { metadata: { metadata: unknown } }) => m.metadata?.metadata) ?? [] });
    }

    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path || '', recursive: false, limit: 50 }),
    });
    const data = await res.json();

    if (data.error_summary) return NextResponse.json({ error: data.error_summary }, { status: 400 });

    return NextResponse.json({ files: data.entries ?? [], cursor: data.cursor, has_more: data.has_more });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
