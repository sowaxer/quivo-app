/**
 * Google Calendar API routes
 *
 * GET    /api/google/calendar?action=list&days=30  → upcoming events
 * GET    /api/google/calendar?action=calendars      → list user calendars
 * POST   /api/google/calendar   body: { summary, description, start, end, location? }
 * PUT    /api/google/calendar   body: { id, ...fields }
 * DELETE /api/google/calendar   body: { id }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google';

async function getCalendar(userId: string) {
  const client = await getAuthClient(userId);
  if (!client) return null;
  return google.calendar({ version: 'v3', auth: client });
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-calendar', userId));
  if (rlDenied) return rlDenied;

  const cal = await getCalendar(userId);
  if (!cal) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const action  = searchParams.get('action') ?? 'list';
  const days    = Number(searchParams.get('days') ?? 30);
  const calId   = searchParams.get('calendarId') ?? 'primary';

  if (action === 'calendars') {
    const res = await cal.calendarList.list({ maxResults: 50 });
    const items = (res.data.items ?? []).map(c => ({
      id:          c.id,
      summary:     c.summary,
      color:       c.backgroundColor,
      primary:     c.primary ?? false,
      accessRole:  c.accessRole,
    }));
    return NextResponse.json({ calendars: items });
  }

  // Default: list events
  const now     = new Date();
  const future  = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const res = await cal.events.list({
    calendarId:   calId,
    timeMin:      now.toISOString(),
    timeMax:      future.toISOString(),
    singleEvents: true,
    orderBy:      'startTime',
    maxResults:   100,
  });

  const events = (res.data.items ?? []).map(e => ({
    id:          e.id,
    summary:     e.summary ?? '(No title)',
    description: e.description,
    location:    e.location,
    start:       e.start?.dateTime ?? e.start?.date,
    end:         e.end?.dateTime ?? e.end?.date,
    allDay:      !e.start?.dateTime,
    htmlLink:    e.htmlLink,
    status:      e.status,
    attendees:   (e.attendees ?? []).map(a => ({ email: a.email, name: a.displayName, status: a.responseStatus })),
    colorId:     e.colorId,
  }));

  return NextResponse.json({ events });
}

// ─── POST: create event ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-calendar', userId));
  if (rlDenied) return rlDenied;

  const cal = await getCalendar(userId);
  if (!cal) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const body = await req.json();
  const { summary, description, start, end, location, attendees, calendarId = 'primary' } = body;

  if (!summary || !start || !end) {
    return NextResponse.json({ error: 'Missing required fields: summary, start, end' }, { status: 400 });
  }

  const event = await cal.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      location,
      start: { dateTime: start, timeZone: 'America/New_York' },
      end:   { dateTime: end,   timeZone: 'America/New_York' },
      attendees: attendees?.map((email: string) => ({ email })),
    },
  });

  return NextResponse.json({
    id:       event.data.id,
    htmlLink: event.data.htmlLink,
    summary:  event.data.summary,
    start:    event.data.start,
    end:      event.data.end,
  });
}

// ─── PUT: update event ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-calendar', userId));
  if (rlDenied) return rlDenied;

  const cal = await getCalendar(userId);
  if (!cal) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const body = await req.json();
  const { id, calendarId = 'primary', ...fields } = body;
  if (!id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 });

  const event = await cal.events.patch({
    calendarId,
    eventId: id,
    requestBody: fields,
  });

  return NextResponse.json({ id: event.data.id, summary: event.data.summary });
}

// ─── DELETE: remove event ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-calendar', userId));
  if (rlDenied) return rlDenied;

  const cal = await getCalendar(userId);
  if (!cal) return NextResponse.json({ error: 'Google not connected', code: 'NOT_CONNECTED' }, { status: 403 });

  const { id, calendarId = 'primary' } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 });

  await cal.events.delete({ calendarId, eventId: id });
  return NextResponse.json({ success: true });
}
