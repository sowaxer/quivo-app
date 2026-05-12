'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconUpload, IconFileText, IconFileCv, IconFileSpreadsheet,
  IconTrash, IconSearch, IconTag, IconX, IconCheck, IconLoader2,
  IconInfoCircle, IconFile, IconRefresh, IconBrandGithub,
  IconBrandNotion, IconBrandGoogleFilled, IconWorld, IconEdit,
  IconChevronDown, IconFilter, IconSelector, IconMessageCircle,
} from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KBDocument {
  id: string;
  name: string;
  content: string;
  fileType: string;
  size: number;
  tags: string[];
  createdAt: string;
  charCount: number;
  sourceType: 'file' | 'github' | 'notion' | 'drive' | 'web';
  status: 'ready' | 'processing';
  url?: string;
}

const LS_KB = 'finedge_kb_docs';
const MAX_DOC_SIZE = 500_000;

function loadDocs(): KBDocument[] {
  try { return JSON.parse(localStorage.getItem(LS_KB) ?? '[]'); } catch { return []; }
}
function saveDocs(docs: KBDocument[]) {
  try { localStorage.setItem(LS_KB, JSON.stringify(docs)); } catch { /* quota */ }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string, sourceType: string) {
  if (sourceType === 'github')  return <IconBrandGithub className="h-4 w-4 text-[#e6edf3]" />;
  if (sourceType === 'notion')  return <span className="text-sm font-bold text-[#e6edf3]">N</span>;
  if (sourceType === 'drive')   return <IconBrandGoogleFilled className="h-4 w-4 text-[#4285f4]" />;
  if (sourceType === 'web')     return <IconWorld className="h-4 w-4 text-[#22c55e]" />;
  if (type.includes('pdf'))     return <IconFileText className="h-4 w-4 text-[#ef4444]" />;
  if (type.includes('csv'))     return <IconFileCv className="h-4 w-4 text-[#22c55e]" />;
  if (type.includes('sheet') || type.includes('excel') || type.includes('xlsx'))
                                return <IconFileSpreadsheet className="h-4 w-4 text-[#22c55e]" />;
  return <IconFile className="h-4 w-4 text-[#8b949e]" />;
}

// ─── Read file helper ────────────────────────────────────────────────────────
async function readFileContent(file: File): Promise<string> {
  const type = file.type.toLowerCase();
  if (type === 'application/pdf') {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/kb/extract', { method: 'POST', body: formData, credentials: 'include' });
      if (res.ok) { const d = await res.json(); return d.text ?? ''; }
    } catch { /* fall through */ }
    return '[PDF extraction failed — paste the text manually]';
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) ?? '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const ALL_TAGS = ['tax', 'irs', 'payroll', 'audit', 'finance', 'budget', 'invoice', 'compliance', 'legal', 'contracts', 'bank', 'clients'];

// ─── Tags editor modal ────────────────────────────────────────────────────────
function TagsModal({ doc, onSave, onClose }: { doc: KBDocument; onSave: (tags: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(doc.tags);
  const [newTag, setNewTag] = useState('');

  function toggle(tag: string) {
    setSelected(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  }
  function addNew() {
    const t = newTag.trim().toLowerCase();
    if (t && !selected.includes(t)) setSelected(p => [...p, t]);
    setNewTag('');
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-[#1e2836] bg-[#0f1419] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2836] px-5 py-3">
          <h3 className="text-sm font-bold text-[#e6edf3]">Manage Tags — <span className="font-normal text-[#8b949e]">{doc.name}</span></h3>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-lg text-[#8b949e] hover:text-[#e6edf3]">
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <input value={newTag} onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } }}
              placeholder="New tag…"
              className="flex-1 rounded-lg border border-[#1e2836] bg-[#141b26] px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[var(--text-muted)] focus:outline-none" />
            <button onClick={addNew} className="rounded-lg bg-[var(--text-primary)] px-3 py-2 text-xs text-[var(--bg-base)] hover:opacity-90 font-semibold">Add</button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {Array.from(new Set([...ALL_TAGS, ...selected])).map(tag => (
              <label key={tag} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[#1e2836]">
                <input type="checkbox" checked={selected.includes(tag)} onChange={() => toggle(tag)}
                  className="h-4 w-4 rounded border-[#1e2836] accent-[var(--text-muted)]" />
                <span className="text-sm text-[#e6edf3]">{tag}</span>
                <span className="ml-auto text-[10px] text-[#8b949e]">
                  {selected.includes(tag) ? 'on' : 'off'}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#1e2836] px-5 py-3">
          <button onClick={onClose} className="rounded-xl border border-[#1e2836] px-4 py-2 text-xs text-[#8b949e] hover:bg-[#1e2836] transition-all">Cancel</button>
          <button onClick={() => onSave(selected)} className="rounded-xl bg-[var(--text-primary)] px-5 py-2 text-xs font-semibold text-[var(--bg-base)] hover:opacity-90 transition-all">Save Changes</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Data Source Modal ─────────────────────────────────────────────────────
function AddSourceModal({ onAdd, onClose }: { onAdd: (doc: KBDocument) => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'choose' | 'file' | 'github' | 'notion' | 'drive' | 'web'>('choose');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');

  async function handleFileSelect(f: File) {
    setFile(f);
    setName(f.name.replace(/\.[^.]+$/, ''));
    setLoading(true);
    try {
      const text = await readFileContent(f);
      setContent(text.slice(0, MAX_DOC_SIZE));
    } finally { setLoading(false); }
  }

  function addTag(t: string) {
    const tag = t.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags(p => [...p, tag]);
    setNewTag('');
  }

  function handleSave(sourceType: KBDocument['sourceType']) {
    const text = content.trim();
    if (!name.trim()) return;
    const doc: KBDocument = {
      id: `doc_${Date.now()}`,
      name: name.trim(), content: text,
      fileType: file?.type ?? 'text/plain',
      size: file?.size ?? new Blob([text]).size,
      tags, createdAt: new Date().toISOString(),
      charCount: text.length, sourceType,
      status: text ? 'ready' : 'processing',
      url: url || undefined,
    };
    onAdd(doc);
  }

  // ── Source chooser ───────────────────────────────────────────────────────
  if (step === 'choose') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
          className="w-full max-w-md rounded-3xl border border-[#1e2836] bg-[#0f1419] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1e2836] px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">Add Data Source</h2>
              <p className="text-xs text-[#8b949e]">Choose a source to connect your documents</p>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-xl text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3]">
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {/* File Uploads */}
            <button onClick={() => setStep('file')}
              className="flex w-full items-center gap-4 rounded-xl border border-[#1e2836] bg-[#141b26] p-4 text-left hover:border-[var(--text-muted)] hover:bg-[#1e2836] transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                <IconUpload className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e6edf3]">File Uploads</p>
                <p className="text-xs text-[#8b949e]">Upload files from your computer</p>
              </div>
            </button>

            {/* GitHub */}
            <button onClick={() => setStep('github')}
              className="flex w-full items-center gap-4 rounded-xl border border-[#1e2836] bg-[#141b26] p-4 text-left hover:border-[#8b949e]/40 hover:bg-[#1e2836] transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e2836] border border-[#1e2836]">
                <IconBrandGithub className="h-5 w-5 text-[#e6edf3]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e6edf3]">GitHub</p>
                <p className="text-xs text-[#8b949e]">Connect to GitHub repositories</p>
              </div>
            </button>

            {/* Notion */}
            <button onClick={() => setStep('notion')}
              className="flex w-full items-center gap-4 rounded-xl border border-[#1e2836] bg-[#141b26] p-4 text-left hover:border-[#e6edf3]/20 hover:bg-[#1e2836] transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e2836] border border-[#1e2836] text-base font-black text-[#e6edf3]">N</div>
              <div>
                <p className="text-sm font-semibold text-[#e6edf3]">Notion</p>
                <p className="text-xs text-[#8b949e]">Import pages from Notion workspace</p>
              </div>
            </button>

            {/* Google Drive */}
            <button onClick={() => setStep('drive')}
              className="flex w-full items-center gap-4 rounded-xl border border-[#1e2836] bg-[#141b26] p-4 text-left hover:border-[#4285f4]/40 hover:bg-[#1e2836] transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4285f4]/10 border border-[#4285f4]/20">
                <IconBrandGoogleFilled className="h-5 w-5 text-[#4285f4]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e6edf3]">Google Drive</p>
                <p className="text-xs text-[#8b949e]">Connect to Google Drive</p>
              </div>
            </button>

            {/* Web Scraping */}
            <button onClick={() => setStep('web')}
              className="flex w-full items-center gap-4 rounded-xl border border-[#1e2836] bg-[#141b26] p-4 text-left hover:border-[#22c55e]/40 hover:bg-[#1e2836] transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20">
                <IconWorld className="h-5 w-5 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e6edf3]">Web Scraping</p>
                <p className="text-xs text-[#8b949e]">Get content from web pages</p>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── File Upload step ─────────────────────────────────────────────────────
  if (step === 'file') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
          className="w-full max-w-xl rounded-3xl border border-[#1e2836] bg-[#0f1419] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-[#1e2836] px-6 py-4">
            <button onClick={() => setStep('choose')} className="text-[#8b949e] hover:text-[#e6edf3] transition-all">←</button>
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">File Uploads</h2>
              <p className="text-xs text-[#8b949e]">Upload PDF, TXT, CSV, XLSX, DOCX</p>
            </div>
            <button onClick={onClose} className="ml-auto flex h-7 w-7 items-center justify-center rounded-xl text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3]">
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-6 space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-[#1e2836] bg-[#141b26] p-0.5 w-fit">
              {(['upload', 'paste'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${mode === m ? 'bg-[var(--text-primary)] text-white' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
                  {m === 'upload' ? '📂 Upload File' : '📋 Paste Text'}
                </button>
              ))}
            </div>

            {mode === 'upload' ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onDragOver={e => e.preventDefault()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1e2836] bg-[#141b26] py-8 cursor-pointer hover:border-[var(--text-muted)] transition-all">
                {loading ? (
                  <IconLoader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
                ) : file ? (
                  <>
                    <span className="text-3xl mb-2">✅</span>
                    <p className="text-sm font-semibold text-[#e6edf3]">{file.name}</p>
                    <p className="text-xs text-[#22c55e] mt-1">{formatSize(file.size)} — ready</p>
                  </>
                ) : (
                  <>
                    <IconUpload className="mb-2 h-8 w-8 text-[#8b949e]" />
                    <p className="text-sm font-semibold text-[#e6edf3]">Drop file here or click to browse</p>
                    <p className="text-xs text-[#8b949e] mt-1">PDF · TXT · CSV · XLSX · DOCX · MD — max 10MB</p>
                  </>
                )}
                <input ref={inputRef} type="file" className="hidden"
                  accept=".pdf,.txt,.csv,.xlsx,.xls,.docx,.md"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>
            ) : (
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={7}
                placeholder="Paste document text — bank statements, contracts, tax returns, reports…"
                className="w-full resize-none rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[var(--text-muted)] focus:outline-none" />
            )}

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8b949e]">Document name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q1 2026 Bank Statement"
                className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[var(--text-muted)] focus:outline-none" />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#8b949e]">
                <IconTag className="h-3.5 w-3.5" /> Tags
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                    {t} <button onClick={() => setTags(p => p.filter(x => x !== t))}><IconX className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(newTag); } }}
                  placeholder="Add tag and press Enter…"
                  className="flex-1 rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[var(--text-muted)] focus:outline-none" />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ALL_TAGS.filter(t => !tags.includes(t)).slice(0, 8).map(t => (
                  <button key={t} onClick={() => setTags(p => [...p, t])}
                    className="rounded-full border border-[#1e2836] px-2 py-0.5 text-[10px] text-[#8b949e] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">+{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-[#1e2836] px-6 py-3">
            <button onClick={onClose} className="rounded-xl border border-[#1e2836] px-5 py-2 text-xs text-[#8b949e] hover:bg-[#1e2836] transition-all">Cancel</button>
            <button onClick={() => handleSave('file')} disabled={!name.trim() || loading}
              className="flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-6 py-2 text-xs font-semibold text-[var(--bg-base)] hover:opacity-90 disabled:opacity-40 transition-all">
              <IconCheck className="h-3.5 w-3.5" /> Add Source
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── External sources (GitHub, Notion, Drive, Web) ────────────────────────
  const sourceInfo: Record<string, { icon: React.ReactNode; color: string; label: string; placeholder: string }> = {
    github: { icon: <IconBrandGithub className="h-5 w-5 text-[#e6edf3]" />, color: 'border-[#8b949e]/20 bg-[#8b949e]/5', label: 'GitHub Repository URL', placeholder: 'https://github.com/your-org/repo' },
    notion: { icon: <span className="text-base font-black text-[#e6edf3]">N</span>, color: 'border-[#e6edf3]/10 bg-[#e6edf3]/5', label: 'Notion Page URL', placeholder: 'https://notion.so/your-workspace/page-id' },
    drive:  { icon: <IconBrandGoogleFilled className="h-5 w-5 text-[#4285f4]" />, color: 'border-[#4285f4]/20 bg-[#4285f4]/5', label: 'Google Drive Folder/File URL', placeholder: 'https://drive.google.com/drive/folders/...' },
    web:    { icon: <IconWorld className="h-5 w-5 text-[#22c55e]" />, color: 'border-[#22c55e]/20 bg-[#22c55e]/5', label: 'Website URL to scrape', placeholder: 'https://irs.gov/businesses/small-businesses...' },
  };
  const info = sourceInfo[step] ?? sourceInfo.web;
  const sourceName = { github: 'GitHub', notion: 'Notion', drive: 'Google Drive', web: 'Web Scraping' }[step] ?? '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-[#1e2836] bg-[#0f1419] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#1e2836] px-6 py-4">
          <button onClick={() => setStep('choose')} className="text-[#8b949e] hover:text-[#e6edf3]">←</button>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${info.color}`}>{info.icon}</div>
          <div>
            <h2 className="text-sm font-bold text-[#e6edf3]">Connect {sourceName}</h2>
            <p className="text-xs text-[#8b949e]">Enter your {sourceName} details below</p>
          </div>
          <button onClick={onClose} className="ml-auto flex h-7 w-7 items-center justify-center rounded-xl text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3]">
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8b949e]">{info.label}</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder={info.placeholder}
              className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[var(--text-muted)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8b949e]">Display name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={`My ${sourceName} source`}
              className="w-full rounded-xl border border-[#1e2836] bg-[#141b26] px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[var(--text-muted)] focus:outline-none" />
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 px-3 py-2.5">
            <IconInfoCircle className="h-4 w-4 text-[#f59e0b] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#f59e0b]">
              {step === 'drive' ? 'Make sure your Google account is connected in Settings → Integrations first.' :
               step === 'github' ? 'Public repositories are supported. For private repos, add your GitHub token in Settings.' :
               step === 'notion' ? 'Connect your Notion integration in Settings → Integrations first.' :
               'Web scraping works best with public pages. The content will be extracted and indexed.'}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#1e2836] px-6 py-3">
          <button onClick={onClose} className="rounded-xl border border-[#1e2836] px-5 py-2 text-xs text-[#8b949e] hover:bg-[#1e2836] transition-all">Cancel</button>
          <button onClick={() => { if (!name.trim() && url.trim()) setName(url.split('/').pop() ?? sourceName); handleSave(step as KBDocument['sourceType']); }}
            disabled={!url.trim()}
            className="flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-6 py-2 text-xs font-semibold text-[var(--bg-base)] hover:opacity-90 disabled:opacity-40 transition-all">
            <IconCheck className="h-3.5 w-3.5" /> Connect
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Knowledge Base Panel ─────────────────────────────────────────────────
export default function KnowledgeBasePanel({ onChatWithKb }: { onChatWithKb?: () => void }) {
  const [docs, setDocs] = useState<KBDocument[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [tagsModal, setTagsModal] = useState<KBDocument | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setDocs(loadDocs()); }, []);

  const allTags = Array.from(new Set(docs.flatMap(d => d.tags))).sort();
  const filtered = docs.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !tagFilter || d.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  function handleAdd(doc: KBDocument) {
    const updated = [doc, ...docs];
    setDocs(updated);
    saveDocs(updated);
    setShowAddModal(false);
  }

  function handleDelete(id: string) {
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    saveDocs(updated);
    setSelected(p => { const n = new Set(p); n.delete(id); return n; });
  }

  function handleDeleteSelected() {
    const updated = docs.filter(d => !selected.has(d.id));
    setDocs(updated);
    saveDocs(updated);
    setSelected(new Set());
  }

  function handleTagSave(docId: string, tags: string[]) {
    const updated = docs.map(d => d.id === docId ? { ...d, tags } : d);
    setDocs(updated);
    saveDocs(updated);
    setTagsModal(null);
  }

  function toggleSelect(id: string) {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  const sourceTypeLabel: Record<string, string> = {
    file: 'Upload', github: 'GitHub', notion: 'Notion', drive: 'Google Drive', web: 'Web Scraping',
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Toolbar — single top bar (page title lives in dashboard; avoid duplicate heading) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] px-6 py-3">
        {onChatWithKb && (
          <button
            type="button"
            onClick={onChatWithKb}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--bg-border)] bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <IconMessageCircle className="h-3.5 w-3.5" stroke={1.75} />
            Chat with KB
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-[var(--bg-base)] transition hover:opacity-90"
        >
          + Add Data Source
        </button>

        <div className="relative min-w-[12rem] flex-1 max-w-sm">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search doc name…"
            className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--text-muted)] focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            className="cursor-pointer appearance-none rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] py-2 pl-3 pr-8 text-xs text-[var(--text-secondary)] focus:border-[var(--text-muted)] focus:outline-none"
          >
            <option value="">Filter by tags</option>
            {allTags.map(t => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Refresh"
        >
          <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        {selected.size > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/15"
          >
            <IconTrash className="h-3.5 w-3.5" /> Delete ({selected.size})
          </button>
        )}
      </div>

      {/* Empty state */}
      {docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center py-16">
          <div className="mb-6 grid grid-cols-4 gap-2 opacity-40">
            {['🏛️','📧','📁','🎵','☁️','💬','🔵','🟡','🔴','🟢','📦','🎯','🐙','🔗','🌐','💡'].map((e, i) => (
              <div key={i} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1e2836] bg-[#141b26] text-xl">{e}</div>
            ))}
          </div>
          <h3 className="mb-1.5 text-sm font-bold text-[#e6edf3]">Upload or connect your data</h3>
          <p className="mb-1 text-xs text-[#8b949e] max-w-xs">AI agents can look up documents from your knowledge base when they need more information to answer questions.</p>
          <button onClick={() => setShowAddModal(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--bg-base)] shadow-md transition-all hover:opacity-90">
            + Add Data Source
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Connected Sources section */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-2 text-xs text-[#8b949e] font-semibold mb-3">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              Connected Sources
              <span className="ml-1 text-[#8b949e] font-normal">({filtered.length})</span>
            </div>
          </div>

          {/* Table */}
          <div className="px-6 pb-6">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <IconSearch className="mx-auto mb-2 h-7 w-7 text-[#8b949e]" />
                  <p className="text-xs text-[#8b949e]">No documents match your filter</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#1e2836] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[24px_1fr_130px_80px_140px_100px_80px] gap-0 border-b border-[#1e2836] bg-[#0f1419] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                  <div />
                  <div>Name</div>
                  <div>Last Sync</div>
                  <div>Size</div>
                  <div>Tags</div>
                  <div>Source Type</div>
                  <div>Status</div>
                </div>

                {/* Rows */}
                {filtered.map((doc, i) => (
                  <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`group grid grid-cols-[24px_1fr_130px_80px_140px_100px_80px] gap-0 items-center px-4 py-3 text-xs transition-all hover:bg-[#1e2836] ${i < filtered.length - 1 ? 'border-b border-[#1e2836]' : ''} ${selected.has(doc.id) ? 'bg-[var(--text-primary)]/5' : 'bg-[#141b26]'}`}>

                    {/* Checkbox */}
                    <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)}
                      className="h-3.5 w-3.5 rounded accent-[var(--text-muted)] cursor-pointer" />

                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#1e2836] bg-[#0f1419]">
                        {fileIcon(doc.fileType, doc.sourceType)}
                      </div>
                      <span className="truncate text-xs font-medium text-[#e6edf3]">{doc.name}</span>
                    </div>

                    {/* Last Sync */}
                    <div className="text-[11px] text-[#8b949e]">
                      {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {/* Size */}
                    <div className="text-[11px] text-[#8b949e]">{formatSize(doc.size)}</div>

                    {/* Tags */}
                    <div className="flex items-center gap-1 min-w-0">
                      {doc.tags.slice(0, 2).map(t => (
                        <span key={t} className="rounded-full bg-[#1e2836] px-1.5 py-0.5 text-[10px] text-[#8b949e]">{t}</span>
                      ))}
                      {doc.tags.length > 2 && <span className="text-[10px] text-[#8b949e]">+{doc.tags.length - 2}</span>}
                      <button onClick={() => setTagsModal(doc)}
                        className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#8b949e] opacity-0 hover:text-[var(--text-primary)] group-hover:opacity-100 transition-all">
                        <IconEdit className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Source Type */}
                    <div className="text-[11px] text-[#8b949e]">{sourceTypeLabel[doc.sourceType] ?? 'Upload'}</div>

                    {/* Status + delete */}
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        doc.status === 'ready' ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                      }`}>
                        {doc.status === 'ready' ? 'Ready' : 'Processing'}
                      </span>
                      <button onClick={() => handleDelete(doc.id)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#8b949e] opacity-0 hover:text-[#ef4444] group-hover:opacity-100 transition-all">
                        <IconTrash className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddSourceModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
        {tagsModal && <TagsModal doc={tagsModal} onSave={tags => handleTagSave(tagsModal.id, tags)} onClose={() => setTagsModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
