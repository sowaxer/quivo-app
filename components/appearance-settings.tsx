'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme-provider';
import { IconCheck, IconChevronDown, IconDeviceFloppy, IconLoader2 } from '@tabler/icons-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LS_APPEARANCE = 'quivo_appearance_v2';

interface AppearanceState {
  accentColor: string;
  neutralColor: string;
  language: string;
  responseAnimation: 'off' | 'agile' | 'elegant';
  rightClickMenu: 'disabled' | 'default';
  responseLanguage: string;
  transitionAnimation: 'none' | 'fade' | 'smooth';
  autoScroll: boolean;
  fontSize: number;
  codeTheme: string;
  mermaidTheme: string;
}

const DEFAULT: AppearanceState = {
  accentColor: '#292524',
  neutralColor: '#44403C',
  language: 'system',
  responseAnimation: 'agile',
  rightClickMenu: 'disabled',
  responseLanguage: 'en',
  transitionAnimation: 'fade',
  autoScroll: true,
  fontSize: 14,
  codeTheme: 'Quivo Theme',
  mermaidTheme: 'Quivo Theme',
};

function normalizeThemes(s: AppearanceState): AppearanceState {
  const next = { ...s };
  if (next.codeTheme === 'Finedge Theme') next.codeTheme = 'Quivo Theme';
  if (next.mermaidTheme === 'Finedge Theme') next.mermaidTheme = 'Quivo Theme';
  return next;
}

function loadState(): AppearanceState {
  try {
    const v2 = localStorage.getItem(LS_APPEARANCE);
    if (v2) return normalizeThemes({ ...DEFAULT, ...JSON.parse(v2) });
    const legacy =
      localStorage.getItem('finedge_appearance') ?? localStorage.getItem('quivo_appearance');
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<AppearanceState>;
      const next: AppearanceState = {
        ...DEFAULT,
        ...parsed,
        accentColor: DEFAULT.accentColor,
        neutralColor: DEFAULT.neutralColor,
        transitionAnimation: DEFAULT.transitionAnimation,
        autoScroll: DEFAULT.autoScroll,
      };
      const normalized = normalizeThemes(next);
      localStorage.setItem(LS_APPEARANCE, JSON.stringify(normalized));
      return normalized;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT;
}
function saveState(s: AppearanceState) {
  localStorage.setItem(LS_APPEARANCE, JSON.stringify(s));
}

// Lighten a hex color slightly for gradients
function lightenHex(hex: string, amount = 30): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (n >> 16) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// Apply accent color — sets CSS variables AND injects a live style tag
function applyAccent(color: string) {
  const root = document.documentElement;
  root.style.setProperty('--quivo-accent', color);
  root.style.setProperty('--accent', color);
  root.style.setProperty('--primary', color);
  root.style.setProperty('--ring', color);

  const lighter = lightenHex(color, 25);

  let tag = document.getElementById('quivo-accent-override') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'quivo-accent-override';
    document.head.appendChild(tag);
  }
  tag.textContent = `
    /* Gradient buttons */
    .from-blue-600 { --tw-gradient-from: ${color} !important; }
    .to-cyan-600   { --tw-gradient-to:   ${lighter} !important; }
    /* Solid blue backgrounds */
    .bg-\\[\\#3b82f6\\]  { background-color: ${color} !important; }
    /* Blue text */
    .text-\\[\\#3b82f6\\] { color: ${color} !important; }
    /* Blue borders */
    .border-\\[\\#3b82f6\\] { border-color: ${color} !important; }
    /* Blue ring */
    .ring-\\[\\#3b82f6\\]  { --tw-ring-color: ${color} !important; }
    /* Focus ring */
    .focus\\:border-\\[\\#3b82f6\\]\\/50:focus { border-color: ${color}80 !important; }
    /* Nav active gradient */
    .bg-gradient-to-r.from-blue-600.to-cyan-600 {
      background: linear-gradient(to right, ${color}, ${lighter}) !important;
    }
    /* Sidebar active item */
    .from-blue-600.to-cyan-600 {
      --tw-gradient-from: ${color};
      --tw-gradient-to: ${lighter};
    }
  `;
}

// ─── Theme colors — same order as product reference (custom picker + rainbow) ─
const THEME_COLORS = [
  '#fb7185', // pink-red
  '#f97316', // orange
  '#f59e0b', // amber / gold
  '#facc15', // pale yellow
  '#a3e635', // lime
  '#4ade80', // green
  '#2dd4bf', // cyan / teal
  '#38bdf8', // sky blue
  '#2563eb', // royal blue
  '#a855f7', // purple
  '#e879f9', // magenta / fuchsia
  '#ea580c', // red-orange
];

function isPresetAccent(hex: string) {
  const h = hex.trim().toLowerCase();
  return THEME_COLORS.some(c => c.toLowerCase() === h);
}

// ─── Neutral tints — dark charcoal → light (reset = system default) ───────────
const NEUTRAL_COLORS = [
  '', // reset
  '#1e293b',
  '#334155',
  '#475569',
  '#64748b',
  '#94a3b8',
  '#cbd5e1',
];

// ─── Code highlight themes ────────────────────────────────────────────────────
const CODE_THEMES = [
  'Quivo Theme', 'Andromeda', 'Aurora X', 'Ayu Dark', 'Ayu Light',
  'Ayu Mirage', 'Catppuccin Frappé', 'Catppuccin Latte', 'Catppuccin Macchiato',
  'Catppuccin Mocha', 'Dark Plus', 'Dracula Theme', 'Dracula Theme Soft',
  'GitHub Dark', 'GitHub Light', 'Gruvbox Dark', 'Material Dark', 'Material Light',
  'Min Dark', 'Min Light', 'Monokai', 'Nord', 'One Dark Pro', 'Palenight',
  'Rose Pine', 'Slack Dark', 'Solarized Dark', 'Solarized Light', 'Tokyo Night',
];

const CODE_THEME_STYLES: Record<string, { bg: string; comment: string; keyword: string; string: string; type: string; variable: string }> = {
  'Quivo Theme':      { bg: '#0d1117', comment: '#8b949e', keyword: '#ff7b72', string: '#a5d6ff', type: '#ffa657', variable: '#79c0ff' },
  'Andromeda':          { bg: '#23262e', comment: '#858585', keyword: '#e9fdac', string: '#ffe799', type: '#00e8c6', variable: '#ee5d43' },
  'Aurora X':           { bg: '#0a0e14', comment: '#4d5566', keyword: '#ffae57', string: '#bae67e', type: '#5ccfe6', variable: '#cbccc6' },
  'Ayu Dark':           { bg: '#0d1017', comment: '#626a73', keyword: '#ff8f40', string: '#aad94c', type: '#39bae6', variable: '#cccac2' },
  'Ayu Light':          { bg: '#fafafa', comment: '#abb0b6', keyword: '#ff9940', string: '#86b300', type: '#55b4d4', variable: '#5c6166' },
  'Catppuccin Frappé':  { bg: '#303446', comment: '#838ba7', keyword: '#ca9ee6', string: '#a6d189', type: '#ef9f76', variable: '#c6d0f5' },
  'Catppuccin Mocha':   { bg: '#1e1e2e', comment: '#6c7086', keyword: '#cba6f7', string: '#a6e3a1', type: '#fab387', variable: '#cdd6f4' },
  'Dracula Theme':      { bg: '#282a36', comment: '#6272a4', keyword: '#ff79c6', string: '#f1fa8c', type: '#8be9fd', variable: '#f8f8f2' },
  'GitHub Dark':        { bg: '#24292e', comment: '#959da5', keyword: '#f97583', string: '#9ecbff', type: '#79b8ff', variable: '#e1e4e8' },
  'GitHub Light':       { bg: '#ffffff', comment: '#6a737d', keyword: '#d73a49', string: '#032f62', type: '#e36209', variable: '#24292e' },
  'Monokai':            { bg: '#272822', comment: '#75715e', keyword: '#f92672', string: '#e6db74', type: '#66d9ef', variable: '#f8f8f2' },
  'Nord':               { bg: '#2e3440', comment: '#616e88', keyword: '#81a1c1', string: '#a3be8c', type: '#8fbcbb', variable: '#d8dee9' },
  'One Dark Pro':       { bg: '#282c34', comment: '#5c6370', keyword: '#c678dd', string: '#98c379', type: '#e5c07b', variable: '#abb2bf' },
  'Tokyo Night':        { bg: '#1a1b26', comment: '#565f89', keyword: '#9d7cd8', string: '#9ece6a', type: '#7dcfff', variable: '#a9b1d6' },
};

function getCodeStyle(theme: string) {
  return CODE_THEME_STYLES[theme] ?? CODE_THEME_STYLES['Quivo Theme'];
}

// ─── Mermaid themes ───────────────────────────────────────────────────────────
const MERMAID_THEMES = ['Quivo Theme', 'Mermaid Default', 'Mermaid Base', 'Mermaid Dark', 'Mermaid Forest', 'Mermaid Neutral'];

const MERMAID_STYLES: Record<string, { bg: string; border: string; text: string; line: string; boxBg: string }> = {
  'Quivo Theme':  { bg: '#0d1117', border: '#3b82f6', text: '#e6edf3', line: '#3b82f6',  boxBg: '#1e2836' },
  'Mermaid Default':{ bg: '#ffffff', border: '#999',    text: '#333',    line: '#333',     boxBg: '#ececff' },
  'Mermaid Base':   { bg: '#f4f4f4', border: '#aaa',    text: '#333',    line: '#aaa',     boxBg: '#fff' },
  'Mermaid Dark':   { bg: '#1f2020', border: '#ccc',    text: '#ccc',    line: '#ccc',     boxBg: '#3d3d3d' },
  'Mermaid Forest': { bg: '#d5e8d4', border: '#82b366', text: '#333',    line: '#82b366',  boxBg: '#d5e8d4' },
  'Mermaid Neutral':{ bg: '#eee',    border: '#aaa',    text: '#444',    line: '#aaa',     boxBg: '#fff' },
};

// ─── Mini UI preview ──────────────────────────────────────────────────────────
function MiniUIPreview({ accentColor, neutralColor, resolvedTheme }: { accentColor: string; neutralColor: string; resolvedTheme: 'dark' | 'light' }) {
  const neutral = neutralColor || '#78716c';
  const isDark = resolvedTheme === 'dark';
  const bgMain   = isDark ? '#0d1117' : '#ffffff';
  const bgSide   = isDark ? '#0a0e1a' : '#fafafa';
  const bgBorder = isDark ? '#1e2836' : '#e4e4e7';
  const bgRow    = isDark ? '#1e2836' : '#f4f4f5';
  const bgInput  = isDark ? '#141b26' : '#fafafa';
  return (
    <div className="relative h-[120px] w-full rounded-xl overflow-hidden border"
      style={{ background: bgMain, borderColor: bgBorder }}>
      {/* Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-[28%] border-r flex flex-col gap-1 p-1.5"
        style={{ background: bgSide, borderColor: bgBorder }}>
        {[accentColor, neutral, neutral, neutral, neutral].map((c, i) => (
          <div key={i} className="flex items-center gap-1 rounded-sm px-1 py-0.5"
            style={{ background: i === 0 ? accentColor + '20' : 'transparent' }}>
            <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
            <div className="h-1 flex-1 rounded" style={{ background: i === 0 ? accentColor + '60' : bgRow }} />
          </div>
        ))}
      </div>
      {/* Main area */}
      <div className="absolute left-[28%] right-0 top-0 bottom-0 p-2 flex flex-col gap-1.5">
        <div className="h-2 w-[60%] rounded" style={{ background: isDark ? '#e6edf320' : '#18181b18' }} />
        <div className="h-1.5 w-[80%] rounded" style={{ background: isDark ? '#8b949e20' : '#52525b28' }} />
        <div className="h-1.5 w-[50%] rounded" style={{ background: isDark ? '#8b949e15' : '#52525b20' }} />
        <div className="flex-1" />
        {/* Input bar */}
        <div className="h-6 rounded-lg border flex items-center px-2 gap-1"
          style={{ borderColor: bgBorder, background: bgInput }}>
          <div className="h-1.5 flex-1 rounded" style={{ background: bgRow }} />
          <div className="h-4 w-4 rounded flex items-center justify-center"
            style={{ background: accentColor }}>
            <div className="h-1 w-1 rounded-full bg-[#F8F7F3]" />
          </div>
        </div>
        {/* Accent bar at bottom */}
        <div className="h-0.5 w-full rounded" style={{ background: accentColor }} />
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      {title && (
        <div className="border-b border-[var(--bg-border)] px-5 py-3">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
        </div>
      )}
      <div className="divide-y divide-[var(--bg-border)]">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">{label}</p>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ButtonGroup<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; icon?: string }[];
  value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] p-0.5">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tracking-tight transition-all ${
            value === o.value
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_rgba(28,25,23,0.06)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}>
          {o.icon && <span>{o.icon}</span>}{o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quivo-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
        checked ? 'bg-[var(--text-primary)] dark:bg-stone-800' : 'bg-[var(--bg-border)]'
      }`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--bg-base)] shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SelectDropdown({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex min-w-[160px] items-center justify-between gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all hover:border-[var(--text-muted)]">
        <span>{value}</span>
        <IconChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 max-h-64 min-w-[200px] overflow-y-auto rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] shadow-[0_8px_24px_rgba(28,25,23,0.08)]">
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-hover)] ${value === opt ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              {opt}
              {value === opt && <IconCheck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Theme preview card ───────────────────────────────────────────────────────
function ThemeCard({ themeValue, label, active, onClick }: {
  themeValue: 'dark' | 'light' | 'system';
  label: string; active: boolean; onClick: () => void;
}) {
  const previews = {
    light: { bar: '#F1EFE9', body: '#F8F7F3', text1: '#1C1917', text2: '#44403C', line1: '#e7e5e4', line2: '#ebe8e0' },
    dark:  { bar: '#1e293b', body: '#0f172a', text1: '#f1f5f9', text2: '#94a3b8', line1: '#1e293b', line2: '#0f172a' },
    system:{ bar: '#1e293b', body: '#0f172a', text1: '#f1f5f9', text2: '#94a3b8', line1: '#44403C', line2: '#292524' },
  };
  const p = previews[themeValue];
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${
        active
          ? 'ring-2 ring-[var(--quivo-accent)] ring-offset-2 ring-offset-[var(--bg-base)] opacity-100'
          : 'opacity-75 hover:opacity-100'
      }`}>
      <div className="w-24 overflow-hidden rounded-lg border border-[var(--bg-border)] shadow-[0_1px_2px_rgba(28,25,23,0.06)]">
        <div className="flex items-center gap-1 px-2 py-1" style={{ background: p.bar }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#b45309' }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#a16207' }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#4d7c0f' }} />
          <div className="ml-1 h-2 flex-1 rounded" style={{ background: p.line1 }} />
        </div>
        <div className="flex" style={{ background: p.body, height: 40 }}>
          <div className="flex w-7 flex-col gap-0.5 p-1" style={{ background: p.bar }}>
            {[p.text2, p.text2, p.text2].map((c, i) => (
              <div key={i} className="h-1 w-full rounded-sm" style={{ background: c + '40' }} />
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-0.5 p-1.5">
            <div className="h-1.5 w-3/4 rounded" style={{ background: p.text1 + '40' }} />
            <div className="h-1 w-1/2 rounded" style={{ background: p.text2 + '40' }} />
            {themeValue === 'system' && (
              <div className="mt-0.5 h-1 w-2/3 rounded" style={{ background: p.line1 + '80' }} />
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[11px] font-medium tracking-tight text-[var(--text-primary)]">
        {themeValue === 'light' ? '☀️' : themeValue === 'dark' ? '🌙' : '💻'} {label}
      </div>
      {active && <div className="h-1 w-1 rounded-full bg-[var(--quivo-accent)]" />}
    </button>
  );
}

// ─── Code preview ─────────────────────────────────────────────────────────────
function CodePreview({ codeTheme }: { codeTheme: string }) {
  const s = getCodeStyle(codeTheme);
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--bg-border)] font-mono text-xs leading-relaxed p-4"
      style={{ background: s.bg }}>
      <p><span style={{ color: s.keyword }}>const</span> <span style={{ color: s.variable }}>person</span> = {'{'} <span style={{ color: s.string }}>name</span>: <span style={{ color: s.string }}>"Alice"</span>, <span style={{ color: s.type }}>age</span>: <span style={{ color: s.variable }}>30</span> {'}'}</p>
      <p><span style={{ color: s.keyword }}>type</span> <span style={{ color: s.type }}>PersonType</span> = <span style={{ color: s.keyword }}>typeof</span> <span style={{ color: s.variable }}>person</span>; <span style={{ color: s.comment }}>// {'{'} name: string; age: number {'}'}</span></p>
      <p style={{ color: s.comment }}>{`// 'satisfies' to ensure a type matches but allows more specific types`}</p>
      <p><span style={{ color: s.keyword }}>type</span> <span style={{ color: s.type }}>Animal</span> = {'{'} <span style={{ color: s.string }}>name</span>: <span style={{ color: s.type }}>string</span> {'}'}</p>
      <p><span style={{ color: s.keyword }}>const</span> <span style={{ color: s.variable }}>dog</span> = {'{'} <span style={{ color: s.string }}>name</span>: <span style={{ color: s.string }}>"Buddy"</span>, <span style={{ color: s.string }}>breed</span>: <span style={{ color: s.string }}>"Golden Retriever"</span> {'}'} <span style={{ color: s.keyword }}>satisfies</span> <span style={{ color: s.type }}>Animal</span>;</p>
    </div>
  );
}

// ─── Mermaid preview ──────────────────────────────────────────────────────────
function MermaidPreview({ mermaidTheme }: { mermaidTheme: string }) {
  const s = MERMAID_STYLES[mermaidTheme] ?? MERMAID_STYLES['Quivo Theme'];
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--bg-border)] flex items-center justify-center py-6"
      style={{ background: s.bg }}>
      <svg width="280" height="160" viewBox="0 0 280 160">
        {/* Alice box */}
        <rect x="30" y="10" width="60" height="26" rx="3" fill={s.boxBg} stroke={s.border} strokeWidth="1.5" />
        <text x="60" y="27" textAnchor="middle" fontSize="11" fill={s.text} fontFamily="sans-serif">Alice</text>
        {/* John box */}
        <rect x="190" y="10" width="60" height="26" rx="3" fill={s.boxBg} stroke={s.border} strokeWidth="1.5" />
        <text x="220" y="27" textAnchor="middle" fontSize="11" fill={s.text} fontFamily="sans-serif">John</text>
        {/* Lines down */}
        <line x1="60" y1="36" x2="60" y2="150" stroke={s.line} strokeWidth="1" strokeDasharray="4 2" />
        <line x1="220" y1="36" x2="220" y2="150" stroke={s.line} strokeWidth="1" strokeDasharray="4 2" />
        {/* Arrow 1: Alice → John */}
        <line x1="60" y1="60" x2="215" y2="60" stroke={s.line} strokeWidth="1.5" markerEnd="url(#arr)" />
        <text x="140" y="56" textAnchor="middle" fontSize="9" fill={s.text} fontFamily="sans-serif">Hello John, how are you?</text>
        {/* Arrow 2: John → Alice */}
        <line x1="220" y1="90" x2="65" y2="90" stroke={s.line} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#arr2)" />
        <text x="140" y="86" textAnchor="middle" fontSize="9" fill={s.text} fontFamily="sans-serif">Great!</text>
        {/* Arrow 3: Alice → John */}
        <line x1="60" y1="118" x2="215" y2="118" stroke={s.line} strokeWidth="1.5" markerEnd="url(#arr)" />
        <text x="140" y="114" textAnchor="middle" fontSize="9" fill={s.text} fontFamily="sans-serif">See you later!</text>
        {/* Bottom boxes */}
        <rect x="30" y="132" width="60" height="22" rx="3" fill={s.boxBg} stroke={s.border} strokeWidth="1.5" />
        <text x="60" y="147" textAnchor="middle" fontSize="11" fill={s.text} fontFamily="sans-serif">Alice</text>
        <rect x="190" y="132" width="60" height="22" rx="3" fill={s.boxBg} stroke={s.border} strokeWidth="1.5" />
        <text x="220" y="147" textAnchor="middle" fontSize="11" fill={s.text} fontFamily="sans-serif">John</text>
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={s.line} />
          </marker>
          <marker id="arr2" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M6,0 L6,6 L0,3 z" fill={s.line} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AppearanceSettings() {
  const { theme: appTheme, setTheme: setAppTheme, resolved } = useTheme();
  const [state, setState] = useState<AppearanceState>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const accentPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = loadState();
    setState(s);
    applyAccent(s.accentColor);
  }, []);

  function update<K extends keyof AppearanceState>(key: K, value: AppearanceState[K]) {
    setState(prev => {
      const next = { ...prev, [key]: value };
      // Apply accent immediately for real-time preview
      if (key === 'accentColor') applyAccent(value as string);
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    setSaving(true);
    saveState(state);
    applyAccent(state.accentColor);
    setTimeout(() => { setSaving(false); setSaved(true); }, 400);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-base)]">
      <div className="mx-auto max-w-2xl space-y-5 px-6 py-8">

        {/* ── Page title + Save button ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">Appearance</h1>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">Customize how Quivo looks and feels</p>
          </div>
          <button type="button" onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              saved
                ? 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-[var(--bg-border)] bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 dark:bg-stone-800 dark:text-[#F8F7F3] dark:hover:bg-stone-700'
            }`}>
            {saving ? <IconLoader2 className="h-4 w-4 animate-spin" />
              : saved ? <IconCheck className="h-4 w-4" strokeWidth={2.5} />
              : <IconDeviceFloppy className="h-4 w-4" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* ── General Settings ─────────────────────────────────────────────── */}
        <Section title="General Settings">

          {/* Theme */}
          <div className="px-5 py-4">
            <p className="mb-3 text-sm font-medium tracking-tight text-[var(--text-primary)]">Theme</p>
            <div className="flex items-start gap-4">
              <ThemeCard themeValue="light"  label="Light"     active={appTheme === 'light'}  onClick={() => setAppTheme('light')} />
              <ThemeCard themeValue="dark"   label="Dark"      active={appTheme === 'dark'}   onClick={() => setAppTheme('dark')} />
              <ThemeCard themeValue="system" label="Automatic" active={appTheme === 'system'} onClick={() => setAppTheme('system')} />
            </div>
          </div>

          {/* Language */}
          <Row label="Language">
            <SelectDropdown
              options={['Follow System', 'English', 'Español', 'Français', 'Deutsch', 'Português', 'Italian', 'Japanese', 'Korean', 'Chinese']}
              value={state.language === 'system' ? 'Follow System' : state.language}
              onChange={v => update('language', v === 'Follow System' ? 'system' : v)}
            />
          </Row>

          {/* Response Animation */}
          <Row label="Response Animation" description="Select the animation speed for application response actions">
            <ButtonGroup
              options={[
                { value: 'off',     label: 'Off',     icon: '⊘' },
                { value: 'agile',   label: 'Agile',   icon: '⚡' },
                { value: 'elegant', label: 'Elegant', icon: '✦' },
              ]}
              value={state.responseAnimation}
              onChange={v => update('responseAnimation', v)}
            />
          </Row>

          {/* Right-click menu */}
          <Row label="Right-Click Menu Mode" description="Enable the right-click menu for some list items">
            <ButtonGroup
              options={[
                { value: 'disabled', label: 'Disabled' },
                { value: 'default',  label: 'Default' },
              ]}
              value={state.rightClickMenu}
              onChange={v => update('rightClickMenu', v)}
            />
          </Row>

          {/* Response Language */}
          <Row label="Response Language" description="Choose the Agent's reply language">
            <SelectDropdown
              options={['English', 'Español', 'Français', 'Deutsch', 'Português', 'Italiano', '日本語', '한국어', '中文']}
              value={state.responseLanguage === 'en' ? 'English' : state.responseLanguage}
              onChange={v => update('responseLanguage', v === 'English' ? 'en' : v)}
            />
          </Row>
        </Section>

        {/* ── Application Appearance ───────────────────────────────────────── */}
        <Section title="Application Appearance">

          {/* Color Palette preview */}
          <div className="px-5 py-4">
            <p className="mb-3 text-sm font-medium tracking-tight text-[var(--text-primary)]">Color Palette</p>
            <MiniUIPreview accentColor={state.accentColor} neutralColor={state.neutralColor} resolvedTheme={resolved} />
          </div>

          {/* Theme Color */}
          <div className="border-b border-[var(--bg-border)] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Theme Color</p>
                <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">Custom theme color</p>
              </div>
              <div className="flex max-w-[min(100%,380px)] flex-wrap justify-end gap-1.5">
                <input
                  ref={accentPickerRef}
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(state.accentColor) ? state.accentColor : '#292524'}
                  onChange={e => update('accentColor', e.target.value)}
                  className="sr-only"
                  aria-hidden
                />
                <button
                  type="button"
                  title="Custom color"
                  onClick={() => accentPickerRef.current?.click()}
                  className="relative h-6 w-6 shrink-0 rounded-full border border-[var(--bg-border)] transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#44403C] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]"
                  style={{
                    background: 'repeating-conic-gradient(#78716c 0% 25%, #44403c 0% 50%) 50% / 6px 6px',
                  }}>
                  {!isPresetAccent(state.accentColor) && (
                    <IconCheck className="absolute inset-0 m-auto h-3.5 w-3.5 text-[#F8F7F3] drop-shadow" strokeWidth={2.5} />
                  )}
                </button>
                {THEME_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => update('accentColor', color)}
                    title={color}
                    className="relative h-6 w-6 shrink-0 rounded-full transition-all hover:scale-110 focus:outline-none"
                    style={{ backgroundColor: color, boxShadow: state.accentColor === color ? `0 0 0 2px var(--bg-base), 0 0 0 4px ${color}` : undefined }}>
                    {state.accentColor === color && (
                      <IconCheck className="absolute inset-0 m-auto h-3.5 w-3.5 text-[#F8F7F3] drop-shadow" strokeWidth={2.5} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Neutral Color */}
          <div className="border-b border-[var(--bg-border)] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Neutral Color</p>
                <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">Custom neutral color</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {NEUTRAL_COLORS.map((color, i) => (
                  <button key={i} type="button" onClick={() => update('neutralColor', color)}
                    title={color || 'Reset'}
                    className="relative h-6 w-6 shrink-0 rounded-full border border-[var(--bg-border)] transition-all hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: color || '#292524',
                      boxShadow: state.neutralColor === color ? `0 0 0 2px var(--bg-base), 0 0 0 3px ${color || '#78716c'}` : undefined,
                    }}>
                    {i === 0 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#F8F7F3]">✕</span>}
                    {state.neutralColor === color && color && (
                      <IconCheck className="absolute inset-0 m-auto h-3 w-3 text-[#F8F7F3] drop-shadow" strokeWidth={2.5} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Transition Animation ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] px-5 py-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <div>
            <p className="text-sm font-medium tracking-tight text-[var(--text-primary)]">Transition Animation</p>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">Choose how chat messages appear</p>
          </div>
          <ButtonGroup
            options={[
              { value: 'none',  label: 'None' },
              { value: 'fade',  label: 'Fade In' },
              { value: 'smooth',label: 'Smooth' },
            ]}
            value={state.transitionAnimation}
            onChange={v => update('transitionAnimation', v)}
          />
        </div>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <Section title="Features">
          {/* Key Highlights */}
          <div className="px-5 py-4">
            <p className="mb-2 text-sm font-semibold tracking-tight text-[var(--text-primary)]">Key Highlights</p>
            <ul className="space-y-1.5">
              <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs leading-relaxed text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-secondary)]">Multi-model</span>
                <span>Claude, Gemini, and GPT-class models — your API keys, your cost.</span>
              </li>
              {[
                { icon: '🧠', text: 'AI Agents: 16+ finance & accounting specialists' },
                { icon: '🔧', text: 'Tools: Stripe, Gmail, Calendar, Web Search' },
                { icon: '📚', text: 'Knowledge Base: RAG with your documents' },
                { icon: '🔒', text: 'Your API key, your cost — Quivo charges nothing for AI' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  <span>{item.icon}</span>
                  <span dangerouslySetInnerHTML={{ __html: item.text.replace(/`([^`]+)`/g, '<code class="rounded border border-[var(--bg-border)] bg-[var(--bg-hover)] px-1 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">$1</code>') }} />
                </li>
              ))}
            </ul>
          </div>

          {/* Auto-scroll */}
          <Row label="Auto-scroll During AI Response" description="Automatically scroll to bottom while AI is generating response">
            <Toggle checked={state.autoScroll} onChange={v => update('autoScroll', v)} />
          </Row>
        </Section>

        {/* ── Font Size ─────────────────────────────────────────────────────── */}
        <Section title="">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium tracking-tight text-[var(--text-primary)]">Font Size</p>
                <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">Font size of messages</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--text-muted)]">A</span>
                <input type="range" min={12} max={20} value={state.fontSize}
                  onChange={e => update('fontSize', Number(e.target.value))}
                  className="w-32 cursor-pointer"
                  style={{ accentColor: '#44403C' }}
                />
                <span className="text-sm text-[var(--text-primary)]">A</span>
                <span className="flex h-7 w-10 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] text-sm font-medium tracking-tight text-[var(--text-primary)]">
                  {state.fontSize}
                </span>
              </div>
            </div>
            {/* Preview */}
            <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] px-4 py-3">
              <p style={{ fontSize: state.fontSize }} className="leading-relaxed text-[var(--text-primary)]">
                Welcome to Quivo. One sentence is enough — just state your goal.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Code Highlight Theme ─────────────────────────────────────────── */}
        <Section title="">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Code Highlight Theme</p>
              <SelectDropdown
                options={CODE_THEMES}
                value={state.codeTheme}
                onChange={v => update('codeTheme', v)}
              />
            </div>
            <CodePreview codeTheme={state.codeTheme} />
          </div>
        </Section>

        {/* ── Mermaid Theme ────────────────────────────────────────────────── */}
        <Section title="">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Mermaid Diagram Theme</p>
              <SelectDropdown
                options={MERMAID_THEMES}
                value={state.mermaidTheme}
                onChange={v => update('mermaidTheme', v)}
              />
            </div>
            <MermaidPreview mermaidTheme={state.mermaidTheme} />
          </div>
        </Section>

      </div>
    </div>
  );
}
