import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { sanitizeString } from '@/lib/db-safe';

// Simple keyword-based search over KB documents stored in the request
// The client sends its localStorage docs; we find relevant chunks.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('kb-search', userId));
  if (rlDenied) return rlDenied;

  const q = sanitizeString(req.nextUrl.searchParams.get('q') ?? '');
  const docsParam = req.nextUrl.searchParams.get('docs');

  if (!q.trim()) return NextResponse.json({ results: [] });

  const MAX_DOCS_PARAM = 400_000;
  if (docsParam && docsParam.length > MAX_DOCS_PARAM) {
    return NextResponse.json({ error: 'docs parameter too large' }, { status: 400 });
  }

  // If client sends serialized docs for server-side search
  let docs: { name: string; content: string; tags: string[] }[] = [];
  if (docsParam) {
    try { docs = JSON.parse(decodeURIComponent(docsParam)); } catch { /* skip */ }
  }
  if (!Array.isArray(docs)) docs = [];
  docs = docs.filter(
    d =>
      d &&
      typeof d.name === 'string' &&
      d.name.length < 500 &&
      typeof d.content === 'string' &&
      d.content.length < 2_000_000,
  );

  if (!docs.length) return NextResponse.json({ results: [] });

  const query = q.toLowerCase();
  const keywords = query.split(/\s+/).filter(k => k.length > 2);

  const results = docs
    .map(doc => {
      const contentLower = doc.content.toLowerCase();
      const score = keywords.reduce((s, kw) => {
        const idx = contentLower.indexOf(kw);
        return s + (idx >= 0 ? 1 : 0);
      }, 0);

      if (score === 0) return null;

      // Get excerpt around first keyword match
      const firstKw = keywords.find(kw => contentLower.includes(kw)) ?? keywords[0];
      const idx = contentLower.indexOf(firstKw);
      const start = Math.max(0, idx - 200);
      const end = Math.min(doc.content.length, idx + 600);
      const excerpt = doc.content.slice(start, end).trim();

      return { name: doc.name, excerpt, score, tags: doc.tags };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))
    .slice(0, 3);

  return NextResponse.json({ results });
}
