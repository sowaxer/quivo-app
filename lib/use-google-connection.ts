'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Checks Google connection status with a 5-second timeout.
 * Always resolves — defaults to false on any error or timeout
 * so the "Connect" button is shown rather than an infinite spinner.
 */
export function useGoogleConnection() {
  const [connected, setConnected] = useState<boolean>(false);
  const [checking, setChecking]   = useState<boolean>(true);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/google/auth?status=1', {
        signal: controller.signal,
        credentials: 'include',
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected === true);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return { connected, checking, recheck: check };
}
