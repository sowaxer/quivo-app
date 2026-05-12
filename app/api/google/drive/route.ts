/**
 * Google Drive API routes
 *
 * GET  /api/google/drive?action=list&q=...&pageSize=30   → list/search files
 * GET  /api/google/drive?action=file&id=<fileId>         → get file metadata
 * GET  /api/google/drive?action=download&id=<fileId>     → download/export file
 * POST /api/google/drive   body: { name, content, mimeType, folderId? } → upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { DriveUploadBodySchema, sanitizeTextContent } from '@/lib/db-safe';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google';

// Mime types we can export from Google Docs/Sheets/Slides
const EXPORT_MAP: Record<string, string> = {
  'application/vnd.google-apps.document':     'application/pdf',
  'application/vnd.google-apps.spreadsheet':  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

async function getDrive(userId: string) {
  const client = await getAuthClient(userId);
  if (!client) return null;
  return google.drive({ version: 'v3', auth: client });
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-drive', userId));
  if (rlDenied) return rlDenied;

  const drive = await getDrive(userId);
  if (!drive) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const action   = searchParams.get('action') ?? 'list';
  const fileId   = searchParams.get('id');
  const queryRaw = searchParams.get('q') ?? '';
  const query = sanitizeTextContent(queryRaw, 200);
  const pageSize = Number(searchParams.get('pageSize') ?? 30);

  // ── Single file metadata ───────────────────────────────────────────────
  if (action === 'file' && fileId) {
    const file = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size,modifiedTime,webViewLink,iconLink,parents,description',
    });
    return NextResponse.json({ file: file.data });
  }

  // ── Download / export file ─────────────────────────────────────────────
  if (action === 'download' && fileId) {
    const meta = await drive.files.get({ fileId, fields: 'mimeType,name' });
    const mimeType = meta.data.mimeType ?? '';
    const exportMime = EXPORT_MAP[mimeType];

    if (exportMime) {
      // Google Workspace file → export
      const exported = await drive.files.export(
        { fileId, mimeType: exportMime },
        { responseType: 'stream' }
      );
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        (exported.data as NodeJS.ReadableStream).on('data', (chunk: Buffer) => chunks.push(chunk));
        (exported.data as NodeJS.ReadableStream).on('end', resolve);
        (exported.data as NodeJS.ReadableStream).on('error', reject);
      });
      return new NextResponse(Buffer.concat(chunks), {
        headers: { 'Content-Type': exportMime, 'Content-Disposition': `attachment; filename="${meta.data.name}"` },
      });
    } else {
      // Binary file → stream directly
      const dl = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        (dl.data as NodeJS.ReadableStream).on('data', (chunk: Buffer) => chunks.push(chunk));
        (dl.data as NodeJS.ReadableStream).on('end', resolve);
        (dl.data as NodeJS.ReadableStream).on('error', reject);
      });
      return new NextResponse(Buffer.concat(chunks), {
        headers: { 'Content-Type': mimeType, 'Content-Disposition': `attachment; filename="${meta.data.name}"` },
      });
    }
  }

  // ── List / search files ────────────────────────────────────────────────
  const q = query
    ? `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`
    : 'trashed = false';

  const res = await drive.files.list({
    q,
    pageSize,
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,thumbnailLink,parents)',
  });

  const files = (res.data.files ?? []).map(f => ({
    id:           f.id,
    name:         f.name,
    mimeType:     f.mimeType,
    size:         f.size ? Number(f.size) : null,
    modifiedTime: f.modifiedTime,
    webViewLink:  f.webViewLink,
    iconLink:     f.iconLink,
    thumbnailLink: f.thumbnailLink,
  }));

  return NextResponse.json({ files });
}

// ─── POST: upload a text/blob file ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-drive', userId));
  if (rlDenied) return rlDenied;

  const drive = await getDrive(userId);
  if (!drive) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const body = await req.json();
  const parsed = DriveUploadBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, content, mimeType = 'text/plain', folderId } = parsed.data;

  const metadata: { name: string; parents?: string[] } = { name: sanitizeTextContent(name, 500) };
  if (folderId) metadata.parents = [sanitizeTextContent(folderId, 200)];

  const { Readable } = await import('stream');
  const safeContent = sanitizeTextContent(content);
  const media = {
    mimeType: sanitizeTextContent(mimeType, 200),
    body: Readable.from([safeContent]),
  };

  const file = await drive.files.create({
    requestBody: metadata,
    media,
    fields: 'id,name,webViewLink',
  });

  return NextResponse.json({ id: file.data.id, name: file.data.name, webViewLink: file.data.webViewLink });
}
