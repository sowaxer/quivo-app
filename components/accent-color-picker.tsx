'use client';

import { useEffect, useState } from 'react';
import { ACCENT_PRESETS, loadAccentColor, saveAccentColor } from '@/lib/appearance-accent';

export function AccentColorPicker({ compact }: { compact?: boolean }) {
  const [color, setColor] = useState('#2563eb');

  useEffect(() => {
    setColor(loadAccentColor());
    const onUpdate = (e: Event) => {
      const c = (e as CustomEvent<string>).detail;
      if (c) setColor(c);
    };
    window.addEventListener('quivo:accent-updated', onUpdate);
    return () => window.removeEventListener('quivo:accent-updated', onUpdate);
  }, []);

  function pick(c: string) {
    setColor(c);
    saveAccentColor(c);
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className="text-xs text-[var(--text-muted)]">
        Primary buttons use a glass style with this color. Applies across the app.
      </p>
      <div className="flex flex-wrap gap-2">
        {ACCENT_PRESETS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => pick(c)}
            aria-label={`Accent ${c}`}
            className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 ${
              color.toLowerCase() === c.toLowerCase()
                ? 'border-white ring-2 ring-[var(--quivo-accent)] scale-110'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <label
          className="flex h-8 cursor-pointer items-center gap-1 rounded-full border border-[var(--bg-border)] bg-[var(--bg-hover)] px-2 text-[10px] text-[var(--text-muted)]"
          title="Custom color"
        >
          Custom
          <input
            type="color"
            value={color}
            onChange={e => pick(e.target.value)}
            className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
      </div>
      <button type="button" className="quivo-btn-primary rounded-full px-4 py-2 text-[12px]">
        Preview button
      </button>
    </div>
  );
}
