/**
 * POST /api/chat
 *
 * Claude with real tool calling:
 *  - query_stripe    → live invoices, MRR, customers
 *  - query_gmail     → inbox emails (if Google connected)
 *  - query_calendar  → upcoming events (if Google connected)
 *  - web_search      → Tavily real-time web search
 *  - query_notes     → user's saved notes
 *
 * Streams SSE: data: {"text":"..."} / data: {"tool":"...", "result":{}} / data: {"done":true}
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { google } from 'googleapis';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { createAnthropicClient } from '@/lib/ai-clients';
import { createStripeClient } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getDecryptedSecret, touchSecretLastUsed } from '@/lib/user-secret-store';
import { loadTokens } from '@/lib/google';

function db() {
  return getSupabaseAdmin();
}

// ─── Tool implementations ──────────────────────────────────────────────────────
async function toolQueryStripe(input: Record<string, string>, stripeKey: string) {
  try {
    const stripe = createStripeClient(stripeKey);
    const action = input.action ?? 'overview';

    if (action === 'invoices') {
      const invoices = await stripe.invoices.list({ limit: 20, status: input.status as Stripe.InvoiceListParams.Status ?? undefined });
      return { invoices: invoices.data.map(inv => ({
        id: inv.id,
        customer: inv.customer_email ?? inv.customer,
        amount: `$${((inv.amount_due ?? 0) / 100).toFixed(2)}`,
        status: inv.status,
        due: inv.due_date ? new Date(inv.due_date * 1000).toLocaleDateString() : 'N/A',
        hosted_url: inv.hosted_invoice_url,
      }))};
    }
    if (action === 'customers') {
      const customers = await stripe.customers.list({ limit: 20 });
      return { customers: customers.data.map(c => ({ id: c.id, email: c.email, name: c.name, created: new Date(c.created * 1000).toLocaleDateString() })) };
    }
    if (action === 'balance') {
      const balance = await stripe.balance.retrieve();
      return { balance: balance.available.map(b => ({ amount: `$${(b.amount / 100).toFixed(2)}`, currency: b.currency })) };
    }
    // Default: overview
    const [invoices, customers, charges] = await Promise.all([
      stripe.invoices.list({ limit: 50 }),
      stripe.customers.list({ limit: 1 }),
      stripe.charges.list({ limit: 50 }),
    ]);
    const paid  = invoices.data.filter(i => i.status === 'paid');
    const open  = invoices.data.filter(i => i.status === 'open');
    const overdue = invoices.data.filter(i => i.status === 'open' && i.due_date && i.due_date * 1000 < Date.now());
    const mrr = paid.filter(i => i.amount_paid && i.created > Date.now() / 1000 - 30 * 86400)
      .reduce((s, i) => s + (i.amount_paid ?? 0), 0) / 100;

    return {
      mrr: `$${mrr.toFixed(2)}`,
      total_customers: (customers as unknown as { total_count?: number }).total_count ?? customers.data.length,
      paid_invoices: paid.length,
      open_invoices: open.length,
      overdue_invoices: overdue.length,
      overdue_list: overdue.slice(0, 5).map(i => ({
        customer: i.customer_email,
        amount: `$${((i.amount_due ?? 0) / 100).toFixed(2)}`,
        due: i.due_date ? new Date(i.due_date * 1000).toLocaleDateString() : 'N/A',
      })),
      recent_charges: charges.data.slice(0, 5).map(c => ({
        amount: `$${(c.amount / 100).toFixed(2)}`,
        customer: c.billing_details?.email,
        date: new Date(c.created * 1000).toLocaleDateString(),
        status: c.status,
      })),
    };
  } catch (e) {
    return { error: String(e) };
  }
}

async function toolQueryGmail(input: Record<string, string>, tokens: Record<string, unknown>) {
  try {
    const auth2 = new google.auth.OAuth2();
    auth2.setCredentials(tokens as Parameters<typeof auth2.setCredentials>[0]);
    const gmail = google.gmail({ version: 'v1', auth: auth2 });
    const q = input.query ?? 'in:inbox';
    const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 10 });
    if (!list.data.messages?.length) return { emails: [], message: 'No emails found' };

    const emails = await Promise.all(
      list.data.messages.slice(0, 8).map(async m => {
        const msg = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
        const headers = msg.data.payload?.headers ?? [];
        const get = (name: string) => headers.find(h => h.name === name)?.value ?? '';
        return { subject: get('Subject'), from: get('From'), date: get('Date'), snippet: msg.data.snippet };
      })
    );
    return { emails, count: list.data.resultSizeEstimate };
  } catch (e) {
    return { error: String(e) };
  }
}

async function toolQueryCalendar(input: Record<string, string>, tokens: Record<string, unknown>) {
  try {
    const auth2 = new google.auth.OAuth2();
    auth2.setCredentials(tokens as Parameters<typeof auth2.setCredentials>[0]);
    const calendar = google.calendar({ version: 'v3', auth: auth2 });
    const days = parseInt(input.days ?? '7');
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + days * 86400000).toISOString();
    const res = await calendar.events.list({
      calendarId: 'primary', timeMin, timeMax,
      maxResults: 15, singleEvents: true, orderBy: 'startTime',
    });
    return {
      events: (res.data.items ?? []).map(e => ({
        title: e.summary,
        start: e.start?.dateTime ?? e.start?.date,
        end:   e.end?.dateTime   ?? e.end?.date,
        location: e.location,
        description: e.description?.slice(0, 100),
      })),
    };
  } catch (e) {
    return { error: String(e) };
  }
}

async function toolWebSearch(input: Record<string, string>, tavilyKey: string) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: input.query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    });
    const data = await res.json();
    return {
      answer: data.answer,
      sources: data.results?.slice(0, 4).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url:   r.url,
        snippet: r.content?.slice(0, 200),
      })),
    };
  } catch (e) {
    return { error: String(e) };
  }
}

async function toolQueryNotes(userId: string) {
  try {
    const { data } = await db()
      .from('notes')
      .select('content, status, priority, reminder_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    return { notes: data ?? [], count: data?.length ?? 0 };
  } catch { return { notes: [], count: 0 }; }
}

// ─── Tool definitions for Claude ──────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_stripe',
    description: 'Query the user\'s Stripe account for real-time financial data: MRR, invoices, customers, payments, overdue amounts.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['overview', 'invoices', 'customers', 'balance'], description: 'What data to fetch' },
        status: { type: 'string', enum: ['paid', 'open', 'draft', 'void', 'uncollectible'], description: 'Filter invoices by status' },
      },
      required: ['action'],
    },
  },
  {
    name: 'query_gmail',
    description: 'Search and read emails from the user\'s Gmail inbox.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query, e.g. "in:inbox is:unread" or "from:client@company.com"' },
      },
      required: ['query'],
    },
  },
  {
    name: 'query_calendar',
    description: 'Get upcoming events from the user\'s Google Calendar.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'string', description: 'How many days ahead to look (default: 7)' },
      },
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for real-time information, news, regulations, company data, or any topic.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'query_notes',
    description: 'Read the user\'s saved notes and reminders.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

// ─── SSE helper ───────────────────────────────────────────────────────────────
function sse(data: object) { return `data: ${JSON.stringify(data)}\n\n`; }

// ─── Main route ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('chat', await rateLimitKey('chat', userId));
  if (rlDenied) return rlDenied;

  const body = (await req.json()) as {
    messages: { role: string; content: string }[];
    model?: string;
    agentInstruction?: string;
  };
  const { messages, model, agentInstruction } = body;

  const MAX_MESSAGES = 120;
  const MAX_MESSAGE_CHARS = 120_000;
  const MAX_AGENT_INSTRUCTION = 50_000;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
  }
  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'assistant') {
      return NextResponse.json({ error: 'Invalid message role' }, { status: 400 });
    }
    if (typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }
  }
  if (model !== undefined && model !== null && (typeof model !== 'string' || model.length > 120)) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }
  if (
    agentInstruction !== undefined &&
    agentInstruction !== null &&
    (typeof agentInstruction !== 'string' || agentInstruction.length > MAX_AGENT_INSTRUCTION)
  ) {
    return NextResponse.json({ error: 'Invalid agent instruction' }, { status: 400 });
  }

  const deepseekModel = model === 'deepseek-chat' || model === 'deepseek-reasoner';
  if (deepseekModel) {
    const deepseekKey = await getDecryptedSecret(userId, 'deepseek', { touchUsed: true });
    const enc = new TextEncoder();
    if (!deepseekKey) {
      const stream = new ReadableStream({
        start(c) {
          c.enqueue(
            enc.encode(
              sse({
                error:
                  'No DeepSeek API key found. Add it under API Keys or Settings → AI Providers.',
              }),
            ),
          );
          c.close();
        },
      });
      return new NextResponse(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    const dsModel = model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
    const systemText = agentInstruction
      ? `${agentInstruction}\n\nToday: ${new Date().toLocaleDateString('en-US')}`
      : `You are Quivo AI, a financial and business assistant.\nToday: ${new Date().toLocaleDateString('en-US')}`;
    const apiMessages = [
      { role: 'system' as const, content: systemText },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => controller.enqueue(enc.encode(sse(data)));
        try {
          const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${deepseekKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: dsModel,
              messages: apiMessages,
              stream: true,
              max_tokens: 4096,
            }),
          });
          if (!res.ok) {
            const errText = await res.text();
            send({ error: `DeepSeek: HTTP ${res.status} — ${errText.slice(0, 240)}` });
            send({ done: true, model: 'deepseek' });
            return;
          }
          const reader = res.body!.getReader();
          const dec = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += dec.decode(value, { stream: true });
            const parts = buffer.split(/\r?\n/);
            buffer = parts.pop() ?? '';
            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith('data:')) continue;
              const payload = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim();
              if (payload === '[DONE]') continue;
              try {
                const json = JSON.parse(payload) as {
                  choices?: { delta?: { content?: string; reasoning_content?: string } }[];
                };
                const d = json.choices?.[0]?.delta;
                const chunk = d?.content ?? d?.reasoning_content;
                if (typeof chunk === 'string' && chunk.length) send({ text: chunk, model: 'deepseek' });
              } catch {
                /* ignore parse errors for partial chunks */
              }
            }
          }
          send({ done: true, model: 'deepseek' });
        } catch (e) {
          send({ error: e instanceof Error ? e.message : 'DeepSeek request failed' });
          send({ done: true, model: 'deepseek' });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  const [anthropicKey, stripeKey, tavilyKey, googleCreds] = await Promise.all([
    getDecryptedSecret(userId, 'anthropic', { touchUsed: true }),
    getDecryptedSecret(userId, 'stripe_secret'),
    getDecryptedSecret(userId, 'tavily'),
    loadTokens(userId),
  ]);

  if (!anthropicKey) {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(sse({ error: 'No Anthropic API key found. Go to Settings → AI Providers and add your Claude key.' })));
        c.close();
      }
    });
    return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }

  const googleConnected = Boolean(googleCreds?.refresh_token);

  // Build system prompt with context about what's connected
  const connectedServices = [
    stripeKey    ? '✓ Stripe (can query invoices, MRR, customers)'    : '✗ Stripe (not connected)',
    googleConnected ? '✓ Gmail (can read emails)'                         : '✗ Gmail (not connected)',
    googleConnected ? '✓ Google Calendar (can read events)'               : '✗ Calendar (not connected)',
    tavilyKey    ? '✓ Web Search (can search internet in real-time)'   : '✗ Web Search (no Tavily key)',
  ].join('\n');

  const baseSystem = `You are Quivo AI, a powerful financial and business assistant with direct access to the user's connected services.

Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Connected services:
${connectedServices}

IMPORTANT RULES:
- When the user asks about their Stripe data, ALWAYS use the query_stripe tool — do not say you don't have access.
- When they ask about emails, ALWAYS use query_gmail if connected.
- When they ask about their schedule, ALWAYS use query_calendar if connected.
- For real-time info (news, regulations, company data), ALWAYS use web_search.
- For notes/tasks/reminders, use query_notes.
- Be concise, precise. Format numbers with $ and commas.
- If a service is not connected, tell the user how to connect it in Settings.`;

  const system = agentInstruction
    ? `${agentInstruction}\n\n---\nConnected services:\n${connectedServices}\nToday: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    : baseSystem;

  const claudeMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Determine which tools to include based on what's available
  const availableTools = TOOLS.filter(t => {
    if (t.name === 'query_stripe'   && !stripeKey)    return false;
    if (t.name === 'query_gmail'    && !googleConnected) return false;
    if (t.name === 'query_calendar' && !googleConnected) return false;
    if (t.name === 'web_search'     && !tavilyKey)    return false;
    return true;
  });

  const anthropic = createAnthropicClient(anthropicKey);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(enc.encode(sse(data)));

      try {
        // Agentic loop: Claude may call tools multiple times
        // Use a flexible message type to handle string + ContentBlock content
        type AnyMessage = { role: 'user' | 'assistant'; content: string | Anthropic.ContentBlockParam[] | Anthropic.MessageParam['content'] };
        let currentMessages: AnyMessage[] = [...claudeMessages];
        let iterations = 0;

        while (iterations < 5) {
          iterations++;
          let fullText = '';
          let toolUses: Anthropic.ToolUseBlock[] = [];
          let stopReason = '';

          // Stream this Claude call
          const claudeStream = anthropic.messages.stream({
            model:      model?.startsWith('claude') ? model : 'claude-sonnet-4-5',
            max_tokens: 4096,
            system,
            messages:   currentMessages as Anthropic.MessageParam[],
            tools:      availableTools.length > 0 ? availableTools : undefined,
          });

          for await (const event of claudeStream) {
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                send({ text: event.delta.text, model: 'claude' });
                fullText += event.delta.text;
              }
            }
            if (event.type === 'message_delta') {
              stopReason = event.delta.stop_reason ?? '';
            }
          }

          const finalMsg = await claudeStream.finalMessage();
          toolUses = finalMsg.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];

          if (stopReason !== 'tool_use' || toolUses.length === 0) break;

          // Execute tools
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            send({ tool: tu.name, status: 'running' });
            const input = tu.input as Record<string, string>;
            let result: unknown;

            if (tu.name === 'query_stripe'   && stripeKey) {
              result = await toolQueryStripe(input, stripeKey);
              void touchSecretLastUsed(userId, 'stripe_secret');
            }
            else if (tu.name === 'query_gmail' && googleCreds)   result = await toolQueryGmail(input, googleCreds as Record<string, unknown>);
            else if (tu.name === 'query_calendar' && googleCreds) result = await toolQueryCalendar(input, googleCreds as Record<string, unknown>);
            else if (tu.name === 'web_search' && tavilyKey) {
              result = await toolWebSearch(input, tavilyKey);
              void touchSecretLastUsed(userId, 'tavily');
            }
            else if (tu.name === 'query_notes')                result = await toolQueryNotes(userId);
            else result = { error: 'Service not connected' };

            send({ tool: tu.name, status: 'done', result });
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
          }

          // Add assistant message and tool results to conversation
          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: finalMsg.content as unknown as string },
            { role: 'user'      as const, content: toolResults as unknown as string },
          ];
        }

        send({ done: true, model: 'claude' });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
    },
  });
}
