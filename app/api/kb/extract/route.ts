import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// PDF text extraction endpoint
// Uses basic parsing — for production use a proper PDF library
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('kb-extract', userId));
  if (rlDenied) return rlDenied;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB)` }, { status: 400 });
    }

    const fileType = file.type.toLowerCase();

    // For non-PDF text files, read directly
    if (!fileType.includes('pdf')) {
      const text = await file.text();
      return NextResponse.json({ text: text.slice(0, 500_000) });
    }

    // For PDFs: attempt basic text extraction
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text = '';

    // Extract readable ASCII text from PDF binary
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(bytes);

    // Extract text between BT (begin text) and ET (end text) markers
    const textMatches = raw.matchAll(/BT[\s\S]*?ET/g);
    const extracted: string[] = [];
    for (const match of textMatches) {
      // Extract Tj and TJ operator content
      const tjMatches = match[0].matchAll(/\(([^)]*)\)\s*Tj/g);
      for (const tj of tjMatches) {
        const content = tj[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
        if (content.trim()) extracted.push(content);
      }
    }
    text = extracted.join(' ').replace(/\s+/g, ' ').trim();

    // Fallback: extract printable ASCII runs if BT/ET failed
    if (text.length < 100) {
      const printableRuns = raw.matchAll(/[ -~\n\r\t]{20,}/g);
      const runs: string[] = [];
      for (const run of printableRuns) {
        const r = run[0].replace(/[^\x20-\x7E\n]/g, ' ').trim();
        if (r.length > 15 && !r.startsWith('%') && !r.includes('>>') && !r.includes('obj')) {
          runs.push(r);
        }
      }
      text = runs.join('\n').slice(0, 500_000);
    }

    if (!text.trim()) {
      return NextResponse.json({
        text: '[Could not extract text from this PDF. Please copy-paste the content manually, or use the "Paste Text" option.]'
      });
    }

    return NextResponse.json({ text: text.slice(0, 500_000) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('PDF extract error:', msg);
    return NextResponse.json({ text: '[PDF extraction failed. Please use the "Paste Text" option instead.]' });
  }
}
