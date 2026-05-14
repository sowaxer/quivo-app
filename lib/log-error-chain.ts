/**
 * Log an unknown error with message, stack, and nested `cause` chain (server logs only).
 */
export function logErrorChain(prefix: string, err: unknown, maxDepth = 8): void {
  let current: unknown = err;
  for (let depth = 0; depth < maxDepth && current != null; depth++) {
    const label = `${prefix} [depth=${depth}]`;
    if (current instanceof Error) {
      console.error(label, current.message);
      if (current.stack) console.error(`${label} stack:\n`, current.stack);
      current = current.cause;
    } else {
      console.error(label, String(current));
      break;
    }
  }
}
