import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/internal/security-log
 * Edge middleware (or other server) reports events. Requires INTERNAL_SECURITY_LOG_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INTERNAL_SECURITY_LOG_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'Logging not configured' }, { status: 501 });
  }

  const authz = req.headers.get('authorization');
  const token = authz?.startsWith('Bearer ') ? authz.slice(7).trim() : '';
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { event_type?: string; ip?: string; path?: string; detail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event_type = typeof body.event_type === 'string' ? body.event_type.slice(0, 120) : '';
  if (!event_type) {
    return NextResponse.json({ error: 'event_type required' }, { status: 400 });
  }

  const ip = typeof body.ip === 'string' ? body.ip.slice(0, 80) : null;
  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : null;
  const detail = typeof body.detail === 'string' ? body.detail.slice(0, 2000) : null;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('security_logs').insert({
      event_type,
      ip,
      path,
      detail,
    });
    if (error) {
      console.error('[security-log]', error.message);
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'insert failed';
    console.error('[security-log]', msg);
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
