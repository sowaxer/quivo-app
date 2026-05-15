import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const tables = ['notes', 'user_prompts', 'user_api_key_vault', 'google_tokens', 'dropbox_tokens'] as const;

    await Promise.all(
      tables.map(table =>
        supabase.from(table).delete().eq('user_id', userId).then(({ error }) => {
          if (error) console.error(`[account delete] ${table}:`, error.message);
        }),
      ),
    );

    const client = await clerkClient();
    await client.users.deleteUser(userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
