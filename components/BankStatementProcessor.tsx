'use client';

import { useState, useRef, useCallback } from 'react';
import { IconX, IconFileSpreadsheet, IconLoader2 } from '@tabler/icons-react';
import { generateExcel, type StatementData } from '@/lib/generateExcel';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  taxCategory: string;
  notes?: string;
}

interface ProcessResult {
  success: boolean;
  clientName: string;
  taxYear: string;
  entityType: string;
  data: StatementData & { transactions: Transaction[] };
}

type Step = 'idle' | 'processing' | 'done' | 'error';

const ENTITY_TYPES = ['LLC', 'S-Corp', 'C-Corp', 'Sole Proprietor', 'Partnership'];
const TAX_YEARS = ['2023', '2024', '2025', '2026'];

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type Props = { compact?: boolean };

export default function BankStatementProcessor({ compact = false }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clientName, setClientName] = useState('');
  const [taxYear, setTaxYear] = useState('2025');
  const [entityType, setEntityType] = useState('LLC');
  const [step, setStep] = useState<Step>('idle');
  const [logLines, setLogLines] = useState<{ msg: string; ok: boolean }[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string, ok = true) => setLogLines((prev) => [...prev, { msg, ok }]);

  const handleFile = (f: File) => {
    const okType = f.type.includes('pdf') || f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.pdf');
    if (!okType) { setError('Solo se aceptan PDFs o imágenes.'); return; }
    setFile(f); setError(''); setResult(null); setStep('idle');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, []);

  const process = async () => {
    if (!file) return;
    setStep('processing'); setLogLines([]); setProgress(0); setError('');
    addLog('Leyendo archivo...'); setProgress(10);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('clientName', clientName || 'Cliente');
    fd.append('taxYear', taxYear);
    fd.append('entityType', entityType);
    addLog('Enviando a Claude AI...'); setProgress(25);
    try {
      const res = await fetch('/api/process-statement', { method: 'POST', body: fd, credentials: 'include' });
      setProgress(70); addLog('Procesando respuesta...');
      const json = (await res.json()) as ProcessResult & { error?: string; detail?: string };
      if (!res.ok || !json.success) throw new Error(json.error || json.detail || 'Error desconocido');
      setProgress(90);
      addLog(`${json.data.transactionCount} transacciones extraídas`);
      addLog(`Período: ${json.data.statementPeriod}`);
      setResult(json); setProgress(100); addLog('Listo para descargar Excel'); setStep('done');
    } catch (err) { setError(String(err)); setStep('error'); }
  };

  const downloadExcel = () => {
    if (!result) return;
    const bytes = generateExcel(result.data, result.clientName, result.taxYear, result.entityType);
    const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quivo_${(result.clientName || 'cliente').replace(/\s+/g, '_').toLowerCase()}_${result.taxYear}_statement.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  const canProcess = !!file && step !== 'processing';

  return (
    <div className={`flex flex-col gap-4 ${compact ? '' : 'mx-auto max-w-2xl py-4'}`}>
      {!compact && (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Bank Statement Processor</h2>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">PDF → Claude → Excel con Schedule C (IRS)</p>
        </div>
      )}

      <div
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragging ? 'border-[var(--quivo-accent)] bg-[var(--bg-hover)]' : 'border-[var(--bg-border)] hover:border-[var(--text-muted)]'
        } ${file ? 'bg-[var(--bg-card)]' : ''}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
      >
        {!file ? (
          <>
            <div className="mb-2 text-3xl">📄</div>
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">Arrastra el bank statement</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">PDF o imagen</p>
            <button type="button" className="mt-3 rounded-lg bg-[var(--quivo-accent)] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Seleccionar archivo</button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-xl">📄</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{file.name}</p>
              <p className="font-mono text-[11px] text-[var(--text-muted)]">{fmtBytes(file.size)}</p>
            </div>
            <button type="button" className="px-2 text-[var(--text-muted)] hover:text-[#ef4444]" onClick={(e) => { e.stopPropagation(); setFile(null); setStep('idle'); setResult(null); }}><IconX className="h-4 w-4" /></button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Cliente</label>
          <input type="text" placeholder="ABC Corp LLC" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quivo-accent)]/30" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Año fiscal</label>
          <select value={taxYear} onChange={(e) => setTaxYear(e.target.value)} className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2 text-[13px]">{TAX_YEARS.map((y) => <option key={y}>{y}</option>)}</select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Entidad</label>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2 text-[13px]">{ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
      </div>

      <button type="button" onClick={process} disabled={!canProcess} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--quivo-accent)] py-3 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-90">
        {step === 'processing' ? (<><IconLoader2 className="h-4 w-4 animate-spin" /> Procesando...</>) : 'Procesar statement'}
      </button>

      {step === 'processing' && (
        <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-3">
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-border)]"><div className="h-full rounded-full bg-[var(--quivo-accent)] transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="flex flex-col gap-1">{logLines.map((l, i) => (<div key={i} className="flex gap-2 font-mono text-[11px]"><span className={l.ok ? 'text-emerald-500' : 'text-[#ef4444]'}>{l.ok ? '✓' : '✗'}</span><span className="text-[var(--text-secondary)]">{l.msg}</span></div>))}</div>
        </div>
      )}

      {error && <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-3 text-[12px] text-[#ef4444]">{error}</div>}

      {step === 'done' && result && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2">
            <IconFileSpreadsheet className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Excel listo</p>
              <p className="text-[11px] text-[var(--text-muted)]">{result.data.bank} · {result.data.statementPeriod}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-2"><p className="text-[10px] uppercase text-[var(--text-muted)]">Txns</p><p className="text-[15px] font-bold">{result.data.transactionCount}</p></div>
            <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-2"><p className="text-[10px] uppercase text-[var(--text-muted)]">Ingresos</p><p className="text-[13px] font-bold text-emerald-500">{fmtMoney(result.data.totalDeposits)}</p></div>
            <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-2"><p className="text-[10px] uppercase text-[var(--text-muted)]">Gastos</p><p className="text-[13px] font-bold text-orange-500">{fmtMoney(result.data.totalWithdrawals)}</p></div>
          </div>
          <button type="button" onClick={downloadExcel} className="w-full rounded-xl border-2 border-emerald-500 py-3 text-[13px] font-bold text-emerald-500 hover:bg-emerald-500 hover:text-black">Descargar Excel (.xlsx)</button>
          <button type="button" onClick={() => { setFile(null); setStep('idle'); setResult(null); }} className="text-center text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Procesar otro statement</button>
        </div>
      )}
    </div>
  );
}
