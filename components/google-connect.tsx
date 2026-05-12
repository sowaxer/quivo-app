'use client';

import { useEffect, useState } from 'react';
import { IconBrandGoogle, IconCheck, IconPlugConnectedX, IconLoader2 } from '@tabler/icons-react';

interface Props {
  onConnected?: () => void;
}

export default function GoogleConnect({ onConnected }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch('/api/google/auth?status=1')
      .then(r => r.json())
      .then(d => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  const connect = () => {
    window.location.href = '/api/google/auth';
  };

  const disconnect = async () => {
    setDisconnecting(true);
    await fetch('/api/google/auth', { method: 'DELETE' });
    setConnected(false);
    setDisconnecting(false);
  };

  useEffect(() => {
    if (connected) onConnected?.();
  }, [connected, onConnected]);

  if (connected === null) {
    return (
      <div className="flex items-center gap-2 text-[#8b949e]">
        <IconLoader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Checking Google connection…</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5">
          <IconCheck className="h-3.5 w-3.5 text-[#22c55e]" strokeWidth={2.5} />
          <span className="text-xs font-semibold text-[#22c55e]">Google connected</span>
        </div>
        <button
          onClick={disconnect}
          disabled={disconnecting}
          className="flex items-center gap-1.5 rounded-xl border border-[#1e2836] px-3 py-1.5 text-xs text-[#8b949e] transition-all hover:border-[#ef4444]/30 hover:text-[#ef4444]"
        >
          {disconnecting
            ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
            : <IconPlugConnectedX className="h-3.5 w-3.5" />}
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-900/30 transition-all hover:shadow-blue-900/50"
    >
      <IconBrandGoogle className="h-4 w-4" />
      Connect Google Workspace
    </button>
  );
}
