/**
 * Secure logger that sanitizes sensitive data before outputting.
 * Never logs API keys, tokens, passwords, or PII.
 */

const SENSITIVE_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9_-]+/g,
  /sk_live_[a-zA-Z0-9]+/g,
  /sk_test_[a-zA-Z0-9]+/g,
  /pk_live_[a-zA-Z0-9]+/g,
  /pk_test_[a-zA-Z0-9]+/g,
  /tvly-[a-zA-Z0-9_-]+/g,
  /AIza[a-zA-Z0-9_-]{35}/g,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
];

const SENSITIVE_REPLACEMENTS: string[] = [
  '[ANTHROPIC_KEY]',
  '[STRIPE_LIVE_KEY]',
  '[STRIPE_TEST_KEY]',
  '[STRIPE_PK_LIVE]',
  '[STRIPE_PK_TEST]',
  '[TAVILY_KEY]',
  '[GOOGLE_KEY]',
  '[JWT_TOKEN]',
];

function sanitize(value: unknown): string {
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  SENSITIVE_PATTERNS.forEach((pattern, i) => {
    text = text.replace(pattern, SENSITIVE_REPLACEMENTS[i]);
  });

  // Generic: key=<long_value> patterns
  text = text.replace(
    /(secret|password|token|key|auth)[^\s]*\s*[:=]\s*["']?[a-zA-Z0-9_\-./+]{16,}["']?/gi,
    (m) => m.replace(/[:=]\s*["']?[a-zA-Z0-9_\-./+]{16,}["']?/, ': [REDACTED]')
  );

  return text;
}

function format(level: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const sanitized = args.map(sanitize).join(' ');
  return `[${timestamp}] [${level}] ${sanitized}`;
}

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (...args: unknown[]) => {
    console.info(format('INFO', args));
  },

  warn: (...args: unknown[]) => {
    console.warn(format('WARN', args));
  },

  error: (...args: unknown[]) => {
    // In production, avoid leaking error.message details to logs if they
    // might contain stack traces with env var values.
    const sanitizedArgs = args.map((a) => {
      if (a instanceof Error) {
        return isDev ? a : { message: sanitize(a.message), name: a.name };
      }
      return a;
    });
    console.error(format('ERROR', sanitizedArgs));
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(format('DEBUG', args));
    }
  },
};

/** Utility to sanitize any string before using it in a log manually */
export function sanitizeLog(value: unknown): string {
  return sanitize(value);
}
