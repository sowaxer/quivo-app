/**
 * POST /api/process-statement
 * PDF/image bank statement → Claude vision → categorized JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { createAnthropicClient } from '@/lib/ai-clients';
import { getDecryptedSecret, touchSecretLastUsed } from '@/lib/user-secret-store';

export const maxDuration = 60;

const SYSTEM_PROMPT = `Eres un contador experto en tax preparation en Estados Unidos. 
Tu trabajo es extraer y categorizar TODAS las transacciones de un bank statement.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin backticks.

El JSON debe tener exactamente esta estructura:
{
  "bank": "nombre del banco",
  "accountHolder": "nombre del titular",
  "accountNumber": "últimos 4 dígitos",
  "statementPeriod": "mes año (ej: January 2025)",
  "openingBalance": 0.00,
  "closingBalance": 0.00,
  "totalDeposits": 0.00,
  "totalWithdrawals": 0.00,
  "transactionCount": 0,
  "transactions": [
    {
      "date": "MM/DD/YYYY",
      "description": "descripción original del banco",
      "amount": 0.00,
      "type": "credit" o "debit",
      "category": "una de las categorías de abajo",
      "taxCategory": "código IRS Schedule C o categoría tax",
      "notes": "nota opcional si hay algo relevante para taxes"
    }
  ],
  "summary": {
    "byCategory": {
      "NombreCategoria": { "total": 0.00, "count": 0, "transactions": [] }
    }
  }
}

CATEGORÍAS PERMITIDAS (usar exactamente estos nombres):
- Income / Revenue
- Payroll & Wages
- Rent & Lease
- Utilities
- Office Supplies
- Software & Subscriptions
- Marketing & Advertising
- Meals & Entertainment
- Travel & Transportation
- Insurance
- Professional Services
- Bank Fees & Charges
- Taxes & Licenses
- Equipment & Assets
- Loan Payments
- Owner Draws / Distributions
- Transfers
- Credit Card Payments
- Other Business Expense
- Personal (no deductible)

TAX CATEGORIES IRS (Schedule C líneas):
- Line 1: Gross Receipts
- Line 17: Legal & Professional
- Line 18: Office Expenses
- Line 20: Rent
- Line 22: Supplies
- Line 24: Travel
- Line 24b: Meals (50%)
- Line 25: Utilities
- Line 26: Wages
- Line 27a: Other Expenses
- Not Deductible

Sé preciso con los montos. Usa punto decimal, no comas.`;

function parseClaudeJson(rawText: string): unknown {
  const clean = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(clean);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rlDenied = await rateLimitExceededResponse(
      'ai',
      await rateLimitKey('process-statement', userId),
    );
    if (rlDenied) return rlDenied;

    const vaultKey = await getDecryptedSecret(userId, 'anthropic', { touchUsed: true });
    const apiKey = vaultKey ?? process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'No Anthropic API key. Add one in API Keys or set ANTHROPIC_API_KEY in the server environment.',
        },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const clientName = (formData.get('clientName') as string) || 'Cliente';
    const taxYear = (formData.get('taxYear') as string) || '2025';
    const entityType = (formData.get('entityType') as string) || 'LLC';

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx. 20 MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = file.type || 'application/pdf';
    const isPdf =
      mediaType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

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
            media_type: (mediaType.startsWith('image/')
              ? mediaType
              : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        };

    const anthropic = createAnthropicClient(apiKey);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            {
              type: 'text',
              text: `Extrae y categoriza TODAS las transacciones de este bank statement.
Cliente: ${clientName}
Año fiscal: ${taxYear}
Tipo de entidad: ${entityType}

Incluye absolutamente todas las transacciones que aparezcan. No omitas ninguna.`,
            },
          ],
        },
      ],
    });

    const rawText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');

    let parsed: unknown;
    try {
      parsed = parseClaudeJson(rawText);
    } catch {
      if (process.env.NODE_ENV === 'development') {
        console.error('[process-statement] parse failed:', rawText.slice(0, 500));
      }
      return NextResponse.json(
        { error: 'No se pudo parsear la respuesta de Claude', raw: rawText.slice(0, 2000) },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      clientName,
      taxYear,
      entityType,
      data: parsed,
    });
  } catch (error) {
    console.error('[process-statement]', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error inesperado', detail }, { status: 500 });
  }
}
