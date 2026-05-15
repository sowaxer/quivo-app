/** Clear Quivo client-side storage (chat, planner, keys cache, etc.). */

export function clearQuivoLocalData() {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter(
    k => k.startsWith('quivo_') || k.startsWith('finedge_'),
  );
  keys.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}

export function clearQuivoChatHistory() {
  if (typeof window === 'undefined') return;
  Object.keys(localStorage)
    .filter(k => k.includes('chat') && (k.startsWith('quivo_') || k.startsWith('finedge_')))
    .forEach(k => localStorage.removeItem(k));
}
