import { NextResponse } from 'next/server';

/** Demo snapshot when Yahoo is unreachable (same shape as live). */
const DEMO_QUOTES = [
  { symbol: '^GSPC', shortName: 'S&P 500', price: 5829.42, changePct: 0.31 },
  { symbol: '^IXIC', shortName: 'NASDAQ', price: 18489.12, changePct: 0.52 },
  { symbol: '^DJI', shortName: 'Dow', price: 39142.28, changePct: 0.18 },
  { symbol: 'BTC-USD', shortName: 'Bitcoin', price: 98120.5, changePct: 1.12 },
  { symbol: 'ETH-USD', shortName: 'Ethereum', price: 3452.1, changePct: -0.24 },
] as const;

type Quote = {
  symbol: string;
  shortName: string;
  price: number;
  changePct: number;
};

const FINNHUB_MAP = [
  { symbol: '^GSPC', finnhub: 'SPY', shortName: 'S&P 500' },
  { symbol: '^IXIC', finnhub: 'QQQ', shortName: 'NASDAQ' },
  { symbol: '^DJI', finnhub: 'DIA', shortName: 'Dow' },
  { symbol: 'BTC-USD', finnhub: 'BINANCE:BTCUSDT', shortName: 'Bitcoin' },
  { symbol: 'ETH-USD', finnhub: 'BINANCE:ETHUSDT', shortName: 'Ethereum' },
] as const;

async function fetchFinnhubQuotes(): Promise<Quote[] | null> {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token) return null;
  const out: Quote[] = [];
  for (const row of FINNHUB_MAP) {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(row.finnhub)}&token=${token}`;
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) continue;
      const j = (await res.json()) as { c?: number; dp?: number };
      const price = typeof j.c === 'number' ? j.c : NaN;
      const changePct = typeof j.dp === 'number' ? j.dp : 0;
      if (!Number.isFinite(price) || price <= 0) continue;
      out.push({
        symbol: row.symbol,
        shortName: row.shortName,
        price,
        changePct,
      });
    } catch {
      /* skip symbol */
    }
  }
  return out.length > 0 ? out : null;
}

function mapYahooResult(r: Record<string, unknown>): Quote | null {
  const symbol = typeof r.symbol === 'string' ? r.symbol : '';
  const shortName =
    typeof r.shortName === 'string'
      ? r.shortName
      : typeof r.longName === 'string'
        ? r.longName
        : symbol;
  const price = typeof r.regularMarketPrice === 'number' ? r.regularMarketPrice : NaN;
  const changePct =
    typeof r.regularMarketChangePercent === 'number' ? r.regularMarketChangePercent : NaN;
  if (!Number.isFinite(price)) return null;
  return {
    symbol,
    shortName,
    price,
    changePct: Number.isFinite(changePct) ? changePct : 0,
  };
}

/**
 * GET /api/market-ticker
 * Live quotes via Yahoo Finance public quote endpoint (server-side only).
 * Falls back to Finnhub when `FINNHUB_API_KEY` is set (if Yahoo fails), then to demo quotes.
 */
export async function GET() {
  const symbols = '^GSPC,^IXIC,^DJI,BTC-USD,ETH-USD';
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Quivo/1.0; +https://quivo.app) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const data = (await res.json()) as {
      quoteResponse?: { result?: Record<string, unknown>[]; error?: unknown };
    };
    const rows = data.quoteResponse?.result ?? [];
    const quotes: Quote[] = [];
    for (const r of rows) {
      const q = mapYahooResult(r);
      if (q) quotes.push(q);
    }
    if (quotes.length === 0) throw new Error('empty quote result');
    return NextResponse.json({
      source: 'yahoo' as const,
      updatedAt: new Date().toISOString(),
      quotes,
    });
  } catch {
    const finnhubQuotes = await fetchFinnhubQuotes();
    if (finnhubQuotes) {
      return NextResponse.json({
        source: 'finnhub' as const,
        updatedAt: new Date().toISOString(),
        quotes: finnhubQuotes,
      });
    }
    return NextResponse.json({
      source: 'demo' as const,
      updatedAt: new Date().toISOString(),
      quotes: DEMO_QUOTES.map(q => ({ ...q })),
      note:
        'Live Yahoo data unavailable — showing demo numbers. Set FINNHUB_API_KEY for a backup feed, or ensure outbound HTTPS to Yahoo is allowed.',
    });
  }
}
