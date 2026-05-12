/**
 * Gmail API routes
 *
 * GET    /api/google/gmail?action=list&q=...&maxResults=50  → list messages
 * GET    /api/google/gmail?action=read&id=<messageId>        → read full message
 * POST   /api/google/gmail   body: { action:'send', to, subject, body }
 * PATCH  /api/google/gmail   body: { action:'markRead'|'markUnread'|'archive', id }
 * DELETE /api/google/gmail   body: { id }                   → trash message
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { sanitizeTextContent } from '@/lib/db-safe';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google';

async function getGmail(userId: string) {
  const client = await getAuthClient(userId);
  if (!client) return null;
  return google.gmail({ version: 'v1', auth: client });
}

// ─── Decode base64url ─────────────────────────────────────────────────────────
function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

// ─── Extract plain text or HTML body from message payload ────────────────────
function extractBody(payload: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }): string {
  if (!payload) return '';
  if (payload.body?.data) return decodeBase64(payload.body.data);
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts as typeof payload[]) {
      const body = extractBody(part as typeof payload);
      if (body) return body;
    }
  }
  return '';
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-gmail', userId));
  if (rlDenied) return rlDenied;

  const gmail = await getGmail(userId);
  if (!gmail) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const action     = searchParams.get('action') ?? 'list';
  const messageId  = searchParams.get('id');
  const queryRaw = searchParams.get('q') ?? '';
  const query = sanitizeTextContent(queryRaw, 500);
  const maxResults = Number(searchParams.get('maxResults') ?? 50);

  if (action === 'read' && messageId) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = msg.data.payload?.headers ?? [];
    const get = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

    return NextResponse.json({
      id:       msg.data.id,
      subject:  get('Subject'),
      from:     get('From'),
      to:       get('To'),
      date:     get('Date'),
      snippet:  msg.data.snippet,
      body:     extractBody(msg.data.payload as Parameters<typeof extractBody>[0]),
      labelIds: msg.data.labelIds,
    });
  }

  // Default: list
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query || 'in:inbox',
    maxResults,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return NextResponse.json({ emails: [] });

  // Batch-fetch metadata for each message
  const details = await Promise.all(
    messages.map(m =>
      gmail.users.messages.get({
        userId: 'me',
        id: m.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date', 'To'],
      })
    )
  );

  const emails = details.map(d => {
    const headers = d.data.payload?.headers ?? [];
    const get = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
    const isUnread = (d.data.labelIds ?? []).includes('UNREAD');
    return {
      id:       d.data.id,
      subject:  get('Subject') || '(no subject)',
      from:     get('From'),
      to:       get('To'),
      date:     get('Date'),
      snippet:  d.data.snippet,
      labelIds: d.data.labelIds,
      unread:   isUnread,
    };
  });

  return NextResponse.json({ emails });
}

// ─── POST: send email ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-gmail', userId));
  if (rlDenied) return rlDenied;

  const gmail = await getGmail(userId);
  if (!gmail) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const body = await req.json();
  const { to, subject, body: emailBody, replyToId } = body;

  if (!to || !subject || !emailBody) {
    return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
  }

  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${emailBody}`
  ).toString('base64url');

  let threadId: string | undefined;
  if (replyToId) {
    const orig = await gmail.users.messages.get({ userId: 'me', id: replyToId, format: 'metadata', metadataHeaders: ['Message-ID', 'References'] });
    threadId = orig.data.threadId ?? undefined;
  }

  const sent = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId },
  });
  return NextResponse.json({ id: sent.data.id, threadId: sent.data.threadId });
}

// ─── PATCH: markRead / markUnread / archive ───────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-gmail', userId));
  if (rlDenied) return rlDenied;

  const gmail = await getGmail(userId);
  if (!gmail) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const { action, id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing message id' }, { status: 400 });

  if (action === 'markRead') {
    await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['UNREAD'] } });
  } else if (action === 'markUnread') {
    await gmail.users.messages.modify({ userId: 'me', id, requestBody: { addLabelIds: ['UNREAD'] } });
  } else if (action === 'archive') {
    await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['INBOX'] } });
  } else if (action === 'star') {
    await gmail.users.messages.modify({ userId: 'me', id, requestBody: { addLabelIds: ['STARRED'] } });
  }

  return NextResponse.json({ success: true });
}

// ─── DELETE: trash message ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-gmail', userId));
  if (rlDenied) return rlDenied;

  const gmail = await getGmail(userId);
  if (!gmail) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const { id } = await req.json();
  await gmail.users.messages.trash({ userId: 'me', id });
  return NextResponse.json({ success: true });
}
