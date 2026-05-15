import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getDecryptedSecret, touchSecretLastUsed } from '@/lib/user-secret-store';

function db() {
  return getSupabaseAdmin();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('briefing', userId));
  if (rlDenied) return rlDenied;

  let pendingNotes = 0;
  let overdueInvoices = 0;

  // Notes count (graceful if table missing)
  try {
    const { data } = await db()
      .from('notes')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending');
    pendingNotes = data?.length ?? 0;
  } catch { pendingNotes = 0; }

  // Overdue invoices count from Stripe (if key set)
  const stripeKey = await getDecryptedSecret(userId, 'stripe_secret');
  if (stripeKey) {
    try {
      const res = await fetch('https://api.stripe.com/v1/invoices?status=open&limit=50', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        overdueInvoices = (data.data ?? []).filter((i: { due_date: number | null }) =>
          i.due_date && i.due_date * 1000 < Date.now()
        ).length;
        void touchSecretLastUsed(userId, 'stripe_secret');
      }
    } catch { overdueInvoices = 0; }
  }

  const alerts: string[] = [];
  if (overdueInvoices > 0) alerts.push(`${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''}`);
  if (pendingNotes  > 0) alerts.push(`${pendingNotes} pending note${pendingNotes > 1 ? 's' : ''}`);

  return NextResponse.json({
    pendingNotes,
    overdueInvoices,
    unreadEmails: 0,
    upcomingMeetings: 0,
    alerts,
  });
}
