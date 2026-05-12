'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  IconMail, IconCalendar, IconCreditCard, IconTrendingUp,
  IconLoader2, IconArrowRight, IconSparkles,
  IconAlertTriangle, IconCheck,
} from '@tabler/icons-react';

interface StripeOverview {
  mrr: number;
  pending_amount: number;
  overdue_amount: number;
  total_customers: number;
  paid_count: number;
  overdue_count: number;
}

interface RecentActivity {
  id: string;
  type: 'stripe' | 'calendar' | 'note';
  title: string;
  time: string;
  badge?: string;
  badgeColor?: string;
}

const DONUT_COLORS = ['#3b82f6', '#06b6d4', '#22c55e'];

export default function OverviewContent() {
  const [stripe, setStripe]     = useState<StripeOverview | null>(null);
  const [mrrHistory, setMrrHistory] = useState<{ month: string; amount: number }[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [stripeRes, mrrRes] = await Promise.all([
          fetch('/api/stripe?action=overview'),
          fetch('/api/stripe?action=mrr'),
        ]);

        let stripeData: StripeOverview | null = null;
        if (stripeRes.ok) {
          stripeData = await stripeRes.json();
          setStripe(stripeData);
        }
        if (mrrRes.ok) {
          const data = await mrrRes.json();
          setMrrHistory(data.history ?? []);
        }

        // Build activity feed from stripe
        if (stripeData) {
          const acts: RecentActivity[] = [];
          if (stripeData.overdue_count > 0) {
            acts.push({ id: 'a1', type: 'stripe', title: `${stripeData.overdue_count} overdue invoice${stripeData.overdue_count > 1 ? 's' : ''} need attention`, time: 'Now', badge: 'Action Required', badgeColor: 'text-[#ef4444]' });
          }
          if (stripeData.pending_amount > 0) {
            acts.push({ id: 'a2', type: 'stripe', title: `$${stripeData.pending_amount.toLocaleString()} in pending invoices`, time: 'Stripe', badge: 'Pending', badgeColor: 'text-[#f59e0b]' });
          }
          acts.push({ id: 'a3', type: 'calendar', title: 'Check Google Calendar for today\'s meetings', time: 'Calendar', badge: 'Tip', badgeColor: 'text-[#3b82f6]' });
          setActivity(acts);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const donutData = stripe ? [
    { name: 'MRR',     value: stripe.mrr,             color: '#3b82f6' },
    { name: 'Pending', value: stripe.pending_amount,   color: '#f59e0b' },
    { name: 'Overdue', value: stripe.overdue_amount,   color: '#ef4444' },
  ] : [];

  return (
    <div className="space-y-5 p-6">

      {/* Top widget row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Unread emails */}
        <div className="card-hover rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3b82f6]/10">
              <IconMail className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <a href="#" className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#3b82f6]">
              Open <IconArrowRight className="h-3 w-3" />
            </a>
          </div>
          <p className="text-3xl font-bold text-[#e6edf3]">—</p>
          <p className="text-xs font-medium text-[#8b949e]">Unread emails</p>
          <p className="mt-1 text-[10px] text-[#8b949e]">Connect Gmail to see inbox</p>
        </div>

        {/* Today's meetings */}
        <div className="card-hover rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06b6d4]/10">
              <IconCalendar className="h-5 w-5 text-[#06b6d4]" />
            </div>
            <a href="#" className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#06b6d4]">
              Open <IconArrowRight className="h-3 w-3" />
            </a>
          </div>
          <p className="text-3xl font-bold text-[#e6edf3]">—</p>
          <p className="text-xs font-medium text-[#8b949e]">Today's meetings</p>
          <p className="mt-1 text-[10px] text-[#8b949e]">Connect Calendar to see events</p>
        </div>

        {/* Pending invoices */}
        <div className="card-hover rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f59e0b]/10">
              <IconCreditCard className="h-5 w-5 text-[#f59e0b]" />
            </div>
            <a href="#" className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#f59e0b]">
              Open <IconArrowRight className="h-3 w-3" />
            </a>
          </div>
          {loading ? (
            <IconLoader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
          ) : (
            <>
              <p className="text-3xl font-bold text-[#f59e0b]">
                ${(stripe?.pending_amount ?? 0).toLocaleString()}
              </p>
              <p className="text-xs font-medium text-[#8b949e]">Pending invoices</p>
              {stripe?.overdue_count ? (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-[#ef4444]">
                  <IconAlertTriangle className="h-3 w-3" /> {stripe.overdue_count} overdue
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-[#22c55e]">
                  <IconCheck className="h-3 w-3" /> All caught up
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Stripe breakdown donut */}
        <div className="card-hover rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
          <p className="mb-4 text-sm font-semibold text-[#e6edf3]">Revenue Breakdown</p>
          {loading ? (
            <div className="flex h-28 items-center justify-center"><IconLoader2 className="h-5 w-5 animate-spin text-[#8b949e]" /></div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={3} dataKey="value">
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {donutData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                    <div>
                      <p className="text-[10px] text-[#8b949e]">{item.name}</p>
                      <p className="text-xs font-bold text-[#e6edf3]">${item.value.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MRR History bar chart */}
        <div className="col-span-2 card-hover rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#e6edf3]">MRR History</p>
            {stripe && (
              <div className="flex items-center gap-1.5">
                <IconTrendingUp className="h-3.5 w-3.5 text-[#22c55e]" />
                <span className="text-xs font-bold text-[#22c55e]">${stripe.mrr.toLocaleString()} this month</span>
              </div>
            )}
          </div>
          {loading ? (
            <div className="flex h-28 items-center justify-center"><IconLoader2 className="h-5 w-5 animate-spin text-[#8b949e]" /></div>
          ) : mrrHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={mrrHistory} barSize={20}>
                <defs>
                  <linearGradient id="mrrGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8b949e' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#141b26', border: '1px solid #1e2836', borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
                  labelStyle={{ color: '#8b949e' }} />
                <Bar dataKey="amount" fill="url(#mrrGrad2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-28 items-center justify-center text-sm text-[#8b949e]">
              No payment history yet
            </div>
          )}
        </div>
      </div>

      {/* Quick actions + Activity */}
      <div className="grid grid-cols-3 gap-5">
        {/* Quick actions */}
        <div className="card-hover rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
          <p className="mb-4 text-sm font-semibold text-[#e6edf3]">Quick Actions</p>
          <div className="space-y-2">
            {[
              { icon: '📧', label: 'Check Email',    desc: 'Open Gmail monitor' },
              { icon: '💬', label: 'New AI Chat',    desc: 'Ask Finedge AI' },
              { icon: '📅', label: 'Add Event',      desc: 'Create calendar event' },
              { icon: '💳', label: 'New Invoice',    desc: 'Create Stripe invoice' },
            ].map(a => (
              <button key={a.label} className="group flex w-full items-center gap-3 rounded-xl border border-[#1e2836] px-3 py-2.5 transition-all hover:border-[#3b82f6]/30 hover:bg-[#1e2836]">
                <span className="text-base">{a.icon}</span>
                <div className="text-left">
                  <p className="text-xs font-semibold text-[#e6edf3] group-hover:text-[#3b82f6]">{a.label}</p>
                  <p className="text-[10px] text-[#8b949e]">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="col-span-2 card-hover rounded-2xl border border-[#1e2836] bg-[#141b26] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3b82f6]/10">
              <IconSparkles className="h-4 w-4 text-[#3b82f6]" />
            </div>
            <p className="text-sm font-semibold text-[#e6edf3]">Recent Activity & Alerts</p>
          </div>
          {loading ? (
            <div className="flex h-32 items-center justify-center"><IconLoader2 className="h-5 w-5 animate-spin text-[#8b949e]" /></div>
          ) : activity.length > 0 ? (
            <div className="space-y-2">
              {activity.map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-[#1e2836] px-4 py-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    a.type === 'stripe' ? 'bg-[#3b82f6]/10' : a.type === 'calendar' ? 'bg-[#06b6d4]/10' : 'bg-[#f59e0b]/10'
                  }`}>
                    {a.type === 'stripe' && <IconCreditCard className="h-4 w-4 text-[#3b82f6]" />}
                    {a.type === 'calendar' && <IconCalendar className="h-4 w-4 text-[#06b6d4]" />}
                    {a.type === 'note' && <IconSparkles className="h-4 w-4 text-[#f59e0b]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#e6edf3]">{a.title}</p>
                    <p className="text-[10px] text-[#8b949e]">{a.time}</p>
                  </div>
                  {a.badge && <span className={`text-[10px] font-bold ${a.badgeColor}`}>{a.badge}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
              <IconCheck className="h-8 w-8 text-[#22c55e]" />
              <p className="text-sm font-semibold text-[#e6edf3]">All caught up!</p>
              <p className="text-xs text-[#8b949e]">No pending alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
