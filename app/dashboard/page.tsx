'use client';

import { useState, useEffect, Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatInterface from '@/components/chat-interface';
import OnboardingModal from '@/components/onboarding-modal';
import GmailMonitor from '@/components/gmail-monitor';
import StripePanel from '@/components/stripe-panel';
import CalendarView from '@/components/calendar-view';
import PluginsPanel from '@/components/plugins-panel';
import ModelsPanel from '@/components/models-panel';
import PromptsPanel from '@/components/prompts-panel';
import DriveBrowser from '@/components/drive-browser';
import SettingsPanel from '@/components/settings-panel';
import AgentsPanel from '@/components/agents-panel';
import KnowledgeBasePanel from '@/components/knowledge-base-panel';
import AnalyticsPanel from '@/components/analytics-panel';
import AppearanceSettings from '@/components/appearance-settings';
import DocsPanel from '@/components/docs-panel';
import ApiKeysPanel from '@/components/api-keys-panel';
import { ViewChrome } from '@/components/view-chrome';
import HomeHub from '@/components/home-hub';
import PlannerPanel from '@/components/planner-panel';
import { SidebarUserMenu } from '@/components/sidebar-user-menu';
import { usePlannerReminders } from '@/hooks/use-planner-reminders';
import { loadPlannerItems } from '@/lib/planner-storage';
import { BankStatementSidePanel } from '@/components/bank-statement-side-panel';
import Link from 'next/link';
import {
  IconLayoutDashboard, IconRobot, IconNotes, IconMail, IconCreditCard,
  IconCalendar, IconPlug, IconChartBar, IconSettings, IconSparkles,
  IconSearch, IconCloud, IconCheck,
  IconBrain, IconBook, IconMessageCircle, IconDatabase, IconPalette,
  IconFileText, IconKey, IconLayoutList, IconHelp, IconFileInvoice,
  IconBolt,
} from '@tabler/icons-react';

type View = 'overview' | 'chat' | 'agents' | 'kb' | 'planner' | 'notes' | 'tasks' | 'gmail' | 'stripe' | 'calendar' | 'plugins' | 'models' | 'prompts' | 'analytics' | 'drive' | 'settings' | 'appearance' | 'docs' | 'apikeys';

const HOME_VIEW: View = 'overview';

const navStartHere = [
  { id: 'overview' as View, label: 'Home',          icon: IconLayoutDashboard },
  { id: 'chat'     as View, label: 'Chat',         icon: IconMessageCircle },
  { id: 'apikeys'  as View, label: 'API keys',     icon: IconKey },
];

const agentNavHref = '/agent';

const navWorkspace = [
  { id: 'agents'  as View, label: 'AI agents',       icon: IconRobot },
  { id: 'kb'      as View, label: 'Knowledge base',  icon: IconDatabase },
  { id: 'planner' as View, label: 'Tasks & Notes',   icon: IconLayoutList },
];

const navIntegrations = [
  { id: 'gmail'    as View, label: 'Gmail',         icon: IconMail },
  { id: 'stripe'   as View, label: 'Billing',       icon: IconCreditCard },
  { id: 'calendar' as View, label: 'Calendar',      icon: IconCalendar },
  { id: 'drive'    as View, label: 'Google Drive',  icon: IconCloud },
];

const navTools = [
  { id: 'settings' as View, label: 'Settings', icon: IconSettings },
  { id: 'docs'     as View, label: 'Help',     icon: IconHelp },
];

const viewTitles: Record<View, { title: string; subtitle: string }> = {
  overview:    { title: 'Home',             subtitle: 'Finance, markets, and news at a glance' },
  chat:        { title: 'AI Chat',          subtitle: 'Powered by Claude & Gemini — your API key, your cost' },
  agents:      { title: 'AI Agents',        subtitle: 'Finance specialists: tax, audit, bookkeeping, CFO, and more' },
  kb:          { title: 'Knowledge Base',   subtitle: 'Upload documents for AI agents to reference' },
  appearance:  { title: 'Appearance',       subtitle: 'Customize themes, colors, fonts, and animations' },
  docs:        { title: 'Documentation',    subtitle: 'Platform guide, API reference, and integration docs' },
  apikeys:     { title: 'API Keys',         subtitle: 'Add your provider keys — you pay them directly, not Quivo' },
  planner:     { title: 'Tasks & Notes',    subtitle: 'To-dos, notes, and timed reminders' },
  tasks:       { title: 'Tasks & Notes',    subtitle: 'To-dos, notes, and timed reminders' },
  notes:       { title: 'Tasks & Notes',    subtitle: 'To-dos, notes, and timed reminders' },
  gmail:       { title: 'Gmail Monitor',   subtitle: 'Intelligent email analysis' },
  stripe:      { title: 'Billing',         subtitle: 'Stripe billing & payments' },
  calendar:    { title: 'Calendar',        subtitle: 'Schedule & meetings' },
  plugins:     { title: 'Plugins',         subtitle: 'Extend Quivo with powerful tools' },
  models:      { title: 'Models',          subtitle: 'Manage AI models and providers' },
  prompts:     { title: 'Prompt Library',  subtitle: 'Reusable agents, skills, and templates' },
  analytics:   { title: 'Analytics',       subtitle: 'Deep financial insights' },
  drive:       { title: 'Google Drive',    subtitle: 'Browse and manage your documents' },
  settings:    { title: 'Settings',        subtitle: 'API keys, integrations and preferences' },
};

function DashboardInner() {
  usePlannerReminders();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<View>(HOME_VIEW);
  const [navHistory, setNavHistory] = useState<View[]>([HOME_VIEW]);
  const [googleToast, setGoogleToast] = useState<'connected' | 'error' | null>(null);
  const [dropboxToast, setDropboxToast] = useState<'connected' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [plannerBadge, setPlannerBadge] = useState(0);
  const [statementPanelOpen, setStatementPanelOpen] = useState(false);

  // Show onboarding on first visit if no API keys are saved
  useEffect(() => {
    const seen = localStorage.getItem('quivo_onboarding_done');
    if (seen) return;
    fetch('/api/user-keys', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const hasAny =
          d.has?.anthropic || d.has?.openai || d.has?.google_ai || d.has?.deepseek;
        if (!hasAny) setShowOnboarding(true);
      })
      .catch(() => {});
  }, []);

  function closeOnboarding() {
    setShowOnboarding(false);
    localStorage.setItem('quivo_onboarding_done', '1');
  }

  useEffect(() => {
    function updateBadge() {
      try {
        const pending = loadPlannerItems().filter(i => !i.completed).length;
        setPlannerBadge(pending);
      } catch {
        setPlannerBadge(0);
      }
    }
    updateBadge();
    window.addEventListener('quivo:planner-updated', updateBadge);
    window.addEventListener('storage', updateBadge);
    const interval = setInterval(updateBadge, 5000);
    return () => {
      window.removeEventListener('quivo:planner-updated', updateBadge);
      window.removeEventListener('storage', updateBadge);
      clearInterval(interval);
    };
  }, []);

  // Handle URL view param
  useEffect(() => {
    const v = searchParams.get('view') as View | null;
    if (!v) return;
    if (v === 'tasks' || v === 'notes') {
      goToView('planner');
      return;
    }
    if (viewTitles[v]) goToView(v);
  }, [searchParams]);

  // Handle OAuth redirect params
  useEffect(() => {
    if (searchParams.get('google_connected') === '1') {
      setGoogleToast('connected');
      setTimeout(() => setGoogleToast(null), 4000);
    } else if (searchParams.get('google_error')) {
      setGoogleToast('error');
      setTimeout(() => setGoogleToast(null), 4000);
    }
    if (searchParams.get('dropbox_connected') === '1') {
      setDropboxToast('connected');
      setTimeout(() => setDropboxToast(null), 4000);
    }
  }, [searchParams]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const { title, subtitle } = viewTitles[activeView];
  const isHome = activeView === HOME_VIEW;

  function goToView(view: View) {
    setActiveView(view);
    setNavHistory(prev => {
      if (prev[prev.length - 1] === view) return prev;
      return [...prev, view];
    });
  }

  function goBack() {
    setNavHistory(prev => {
      if (prev.length <= 1) {
        setActiveView(HOME_VIEW);
        return [HOME_VIEW];
      }
      const next = prev.slice(0, -1);
      setActiveView(next[next.length - 1] ?? HOME_VIEW);
      return next;
    });
  }

  function NavSection({ label, children }: { label: string; children: ReactNode }) {
    return (
      <div>
        <p className="mb-1.5 px-3 text-[12px] font-medium text-[var(--text-muted)]">{label}</p>
        <div className="space-y-0.5">{children}</div>
      </div>
    );
  }

  function NavItem({ item }: { item: { id: View; label: string; icon: React.ElementType } }) {
    const Icon = item.icon;
    const active = activeView === item.id;
    const badge = item.id === 'planner' ? plannerBadge : 0;
    return (
      <button
        type="button"
        onClick={() => goToView(item.id)}
        style={
          active
            ? {
                boxShadow: 'inset 0 0 0 1px var(--bg-border)',
              }
            : undefined
        }
        className={`group flex w-full items-center gap-3 rounded-full px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-150 ${
          active
            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={active ? 2 : 1.75} />
        <span className="flex-1 text-left">{item.label}</span>
        {badge > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
              active ? 'bg-[var(--bg-border)] text-[var(--text-primary)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-canvas)]">
      {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}
      <BankStatementSidePanel open={statementPanelOpen} onClose={() => setStatementPanelOpen(false)} />

      {/* OAuth toasts */}
      {dropboxToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-emerald-100 shadow-lg">
          <IconCheck className="h-4 w-4" strokeWidth={2.5} />
          <span className="text-sm font-medium">Dropbox connected</span>
        </div>
      )}
      {googleToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
            googleToast === 'connected'
              ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
              : 'border-rose-300/25 bg-rose-500/10 text-rose-100'
          }`}
        >
          {googleToast === 'connected' ? <IconCheck className="h-4 w-4" strokeWidth={2.5} /> : <IconSparkles className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {googleToast === 'connected' ? 'Google Workspace connected' : 'Google connection failed. Try again.'}
          </span>
        </div>
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="quivo-sidebar flex w-[260px] shrink-0 flex-col border-r border-[var(--bg-border)]">

        {/* Logo */}
        <div className="flex h-[52px] items-center gap-3 border-b border-[var(--bg-border)] px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] shadow-[inset_0_1px_0_rgba(28,25,23,0.06)]">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">Q</span>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Quivo</span>
        </div>

        <SidebarUserMenu today={today} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-5">
          <NavSection label="Start here">
            {navStartHere.map(item => <NavItem key={item.id} item={item} />)}
            <Link
              href={agentNavHref}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium tracking-[-0.01em] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <IconBolt className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
              <span className="flex-1 text-left">Quivo Agent</span>
              <span className="rounded-md bg-[var(--bg-card)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                MCP
              </span>
            </Link>
          </NavSection>
          <NavSection label="Your workspace">
            {navWorkspace.map(item => <NavItem key={item.id} item={item} />)}
          </NavSection>
          <NavSection label="Connected apps">
            {navIntegrations.map(item => <NavItem key={item.id} item={item} />)}
          </NavSection>
          <NavSection label="More tools">
            {navTools.map(item => <NavItem key={item.id} item={item} />)}
          </NavSection>
        </nav>

        <div className="flex shrink-0 items-center justify-between border-t border-[var(--bg-border)] px-2 py-2">
          <button
            type="button"
            onClick={() => goToView('docs')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            aria-label="Help and guides"
          >
            <IconHelp className="h-5 w-5" stroke={1.5} />
          </button>
        </div>

        {/* Pro upgrade CTA */}
        <div className="p-3 pt-0">
          <button
            type="button"
            onClick={() => goToView('settings')}
            className="flex w-full items-center gap-3 rounded-full border border-[var(--bg-border)] bg-[var(--bg-card)] px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(28,25,23,0.05)] transition hover:bg-[var(--bg-hover)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
              <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">Q</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Quivo Pro</span>
              <span className="block text-[11px] text-[var(--text-muted)]">More usage & priority support</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!isHome && (
          <ViewChrome title={title} subtitle={subtitle} showBack onBack={goBack} showSearch={false} />
        )}

        {/* Content */}
        <main className="quivo-canvas flex-1 overflow-hidden">
          {activeView === 'overview'  && (
            <div className="h-full overflow-hidden">
              <HomeHub onNavigate={(v) => goToView(v as View)} />
            </div>
          )}
          {activeView === 'chat'      && (
            <ChatInterface
              onGoToSettings={() => goToView('settings')}
              onGoToAgents={() => goToView('agents')}
              onGoToKB={() => goToView('kb')}
            />
          )}
          {activeView === 'agents'    && (
            <div className="h-full overflow-hidden">
              <AgentsPanel
                onChatWithAgent={(agentId) => {
                  localStorage.setItem('quivo_pending_agent', agentId);
                  goToView('chat');
                }}
              />
            </div>
          )}
          {activeView === 'kb'        && (
            <div className="h-full overflow-y-auto">
              <KnowledgeBasePanel onChatWithKb={() => goToView('chat')} />
            </div>
          )}
          {(activeView === 'planner' || activeView === 'tasks' || activeView === 'notes') && (
            <div className="h-full overflow-hidden"><PlannerPanel /></div>
          )}
          {activeView === 'gmail'     && <div className="h-full overflow-y-auto"><GmailMonitor /></div>}
          {activeView === 'stripe'    && <div className="h-full overflow-y-auto"><StripePanel /></div>}
          {activeView === 'calendar'  && <div className="h-full overflow-y-auto"><CalendarView /></div>}
          {activeView === 'plugins'   && <div className="h-full overflow-y-auto"><PluginsPanel /></div>}
          {activeView === 'models'    && <div className="h-full overflow-y-auto"><ModelsPanel /></div>}
          {activeView === 'prompts'   && (
            <div className="h-full overflow-y-auto">
              <PromptsPanel onUsePrompt={text => { goToView('chat'); setTimeout(() => { const ev = new CustomEvent('quivo:use-prompt', { detail: text }); window.dispatchEvent(ev); }, 100); }} />
            </div>
          )}
          {activeView === 'drive'     && <div className="h-full overflow-y-auto"><DriveBrowser /></div>}
          {activeView === 'settings'  && <div className="h-full overflow-y-auto"><SettingsPanel /></div>}
          {activeView === 'analytics'  && <div className="h-full overflow-hidden"><AnalyticsPanel /></div>}
          {activeView === 'appearance' && <div className="h-full overflow-hidden"><AppearanceSettings /></div>}
          {activeView === 'docs'       && <div className="h-full overflow-hidden"><DocsPanel /></div>}
          {activeView === 'apikeys'    && <div className="h-full overflow-hidden"><ApiKeysPanel /></div>}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--bg-base)]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--bg-border)] border-t-[var(--text-muted)]" /></div>}>
      <DashboardInner />
    </Suspense>
  );
}


