'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  IconX,
  IconAlertTriangle,
  IconMail,
  IconCreditCard,
  IconNotes,
  IconCalendar,
  IconArrowRight,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BriefingData {
  pendingNotes: number;
  unreadEmails: number;
  overdueInvoices: number;
  upcomingMeetings: number;
  alerts: string[];
}

interface Props {
  onClose: () => void;
}

const STAT_TILES: {
  key: keyof Pick<BriefingData, 'pendingNotes' | 'unreadEmails' | 'overdueInvoices' | 'upcomingMeetings'>;
  icon: typeof IconNotes;
  label: string;
}[] = [
  { key: 'pendingNotes', icon: IconNotes, label: 'Notas pendientes' },
  { key: 'unreadEmails', icon: IconMail, label: 'Correos sin leer' },
  { key: 'overdueInvoices', icon: IconCreditCard, label: 'Facturas vencidas' },
  { key: 'upcomingMeetings', icon: IconCalendar, label: 'Reuniones hoy' },
];

export default function DailyBriefing({ onClose }: Props) {
  const { user } = useUser();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/briefing?userId=${user?.id}`);
        const data = await response.json();
        if (!cancelled) setBriefing(data);
      } catch {
        // silent
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Buenos días' : currentHour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const first = user?.firstName?.trim();

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-xl rounded-[22px] border border-[#353538] bg-[#1a1a1a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#222] text-[#9b9b9b] transition-colors hover:border-[#4a4a4a] hover:bg-[#2a2a2a] hover:text-[#ececec] md:right-5 md:top-5"
          >
            <IconX className="h-4 w-4" stroke={1.5} />
          </button>

          <header className="mb-8 pr-10 md:mb-10">
            <div className="min-w-0">
              <h2 className="font-serif text-[1.35rem] font-normal leading-snug tracking-tight text-[#ececec] md:text-[1.55rem]">
                {greeting}
                {first ? <>, {first}</> : null}
              </h2>
              <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-[#8a8a8a]">
                Tu resumen del día: números y avisos en un vistazo.
              </p>
            </div>
          </header>

          {isLoading ? (
            <div className="flex h-44 items-center justify-center">
              <div
                className="h-7 w-7 animate-spin rounded-full border-2 border-[#333] border-t-[#b0b0b0]"
                aria-hidden
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
                {STAT_TILES.map(({ key, icon: Icon, label }) => {
                  const value = briefing?.[key] ?? 0;
                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-[#323232] bg-[#222] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-4 sm:py-4"
                    >
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-[#383838] bg-[#1a1a1a]">
                        <Icon className="h-4 w-4 text-[#8c8c8c]" stroke={1.35} />
                      </div>
                      <p className="font-sans text-2xl font-medium tabular-nums tracking-tight text-[#ececec]">
                        {value}
                      </p>
                      <p className="mt-1 font-sans text-[11px] font-normal leading-snug text-[#6b6b6b]">
                        {label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {briefing?.alerts && briefing.alerts.length > 0 && (
                <div className="rounded-2xl border border-[#383838] bg-[#1f1f1f] px-4 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <IconAlertTriangle className="h-4 w-4 text-[#9a9a9a]" stroke={1.35} />
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9b9b9b]">
                      Avisos
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {briefing.alerts.map((alert, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#b4b4b4]">
                        <span className="mt-2 h-px w-3 shrink-0 bg-[#555]" aria-hidden />
                        <span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-[#454545] bg-[#ececec] py-3.5 font-sans text-sm font-medium text-[#141414] transition-colors hover:bg-[#f5f5f5] active:bg-[#e2e2e2]"
              >
                Empezar
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" stroke={1.75} />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
