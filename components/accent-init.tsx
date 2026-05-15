'use client';

import { useEffect } from 'react';
import { applyAccentColor, loadAccentColor } from '@/lib/appearance-accent';

export function AccentInit() {
  useEffect(() => {
    applyAccentColor(loadAccentColor());
    const onAccent = (e: Event) => {
      const color = (e as CustomEvent<string>).detail;
      if (color) applyAccentColor(color);
    };
    window.addEventListener('quivo:accent-updated', onAccent);
    return () => window.removeEventListener('quivo:accent-updated', onAccent);
  }, []);
  return null;
}
