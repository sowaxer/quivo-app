/**
 * POST /api/search
 * Real-time web search via Tavily API.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { sanitizeTextContent, TavilySearchBodySchema } from '@/lib/db-safe';
import { getDecryptedSecret } from '@/lib/user-secret-store';

async function getTavilyKey(userId: string): Promise<string | null> {
  return getDecryptedSecret(userId, 'tavily');
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('search', userId));
  if (rlDenied) return rlDenied;

  const raw = await req.json();
  const parsed = TavilySearchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { query: qRaw, depth: depthIn, max_results: maxIn } = parsed.data;
  const query = sanitizeTextContent(qRaw, 4000);
  const depth = depthIn === 'advanced' ? 'advanced' : 'basic';
  const max_results = maxIn ?? 5;

  const tavilyKey = await getTavilyKey(userId);
  if (!tavilyKey) return NextResponse.json({ error: 'No Tavily API key. Add it in Settings → AI Providers.' }, { status: 400 });

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: depth,
        max_results: max_results,
        include_answer: true,
        include_images: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Tavily error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({
      answer: data.answer,
      results: data.results?.map((r: { title: string; url: string; content: string; score: number }) => ({
        title: r.title,
        url:   r.url,
        content: r.content?.slice(0, 500),
        score: r.score,
      })),
      query: data.query,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
