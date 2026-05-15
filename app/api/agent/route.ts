/**
 * POST /api/agent
 * User keys via headers (localStorage). Google via user's OAuth in Quivo. No platform AI keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type Anthropic from '@anthropic-ai/sdk';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { createAnthropicClient } from '@/lib/ai-clients';
import { loadTokens } from '@/lib/google';
import {
  AGENT_SYSTEM_PROMPT,
  AGENT_TOOLS,
  toolQueryCalendar,
  toolQueryGmail,
  toolQueryNotes,
  toolQueryQuickBooks,
  toolQueryStripe,
} from '@/lib/quivo-agent-tools';

export const maxDuration = 120;

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

function connectedLabels(opts: {
  stripe: boolean;
  google: boolean;
  quickbooks: boolean;
  notes: boolean;
}): string[] {
  const out: string[] = ['claude'];
  if (opts.stripe) out.push('stripe');
  if (opts.google) out.push('gmail', 'google-calendar');
  if (opts.quickbooks) out.push('quickbooks');
  if (opts.notes) out.push('supabase-notes');
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rlDenied = await rateLimitExceededResponse('chat', await rateLimitKey('agent', userId));
    if (rlDenied) return rlDenied;

    const anthropicKey = req.headers.get('x-anthropic-key')?.trim();
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'Falta x-anthropic-key. Configura tu key de Anthropic en el modal API Keys.' },
        { status: 401 },
      );
    }

    const stripeKey = req.headers.get('x-stripe-key')?.trim() || null;
    const quickbooksToken = req.headers.get('x-quickbooks-token')?.trim() || null;
    const googleCreds = await loadTokens(userId);
    const googleConnected = Boolean(googleCreds?.refresh_token);

    const formData = await req.formData();
    const messagesRaw = formData.get('messages') as string | null;
    const history: HistoryMessage[] = messagesRaw ? JSON.parse(messagesRaw) : [];
    const userMessage = (formData.get('message') as string) || '';
    const file = formData.get('file') as File | null;

    if (!userMessage.trim() && !file) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    type UserContent = string | Anthropic.MessageParam['content'];
    let userContent: UserContent;

    if (file) {
      const maxBytes = 20 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json({ error: 'Archivo demasiado grande (máx. 20 MB)' }, { status: 400 });
      }
      const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const fileBlock = isPdf
        ? {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: 'application/pdf' as const,
              data: base64,
            },
          }
        : {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: (file.type.startsWith('image/')
                ? file.type
                : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          };

      userContent = [
        fileBlock,
        {
          type: 'text',
          text:
            userMessage.trim() ||
            'Analiza este bank statement: extrae transacciones, categorías y líneas Schedule C IRS. Resume hallazgos clave.',
        },
      ];
    } else {
      userContent = userMessage.trim();
    }

    const historyForClaude: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userHistoryText = file
      ? `${userMessage.trim() || `[PDF: ${file.name}]`}`
      : userMessage.trim();

    const availableTools = AGENT_TOOLS.filter((t) => {
      if (t.name === 'query_stripe' && !stripeKey) return false;
      if ((t.name === 'query_gmail' || t.name === 'query_calendar') && !googleConnected) return false;
      if (t.name === 'query_quickbooks' && !quickbooksToken) return false;
      return true;
    });

    const serviceLines = [
      '✓ Claude (tu API key en este navegador)',
      stripeKey ? '✓ Stripe (tu key en modal)' : '✗ Stripe — pégala en API Keys del Agent',
      googleConnected
        ? '✓ Gmail + Calendar (conectaste Google en Settings)'
        : '✗ Google — Connect Google en Settings',
      quickbooksToken ? '✓ QuickBooks (token en modal)' : '✗ QuickBooks — token opcional en modal',
      '✓ Notas (tu cuenta Quivo)',
      'Quivo es un caparazón: no usamos keys de IA de la plataforma.',
      'TaxDome: sin API — guía manual cuando aplique',
    ].join('\n');

    const system = `${AGENT_SYSTEM_PROMPT}\n\nHoy: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\nServicios:\n${serviceLines}`;

    const anthropic = createAnthropicClient(anthropicKey);
    let currentMessages: Anthropic.MessageParam[] = [
      ...historyForClaude,
      { role: 'user', content: userContent },
    ];

    let assistantText = '';
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system,
        messages: currentMessages,
        tools: availableTools.length > 0 ? availableTools : undefined,
      });

      const textBlocks = response.content.filter((b) => b.type === 'text');
      assistantText = textBlocks.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const toolUses = response.content.filter((b) => b.type === 'tool_use');

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (tu.type !== 'tool_use') continue;
        const input = tu.input as Record<string, string>;
        let result: unknown = { error: 'Tool not available' };

        if (tu.name === 'query_stripe' && stripeKey) {
          result = await toolQueryStripe(input, stripeKey);
        } else if (tu.name === 'query_gmail' && googleCreds) {
          result = await toolQueryGmail(input, googleCreds as Record<string, unknown>);
        } else if (tu.name === 'query_calendar' && googleCreds) {
          result = await toolQueryCalendar(input, googleCreds as Record<string, unknown>);
        } else if (tu.name === 'query_notes') {
          result = await toolQueryNotes(userId);
        } else if (tu.name === 'query_quickbooks' && quickbooksToken) {
          result = await toolQueryQuickBooks(input, quickbooksToken);
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    }

    const updatedHistory: HistoryMessage[] = [
      ...history,
      { role: 'user', content: userHistoryText },
      { role: 'assistant', content: assistantText },
    ];

    return NextResponse.json({
      success: true,
      message: assistantText,
      updatedHistory,
      connectedServices: connectedLabels({
        stripe: Boolean(stripeKey),
        google: googleConnected,
        quickbooks: Boolean(quickbooksToken),
        notes: true,
      }),
    });
  } catch (err) {
    console.error('[api/agent]', err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || msg.toLowerCase().includes('authentication')) {
      return NextResponse.json(
        { error: 'API key de Anthropic inválida. Verifica tu configuración.' },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
