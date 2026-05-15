/**
 * Gmail API routes
 *
 * GET    /api/google/gmail?action=list&q=...&maxResults=50&pageToken=…  → list messages
 * GET    /api/google/gmail?action=labels                                  → mailbox label stats
 * GET    /api/google/gmail?action=read&id=<messageId>                     → read full message
 * POST   /api/google/gmail   body: { action:'send', to, subject, body }
 * PATCH  /api/google/gmail   body: { action:'markRead'|'markUnread'|'archive', id }
 * DELETE /api/google/gmail   body: { id }                                 → trash message
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { sanitizeTextContent } from '@/lib/db-safe';
import { google, gmail_v1 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { getAuthClient, saveTokens } from '@/lib/google';

function gmailFromAuth(authClient: OAuth2Client) {
  return google.gmail({ version: 'v1', auth: authClient });
}

/** Run a Gmail call; on 401 refresh OAuth token once and retry. */
async function withGmailRetry<T>(
  userId: string,
  run: (gmail: gmail_v1.Gmail, client: OAuth2Client) => Promise<T>,
): Promise<T> {
  let client = await getAuthClient(userId);
  if (!client) throw Object.assign(new Error('NOT_CONNECTED'), { code: 'NOT_CONNECTED' });

  const attempt = async () => {
    const gmail = gmailFromAuth(client!);
    return run(gmail, client!);
  };

  try {
    return await attempt();
  } catch (err: unknown) {
    const gErr = err as { code?: number | string; response?: { status?: number } };
    const http = gErr.response?.status;
    const code = gErr.code;
    const is401 = http === 401 || code === 401;
    if (!is401) throw err;
    console.warn('[Gmail] 401 from Gmail API — refreshing access token and retrying once', { userId });
    try {
      const { credentials } = await client!.refreshAccessToken();
      await saveTokens(userId, credentials);
      client!.setCredentials(credentials);
      return await attempt();
    } catch (refreshErr) {
      console.error('[Gmail] Token refresh after 401 failed', { userId, refreshErr });
      throw err;
    }
  }
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

function logGmailAxiosError(context: string, err: unknown) {
  const e = err as {
    message?: string;
    code?: number;
    response?: { status?: number; data?: unknown };
  };
  console.error(`[Gmail] ${context}`, {
    message: e?.message,
    code: e?.code,
    status: e?.response?.status,
    body: e?.response?.data,
  });
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('google', await rateLimitKey('google-integration', userId));
  if (rlDenied) return rlDenied;

  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action') ?? 'list';
  const messageId = searchParams.get('id');
  const queryRaw = searchParams.get('q') ?? '';
  const query = sanitizeTextContent(queryRaw, 500);
  const maxResultsRaw = searchParams.get('maxResults');
  const maxResults = Math.min(100, Math.max(1, Number(maxResultsRaw ?? 50) || 50));
  const pageToken = searchParams.get('pageToken')?.trim() || undefined;

  try {
    if (action === 'labels') {
      const labelsRes = await withGmailRetry(userId, gmail =>
        gmail.users.labels.list({ userId: 'me' }),
      );
      const labels = (labelsRes.data.labels ?? []).map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        messagesTotal: l.messagesTotal ?? 0,
        messagesUnread: l.messagesUnread ?? 0,
      }));
      return NextResponse.json({ labels });
    }

    if (action === 'read' && messageId) {
      const msg = await withGmailRetry(userId, gmail =>
        gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        }),
      );

      const headers = msg.data.payload?.headers ?? [];
      const get = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

      return NextResponse.json({
        id: msg.data.id,
        subject: get('Subject'),
        from: get('From'),
        to: get('To'),
        date: get('Date'),
        snippet: msg.data.snippet,
        body: extractBody(msg.data.payload as Parameters<typeof extractBody>[0]),
        labelIds: msg.data.labelIds,
      });
    }

    if (action !== 'list') {
      return NextResponse.json({ error: 'Unknown action', allowed: ['list', 'read', 'labels'] }, { status: 400 });
    }

    const listRes = await withGmailRetry(userId, gmail =>
      gmail.users.messages.list({
        userId: 'me',
        q: query || 'in:inbox',
        maxResults,
        pageToken,
      }),
    );

    const messages = listRes.data.messages ?? [];
    const resultSizeEstimate = listRes.data.resultSizeEstimate ?? undefined;
    const nextPageToken = listRes.data.nextPageToken ?? undefined;

    if (messages.length === 0 && (resultSizeEstimate ?? 0) > 0) {
      console.warn('[Gmail] messages.list returned 0 ids but resultSizeEstimate > 0', {
        userId,
        query: query || 'in:inbox',
        resultSizeEstimate,
      });
    }

    if (messages.length === 0) {
      return NextResponse.json({
        emails: [],
        nextPageToken,
        resultSizeEstimate,
      });
    }

    const settled = await withGmailRetry(userId, async gmail => {
      return Promise.allSettled(
        messages.map(m =>
          gmail.users.messages.get({
            userId: 'me',
            id: m.id!,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date', 'To'],
          }),
        ),
      );
    });

    const metaErrors: string[] = [];
    const emails = settled
      .map((r, i) => {
        if (r.status === 'fulfilled') {
          const d = r.value;
          const headers = d.data.payload?.headers ?? [];
          const get = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
          const isUnread = (d.data.labelIds ?? []).includes('UNREAD');
          return {
            id: d.data.id,
            subject: get('Subject') || '(no subject)',
            from: get('From'),
            to: get('To'),
            date: get('Date'),
            snippet: d.data.snippet ?? '',
            labelIds: d.data.labelIds ?? [],
            unread: isUnread,
          };
        }
        const id = messages[i]?.id ?? '?';
        const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
        metaErrors.push(`id ${id}: ${reason}`);
        logGmailAxiosError(`messages.get failed for ${id}`, r.reason);
        return null;
      })
      .filter((e): e is NonNullable<typeof e> => e != null);

    if (emails.length === 0 && metaErrors.length > 0) {
      console.error('[Gmail] All metadata fetches failed', { userId, metaErrors });
      return NextResponse.json(
        {
          error: 'Failed to load message details',
          details: metaErrors.slice(0, 5),
          emails: [],
          nextPageToken,
          resultSizeEstimate,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      emails,
      nextPageToken,
      resultSizeEstimate,
      partial: metaErrors.length > 0,
      metaErrors: metaErrors.length > 0 ? metaErrors.slice(0, 5) : undefined,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : '';
    const c = (err as { code?: string })?.code;
    if (c === 'NOT_CONNECTED' || errMsg === 'NOT_CONNECTED') {
      return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });
    }
    logGmailAxiosError('GET handler', err);
    const fallback = err instanceof Error ? err.message : 'Gmail request failed';
    return NextResponse.json(
      { error: fallback, details: (err as { response?: { data?: unknown } })?.response?.data },
      { status: 500 },
    );
  }
}

// ─── POST: send email ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('google', await rateLimitKey('google-integration', userId));
  if (rlDenied) return rlDenied;

  const body = await req.json();
  const { to, subject, body: emailBody, replyToId } = body;

  if (!to || !subject || !emailBody) {
    return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
  }

  try {
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${emailBody}`,
    ).toString('base64url');

    const sent = await withGmailRetry(userId, async gmail => {
      let threadId: string | undefined;
      if (replyToId) {
        const orig = await gmail.users.messages.get({
          userId: 'me',
          id: replyToId,
          format: 'metadata',
          metadataHeaders: ['Message-ID', 'References'],
        });
        threadId = orig.data.threadId ?? undefined;
      }
      return gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw, threadId },
      });
    });
    return NextResponse.json({ id: sent.data.id, threadId: sent.data.threadId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const c = (err as { code?: string })?.code;
    if (c === 'NOT_CONNECTED' || msg === 'NOT_CONNECTED') {
      return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });
    }
    logGmailAxiosError('POST send', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}

// ─── PATCH: markRead / markUnread / archive ───────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('google', await rateLimitKey('google-integration', userId));
  if (rlDenied) return rlDenied;

  const { action, id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing message id' }, { status: 400 });

  try {
    await withGmailRetry(userId, async gmail => {
      if (action === 'markRead') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['UNREAD'] } });
      } else if (action === 'markUnread') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { addLabelIds: ['UNREAD'] } });
      } else if (action === 'archive') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['INBOX'] } });
      } else if (action === 'star') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { addLabelIds: ['STARRED'] } });
      } else if (action === 'unstar') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['STARRED'] } });
      } else {
        throw new Error('Unknown action');
      }
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const c = (err as { code?: string })?.code;
    if (c === 'NOT_CONNECTED' || msg === 'NOT_CONNECTED') {
      return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });
    }
    logGmailAxiosError('PATCH', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Modify failed' }, { status: 500 });
  }
}

// ─── DELETE: trash message ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('google', await rateLimitKey('google-integration', userId));
  if (rlDenied) return rlDenied;

  const { id } = await req.json();
  try {
    await withGmailRetry(userId, gmail => gmail.users.messages.trash({ userId: 'me', id }));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const c = (err as { code?: string })?.code;
    if (c === 'NOT_CONNECTED' || msg === 'NOT_CONNECTED') {
      return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });
    }
    logGmailAxiosError('DELETE', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Delete failed' }, { status: 500 });
  }
}
