/** Shared accent color — used by Settings, Appearance, and global button styles. */

export const LS_APPEARANCE = 'quivo_appearance_v2';
export const DEFAULT_ACCENT = '#2563eb';

export const ACCENT_PRESETS = [
  '#2563eb',
  '#3b82f6',
  '#38bdf8',
  '#22c55e',
  '#f97316',
  '#ea580c',
  '#f59e0b',
  '#fb7185',
  '#ef4444',
  '#a855f7',
  '#e879f9',
] as const;

export function lightenHex(hex: string, amount = 28): string {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.min(255, (n >> 16) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function loadAccentColor(): string {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  try {
    const raw = localStorage.getItem(LS_APPEARANCE);
    if (raw) {
      const parsed = JSON.parse(raw) as { accentColor?: string };
      if (parsed.accentColor && /^#[0-9a-fA-F]{6}$/.test(parsed.accentColor)) {
        return parsed.accentColor;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ACCENT;
}

export function saveAccentColor(color: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_APPEARANCE);
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(LS_APPEARANCE, JSON.stringify({ ...base, accentColor: color }));
  } catch {
    localStorage.setItem(LS_APPEARANCE, JSON.stringify({ accentColor: color }));
  }
  applyAccentColor(color);
  window.dispatchEvent(new CustomEvent('quivo:accent-updated', { detail: color }));
}

export function applyAccentColor(color: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const lighter = lightenHex(color, 32);

  root.style.setProperty('--quivo-accent', color);
  root.style.setProperty('--quivo-accent-light', lighter);
  root.style.setProperty('--accent', color);
  root.style.setProperty('--ring', '#52525b');
  root.style.setProperty(
    '--quivo-gradient',
    `linear-gradient(135deg, color-mix(in srgb, ${color} 88%, #fff 12%) 0%, color-mix(in srgb, ${lighter} 75%, transparent) 100%)`,
  );

  let tag = document.getElementById('quivo-accent-override') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'quivo-accent-override';
    document.head.appendChild(tag);
  }
  tag.textContent = `
    .from-blue-600 { --tw-gradient-from: ${color} !important; }
    .to-cyan-600 { --tw-gradient-to: ${lighter} !important; }
    .bg-gradient-to-r.from-blue-600.to-cyan-600 {
      background: linear-gradient(to right, ${color}, ${lighter}) !important;
    }
    .quivo-btn-gradient, .quivo-btn-primary {
      --btn-glass-bg: color-mix(in srgb, ${color} 22%, var(--bg-elevated));
      --btn-glass-border: color-mix(in srgb, ${color} 38%, var(--bg-border));
    }
  `;
}
