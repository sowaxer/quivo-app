'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark', setTheme: () => {}, resolved: 'dark',
});

export function useTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolved, setResolved] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = (localStorage.getItem('finedge_theme') ?? 'dark') as Theme;
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    let actual: 'dark' | 'light' = 'dark';
    if (t === 'system') {
      actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actual = t;
    }
    root.setAttribute('data-theme', actual);
    setResolved(actual);
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('finedge_theme', t);
    applyTheme(t);
  }

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Theme Toggle Component (for Settings) ─────────────────────────────────────
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const OPTIONS: { value: Theme; label: string; icon: string }[] = [
    { value: 'dark',   label: 'Dark',   icon: '🌙' },
    { value: 'light',  label: 'Light',  icon: '☀️' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-xl border p-1"
      style={{
        borderColor: 'var(--bg-border)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      {OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => setTheme(opt.value)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90 ${
            theme === opt.value
              ? 'shadow-sm'
              : ''
          }`}
          style={
            theme === opt.value
              ? { backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }
              : { color: 'var(--text-muted)' }
          }
        >
          <span>{opt.icon}</span>
          {opt.label}
          {theme === opt.value && (
            <svg className="h-3 w-3 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12l4 4L19 7" /></svg>
          )}
        </button>
      ))}
    </div>
  );
}
