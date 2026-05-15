/**
 * One-time copy from pre-rebrand localStorage keys so existing sessions survive.
 */
const KEY_PAIRS: readonly [string, string][] = [
  ['quivo_chat_sessions', 'finedge_chat_sessions'],
  ['quivo_user_agents', 'finedge_user_agents'],
  ['quivo_pending_agent', 'finedge_pending_agent'],
  ['quivo_tasks', 'finedge_tasks'],
  ['quivo_attio_notes', 'finedge_attio_notes'],
  ['quivo_user_name', 'finedge_user_name'],
  ['quivo_kb_docs', 'finedge_kb_docs'],
  ['quivo_memories', 'finedge_memories'],
  ['quivo_saved_chats', 'finedge_saved_chats'],
  ['quivo_extra_keys', 'finedge_extra_keys'],
  ['quivo_notes', 'finedge_notes'],
  ['quivo_onboarding_done', 'finedge_onboarding_done'],
  ['quivo_theme', 'finedge_theme'],
  ['quivo_appearance_v2', 'finedge_appearance_v2'],
];

export function migrateLegacyStorageKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const [next, prev] of KEY_PAIRS) {
      if (!localStorage.getItem(next) && localStorage.getItem(prev)) {
        localStorage.setItem(next, localStorage.getItem(prev)!);
        localStorage.removeItem(prev);
      }
    }
  } catch {
    /* ignore quota / private mode */
  }
}
