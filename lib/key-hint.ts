/**
 * Safe display hints for API keys — never the full secret.
 * Example: sk-ant-api03-…a8Kz
 */
export function buildKeyHint(plaintext: string): string {
  const t = plaintext.trim();
  if (t.length <= 8) return '…****';
  const headLen = Math.min(18, Math.max(4, t.length - 4));
  const head = t.slice(0, headLen);
  const tail = t.slice(-4);
  return `${head}…${tail}`;
}
