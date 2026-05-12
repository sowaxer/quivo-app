'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGoogleConnection } from '@/lib/use-google-connection';
import {
  IconSearch, IconDownload, IconLoader2, IconFolder,
  IconFileText, IconFileSpreadsheet, IconPresentation,
  IconPhoto, IconFile, IconExternalLink, IconRefresh,
} from '@tabler/icons-react';
import { IconBrandGoogle } from '@tabler/icons-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const cls = 'h-5 w-5';
  if (mimeType.includes('folder'))       return <IconFolder         className={cls + ' text-[#f59e0b]'} />;
  if (mimeType.includes('document'))     return <IconFileText       className={cls + ' text-[#3b82f6]'} />;
  if (mimeType.includes('spreadsheet'))  return <IconFileSpreadsheet className={cls + ' text-[#22c55e]'} />;
  if (mimeType.includes('presentation')) return <IconPresentation   className={cls + ' text-[#f59e0b]'} />;
  if (mimeType.startsWith('image/'))     return <IconPhoto          className={cls + ' text-[#06b6d4]'} />;
  if (mimeType === 'application/pdf')    return <IconFileText       className={cls + ' text-[#ef4444]'} />;
  return                                        <IconFile           className={cls + ' text-[#8b949e]'} />;
}

export default function DriveBrowser() {
  const { connected, checking } = useGoogleConnection();
  const [files, setFiles]         = useState<DriveFile[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searchQ, setSearchQ]     = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  // ── Load files ───────────────────────────────────────────────────────────
  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/google/drive?action=list&q=${encodeURIComponent(q)}&pageSize=40`
        : '/api/google/drive?action=list&pageSize=40';
      const res = await fetch(url);
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected) load();
  }, [connected, load]);

  // ── Download file ────────────────────────────────────────────────────────
  const download = async (file: DriveFile) => {
    setDownloading(file.id);
    try {
      const res = await fetch(`/api/google/drive?action=download&id=${file.id}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloading(null);
    }
  };

  if (checking) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-3">
        <IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
        <p className="text-xs text-[#8b949e]">Checking Google connection…</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-6 text-center px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#141b26] border border-[#1e2836]">
          <span className="text-4xl">☁️</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#e6edf3]">Connect Google Drive</h3>
          <p className="mt-1 max-w-sm text-sm text-[#8b949e]">Browse, search, and download your documents directly from Finedge.</p>
        </div>
        <button
          onClick={() => { window.location.href = '/api/google/auth'; }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/40 hover:shadow-blue-900/60 transition-all"
        >
          <IconBrandGoogle className="h-4 w-4" />
          Connect Google Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#1e2836] bg-[#0f1419] px-6 py-4">
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b949e]" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(searchQ)}
            placeholder="Search files in Drive…"
            className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] py-2 pl-9 pr-4 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#3b82f6]/50 focus:outline-none" />
        </div>
        <button onClick={() => load(searchQ)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1e2836] bg-[#141b26] text-[#8b949e] hover:text-[#e6edf3]">
          <IconRefresh className="h-4 w-4" />
        </button>
        <button
          onClick={() => { window.location.href = '/api/google/auth'; }}
          className="flex items-center gap-1.5 rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5 text-[10px] font-semibold text-[#22c55e]"
        >
          <IconBrandGoogle className="h-3 w-3" /> Connected
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" /></div>
        ) : files.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-semibold text-[#e6edf3]">No files found</p>
            <p className="text-xs text-[#8b949e]">Try a different search term</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1e2836] bg-[#141b26] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b border-[#1e2836] px-4 py-3">
              {['Name', 'Modified', 'Size', 'Actions'].map(h => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">{h}</p>
              ))}
            </div>
            {/* Rows */}
            {files.map(file => (
              <div key={file.id} className="group grid grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b border-[#1e2836] px-4 py-3 transition-colors hover:bg-[#1a2030] last:border-0">
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon mimeType={file.mimeType} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#e6edf3]">{file.name}</p>
                    <p className="text-[10px] text-[#8b949e]">{file.mimeType.split('/').pop()?.replace('vnd.google-apps.', 'Google ')}</p>
                  </div>
                </div>
                {/* Modified */}
                <p className="self-center text-xs text-[#8b949e]">{formatTime(file.modifiedTime)}</p>
                {/* Size */}
                <p className="self-center text-xs text-[#8b949e]">{formatBytes(file.size)}</p>
                {/* Actions */}
                <div className="flex items-center gap-1">
                  {file.webViewLink && (
                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#1e2836] hover:text-[#3b82f6]">
                      <IconExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {!file.mimeType.includes('folder') && (
                    <button onClick={() => download(file)} disabled={downloading === file.id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8b949e] hover:bg-[#1e2836] hover:text-[#22c55e] disabled:opacity-40">
                      {downloading === file.id
                        ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                        : <IconDownload className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
