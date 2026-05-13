'use client';

import { useState, useEffect, useRef } from 'react';
import { IconCopy, IconCheck, IconChevronRight, IconChevronDown, IconMenu2, IconX } from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocSection { id: string; label: string; }
interface DocPage {
  id: string;
  title: string;
  sections: DocSection[];
  content: React.ReactNode;
}

// ─── Code block component ─────────────────────────────────────────────────────
function Code({ children, lang = 'bash' }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children.trim()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative my-4 rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#30363d] px-4 py-2">
        <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-widest">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] text-[#8b949e] hover:bg-[#1e2836] hover:text-[#e6edf3] transition-all">
          {copied ? <IconCheck className="h-3.5 w-3.5 text-[#22c55e]" /> : <IconCopy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed text-[#e6edf3]">
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}

// ─── Note/Warning callout ─────────────────────────────────────────────────────
function Callout({ type = 'info', title, children }: { type?: 'info' | 'warning' | 'tip'; title: string; children: React.ReactNode }) {
  const styles = {
    info:    { border: '#3b82f6', bg: '#3b82f6/10', icon: '📘', text: '#93c5fd' },
    warning: { border: '#f59e0b', bg: '#f59e0b/10', icon: '⚠️', text: '#fcd34d' },
    tip:     { border: '#22c55e', bg: '#22c55e/10', icon: '💡', text: '#86efac' },
  }[type];
  return (
    <div className={`my-4 rounded-xl border-l-4 p-4`}
      style={{ borderLeftColor: styles.border, background: `color-mix(in srgb, ${styles.border} 8%, transparent)` }}>
      <p className="mb-1 flex items-center gap-2 text-xs font-bold" style={{ color: styles.text }}>
        <span>{styles.icon}</span> {title}
      </p>
      <div className="text-sm text-[#8b949e]">{children}</div>
    </div>
  );
}

// ─── Table component ──────────────────────────────────────────────────────────
function DocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-[#30363d]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#30363d] bg-[#161b22]">
            {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#8b949e]">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-[#30363d] last:border-0 ${i % 2 === 0 ? 'bg-[#0d1117]' : 'bg-[#161b22]/50'}`}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-xs text-[#e6edf3]">
                  {cell.startsWith('`') ? <code className="rounded bg-[#1e2836] px-1.5 py-0.5 font-mono text-[#79c0ff]">{cell.replace(/`/g, '')}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Step component ───────────────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative my-5 pl-10">
      <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 text-xs font-bold text-white shadow">{n}</div>
      <h4 className="mb-1.5 text-sm font-bold text-[#e6edf3]">{title}</h4>
      <div className="text-sm text-[#8b949e] space-y-2">{children}</div>
    </div>
  );
}

// ─── Inline code ──────────────────────────────────────────────────────────────
function IC({ children }: { children: string }) {
  return <code className="rounded bg-[#1e2836] px-1.5 py-0.5 text-xs font-mono text-[#79c0ff]">{children}</code>;
}

// ─── Link ─────────────────────────────────────────────────────────────────────
function DL({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] underline-offset-2 hover:underline">{children}</a>;
}

// ─── Feature badge ────────────────────────────────────────────────────────────
function Badge({ children, color = 'blue' }: { children: string; color?: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]',
    green:  'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]',
    purple: 'bg-[#a855f7]/10 border-[#a855f7]/30 text-[#a855f7]',
    amber:  'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]',
    pink:   'bg-[#ec4899]/10 border-[#ec4899]/30 text-[#ec4899]',
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${colors[color] ?? colors.blue}`}>{children}</span>;
}

// ─── Doc pages ────────────────────────────────────────────────────────────────
const PAGES: DocPage[] = [
  // ── 1. Platform Guide ──────────────────────────────────────────────────────
  {
    id: 'guide',
    title: 'Finedge Platform Guide',
    sections: [
      { id: 'what-is', label: 'What is Finedge?' },
      { id: 'getting-started', label: 'Getting Started' },
      { id: 'resources', label: 'Resources' },
    ],
    content: (
      <div>
        <p className="text-sm text-[#8b949e] mb-6">
          Welcome to the <strong className="text-[#e6edf3]">Finedge Platform</strong> documentation. Here you&apos;ll find everything you need to configure, deploy, and get the most out of your AI-powered accounting and consulting workspace.
        </p>

        <h2 id="what-is" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">What is Finedge?</h2>
        <p className="text-sm text-[#8b949e] mb-4">
          Finedge is an AI orchestration platform designed for <strong className="text-[#e6edf3]">accounting firms, CFOs, and financial consultants</strong>. It brings together multiple AI models, a knowledge base, real-time integrations, and specialized finance agents — all under one roof. You supply your own API keys; <strong className="text-[#e6edf3]">Finedge never charges you for AI usage</strong>.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
          {[
            { icon: '🤖', title: 'AI Agents', desc: '16+ prebuilt specialists: tax, audit, bookkeeping, CFO, IRS compliance, and more.' },
            { icon: '📚', title: 'Knowledge Base', desc: 'Upload PDFs, spreadsheets, and docs for RAG-powered contextual answers.' },
            { icon: '🔑', title: 'Your Keys, Your Cost', desc: 'Connect Anthropic, OpenAI, or Google directly. You pay providers — not Finedge.' },
          ].map(card => (
            <div key={card.title} className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
              <div className="mb-2 text-2xl">{card.icon}</div>
              <p className="mb-1 text-sm font-semibold text-[#e6edf3]">{card.title}</p>
              <p className="text-xs text-[#8b949e]">{card.desc}</p>
            </div>
          ))}
        </div>

        <h2 id="getting-started" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Getting Started</h2>
        <p className="mb-3 text-sm text-[#8b949e]">Choose your path:</p>
        <ul className="space-y-2 text-sm text-[#8b949e]">
          {[
            { label: 'AI Chat',         desc: 'Start chatting with Claude, Gemini, or GPT-4 using your API key.', badge: 'blue' as const },
            { label: 'AI Agents',       desc: 'Activate prebuilt finance agents or build your own from scratch.', badge: 'purple' as const },
            { label: 'Knowledge Base',  desc: 'Upload your firm\'s documents and enable RAG for accurate answers.', badge: 'green' as const },
            { label: 'Integrations',    desc: 'Connect Gmail, Stripe, Google Calendar, and Google Drive.', badge: 'amber' as const },
            { label: 'API Keys',        desc: 'Add your provider API keys to unlock all AI features.', badge: 'pink' as const },
            { label: 'Appearance',      desc: 'Customize theme, accent colors, fonts, and animations.', badge: 'blue' as const },
          ].map(item => (
            <li key={item.label} className="flex items-start gap-2">
              <IconChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3b82f6]" />
              <span><strong className="text-[#e6edf3]">{item.label}</strong> — {item.desc}</span>
            </li>
          ))}
        </ul>

        <h2 id="resources" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Resources</h2>
        <ul className="space-y-2 text-sm text-[#8b949e]">
          {[
            { label: 'Supported Models',   desc: 'Full list of Claude, Gemini, GPT, Groq, Mistral, and more.' },
            { label: 'IRS Compliance FAQ',  desc: 'Common questions about the IRS Compliance agent.' },
            { label: 'Security & Privacy',  desc: 'How your data and API keys are stored and handled.' },
          ].map(r => (
            <li key={r.label} className="flex items-start gap-2">
              <span className="mt-0.5 text-[#3b82f6]">•</span>
              <span><strong className="text-[#e6edf3]">{r.label}</strong> — {r.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },

  // ── 2. API Keys ────────────────────────────────────────────────────────────
  {
    id: 'api-keys',
    title: 'API Keys',
    sections: [
      { id: 'overview',  label: 'Overview' },
      { id: 'anthropic', label: 'Anthropic (Claude)' },
      { id: 'google',    label: 'Google (Gemini)' },
      { id: 'openai',    label: 'OpenAI (GPT)' },
      { id: 'tavily',    label: 'Tavily (Web Search)' },
      { id: 'security',  label: 'Security' },
    ],
    content: (
      <div>
        <p className="text-sm text-[#8b949e] mb-6">
          Finedge is a <strong className="text-[#e6edf3]">bring-your-own-key</strong> platform. You add your API keys once in Settings → API Keys. They are stored securely in Supabase with row-level security tied to your account. Finedge never proxies your keys through its own servers for billing — every AI request goes <strong className="text-[#e6edf3]">directly from your browser to the provider</strong>.
        </p>

        <Callout type="tip" title="Privacy First">
          Your API keys are stored encrypted in Supabase, scoped to your user account via Row Level Security (RLS). No Finedge employee can read them.
        </Callout>

        <h2 id="overview" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Overview</h2>
        <DocTable
          headers={['Provider', 'Used For', 'Free Tier', 'Get Key']}
          rows={[
            ['Anthropic', 'Claude Sonnet / Opus / Haiku', 'No', 'console.anthropic.com'],
            ['Google AI', 'Gemini 1.5 / 2.0 / 2.5', 'Yes (limited)', 'aistudio.google.com'],
            ['OpenAI', 'GPT-4o / o3 / o4-mini', 'No', 'platform.openai.com'],
            ['Tavily', 'Real-time web search in chat', 'Yes (1,000 req/mo)', 'tavily.com'],
          ]}
        />

        <h2 id="anthropic" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Anthropic (Claude)</h2>
        <p className="text-sm text-[#8b949e] mb-3">Claude is the primary recommended model for accounting and legal reasoning tasks.</p>
        <Step n={1} title="Create an Anthropic account">
          <p>Visit <DL href="https://console.anthropic.com">console.anthropic.com</DL> and sign up or log in.</p>
        </Step>
        <Step n={2} title="Generate an API key">
          <p>Go to <strong>API Keys</strong> in the left sidebar and click <strong>Create Key</strong>. Copy the key — it is only shown once.</p>
        </Step>
        <Step n={3} title="Paste it in Finedge">
          <p>Open <strong>Settings → API Keys</strong> in Finedge and paste the key into the <IC>Anthropic API Key</IC> field. Click Save.</p>
        </Step>
        <Code lang="text">&lt;your-anthropic-api-key&gt;</Code>

        <h2 id="google" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Google AI (Gemini)</h2>
        <p className="text-sm text-[#8b949e] mb-3">Gemini 2.5 Pro provides a 1.5M token context window — ideal for analyzing long financial reports or large spreadsheets.</p>
        <Step n={1} title="Open Google AI Studio">
          <p>Go to <DL href="https://aistudio.google.com">aistudio.google.com</DL> and sign in with your Google account.</p>
        </Step>
        <Step n={2} title="Get API key">
          <p>Click <strong>Get API key → Create API key in new project</strong>. Copy the key.</p>
        </Step>
        <Step n={3} title="Add to Finedge">
          <p>Paste into <strong>Settings → API Keys → Google AI Key</strong>.</p>
        </Step>
        <Code lang="text">AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</Code>

        <h2 id="openai" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">OpenAI (GPT)</h2>
        <Step n={1} title="Create an OpenAI account">
          <p>Visit <DL href="https://platform.openai.com">platform.openai.com</DL>.</p>
        </Step>
        <Step n={2} title="Generate key">
          <p>Go to <strong>API Keys</strong> and click <strong>Create new secret key</strong>.</p>
        </Step>
        <Step n={3} title="Add to Finedge">
          <p>Paste into <strong>Settings → API Keys → OpenAI API Key</strong>.</p>
        </Step>

        <h2 id="tavily" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Tavily (Web Search)</h2>
        <p className="text-sm text-[#8b949e] mb-3">Used for real-time web search inside the chat. When enabled, the AI can look up current IRS rules, market data, and news.</p>
        <Step n={1} title="Sign up at Tavily">
          <p>Visit <DL href="https://tavily.com">tavily.com</DL>. The free tier includes 1,000 searches/month.</p>
        </Step>
        <Step n={2} title="Copy your API key">
          <p>In your dashboard, copy the key that starts with <IC>tvly-</IC>.</p>
        </Step>
        <Step n={3} title="Add to Finedge">
          <p>Settings → API Keys → Tavily API Key.</p>
        </Step>

        <h2 id="security" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Security</h2>
        <Callout type="warning" title="Never share your API keys">
          Your API keys grant full access to your provider accounts. Finedge stores them server-side with RLS. If you suspect a key has leaked, rotate it immediately in the provider console and update it in Finedge Settings.
        </Callout>
        <ul className="mt-3 space-y-1.5 text-sm text-[#8b949e]">
          <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-0.5">✓</span> Keys are stored in Supabase with row-level security.</li>
          <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-0.5">✓</span> Keys are never logged in Finedge server code.</li>
          <li className="flex items-start gap-2"><span className="text-[#22c55e] mt-0.5">✓</span> All provider calls are made over HTTPS.</li>
          <li className="flex items-start gap-2"><span className="text-[#ef4444] mt-0.5">✗</span> Finedge does not charge for API usage — your provider invoices you directly.</li>
        </ul>
      </div>
    ),
  },

  // ── 3. Creating Agents ─────────────────────────────────────────────────────
  {
    id: 'agents',
    title: 'Creating Agents',
    sections: [
      { id: 'open-marketplace', label: 'Step 1: Open the Marketplace' },
      { id: 'choose-agent',     label: 'Step 2: Use or Clone a Prebuilt Agent' },
      { id: 'create-form',      label: 'Step 3: Create a Custom Agent' },
      { id: 'instructions',     label: 'Step 4: Write Instructions' },
      { id: 'capabilities',     label: 'Step 5: Configure Capabilities' },
      { id: 'deploy',           label: 'Step 6: Deploy and Chat' },
    ],
    content: (
      <div>
        <p className="text-sm text-[#8b949e] mb-6">
          Agents in Finedge are AI personas with a custom system prompt, a selected model, and optional capabilities like web search or file context. You can use the 16+ prebuilt finance agents or create your own from scratch.
        </p>

        <h2 id="open-marketplace" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Step 1: Open the Agent Marketplace</h2>
        <p className="text-sm text-[#8b949e]">Click <strong className="text-[#e6edf3]">AI Agents</strong> in the left sidebar. You will see the marketplace with category tabs: General, Finance, Tax, Audit, HR, IT, Sales, and All.</p>

        <h2 id="choose-agent" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Step 2: Use or Clone a Prebuilt Agent</h2>
        <p className="text-sm text-[#8b949e] mb-3">Click any agent card to start chatting with it instantly. The agent&apos;s instructions are automatically sent as the system prompt.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { name: 'CFO Advisor',         cat: 'Finance' },
            { name: 'IRS Compliance Bot',  cat: 'Tax' },
            { name: 'Audit Assistant',     cat: 'Audit' },
            { name: 'Bookkeeper AI',       cat: 'Finance' },
            { name: 'Financial Analyst',   cat: 'Finance' },
            { name: 'Tax Strategy AI',     cat: 'Tax' },
          ].map(a => (
            <div key={a.name} className="flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2">
              <span className="text-sm">🤖</span>
              <div>
                <p className="text-xs font-semibold text-[#e6edf3]">{a.name}</p>
                <p className="text-[10px] text-[#8b949e]">{a.cat}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 id="create-form" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Step 3: Create a Custom Agent</h2>
        <p className="text-sm text-[#8b949e] mb-2">Click the <strong className="text-[#e6edf3]">✦ Create Agent</strong> icon in the left icon bar of the Agents page to open the creation form.</p>
        <DocTable
          headers={['Field', 'Required', 'Description']}
          rows={[
            ['Name', 'Yes', 'Unique display name (e.g. "Senior Tax Advisor")'],
            ['Description', 'No', 'Short summary shown on the agent card'],
            ['Category', 'Yes', 'Finance, Tax, Audit, HR, IT, Sales, General'],
            ['Instructions', 'Yes', 'The system prompt that defines agent behavior'],
            ['Model', 'Yes', 'claude-sonnet-4-5, gemini-2.5-pro, gpt-4o, etc.'],
            ['Web Search', 'No', 'Enable Tavily real-time search'],
            ['File Context', 'No', 'Allow files to be attached in chat'],
            ['Avatar', 'No', 'Emoji or color for the agent card'],
          ]}
        />

        <h2 id="instructions" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Step 4: Write Effective Instructions</h2>
        <p className="text-sm text-[#8b949e] mb-3">Instructions are the system prompt. Be specific about the agent&apos;s role, tone, output format, and any constraints.</p>

        <p className="text-xs font-semibold text-[#22c55e] mb-1">✅ Good instructions:</p>
        <Code lang="text">{`You are a senior IRS Compliance Specialist with 15 years of experience.
Your job is to help small accounting firms navigate IRS rules, filing requirements, 
and penalty abatement procedures.

When answering:
- Always cite the relevant IRC section or IRS publication number
- Provide step-by-step action plans
- Flag anything that requires a licensed CPA to sign off
- Use plain language — avoid jargon unless the user is clearly a professional

Output format: Use bullet points for action items and bold key deadlines.`}</Code>

        <p className="text-xs font-semibold text-[#ef4444] mb-1">❌ Weak instructions:</p>
        <Code lang="text">{`Help with taxes.`}</Code>

        <h2 id="capabilities" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Step 5: Configure Capabilities</h2>
        <DocTable
          headers={['Capability', 'What It Does', 'Requires']}
          rows={[
            ['Web Search', 'Agent can search the web for real-time info (IRS updates, market data)', 'Tavily API key'],
            ['File Context', 'Users can attach PDFs, XLSX, DOCX files in chat', 'No extra key'],
            ['Knowledge Base', 'Agent references your firm\'s uploaded documents via RAG', 'KB documents uploaded'],
            ['Code Interpreter', 'Agent can write and explain Python/Excel formulas', 'No extra key'],
            ['Artifacts', 'Agent outputs rendered HTML tables, charts, or reports', 'No extra key'],
          ]}
        />

        <h2 id="deploy" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Step 6: Deploy and Chat</h2>
        <p className="text-sm text-[#8b949e]">Click <strong className="text-[#e6edf3]">Save Agent</strong>. Your agent appears in My Agents. Click <strong className="text-[#e6edf3]">Chat</strong> on the card to start a session. The agent badge will appear in the chat header showing which agent is active.</p>
        <Callout type="tip" title="Tip: Agents persist across sessions">
          Your custom agents are stored in localStorage and sync to your account. You can switch agents mid-conversation using the agent selector in the chat header.
        </Callout>
      </div>
    ),
  },

  // ── 4. Knowledge Base ──────────────────────────────────────────────────────
  {
    id: 'knowledge-base',
    title: 'Knowledge Base (RAG)',
    sections: [
      { id: 'what-is-kb',     label: 'What is the Knowledge Base?' },
      { id: 'upload-docs',    label: 'Uploading Documents' },
      { id: 'ext-sources',    label: 'External Sources' },
      { id: 'tagging',        label: 'Tagging & Filtering' },
      { id: 'using-in-chat',  label: 'Using KB in Chat' },
      { id: 'limits',         label: 'Limits & Best Practices' },
    ],
    content: (
      <div>
        <p className="text-sm text-[#8b949e] mb-6">
          The Knowledge Base (KB) enables <strong className="text-[#e6edf3]">Retrieval-Augmented Generation (RAG)</strong>. Upload your firm&apos;s documents and the AI will reference them when answering questions — giving you accurate, grounded answers instead of hallucinations.
        </p>

        <h2 id="what-is-kb" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">What is the Knowledge Base?</h2>
        <p className="text-sm text-[#8b949e] mb-4">When you send a message in chat with KB enabled, Finedge:</p>
        <ol className="space-y-2 text-sm text-[#8b949e]">
          {[
            'Extracts keywords from your message',
            'Searches your uploaded documents for relevant excerpts',
            'Injects those excerpts into the AI system prompt as context',
            'The AI answers using your documents as the source of truth',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/20 text-[10px] font-bold text-[#3b82f6]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <h2 id="upload-docs" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Uploading Documents</h2>
        <p className="text-sm text-[#8b949e] mb-3">Navigate to <strong className="text-[#e6edf3]">Knowledge Base</strong> in the sidebar. Click <strong className="text-[#e6edf3]">+ Add Source</strong> and choose <strong className="text-[#e6edf3]">File Upload</strong>.</p>
        <DocTable
          headers={['Format', 'Max Size', 'Notes']}
          rows={[
            ['PDF', '10 MB', 'Text is extracted automatically; scanned PDFs may have lower accuracy'],
            ['DOCX', '10 MB', 'Full text extraction'],
            ['XLSX / CSV', '5 MB', 'Headers and cell values extracted as text'],
            ['TXT', '5 MB', 'Plain text, direct ingestion'],
            ['MD', '5 MB', 'Markdown stripped before indexing'],
          ]}
        />
        <Callout type="info" title="Batch uploads">
          You can select multiple files at once. Each file is processed independently and appears as a separate row in the document list.
        </Callout>

        <h2 id="ext-sources" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">External Sources</h2>
        <p className="text-sm text-[#8b949e] mb-3">Click <strong className="text-[#e6edf3]">+ Add Source</strong> and choose an external connector:</p>
        <DocTable
          headers={['Source', 'What It Syncs', 'Auth Required']}
          rows={[
            ['GitHub', 'Repository files, README, docs folders', 'Public repos: No · Private: PAT token'],
            ['Notion', 'Pages and databases from a workspace', 'OAuth via Notion integration'],
            ['Google Drive', 'Docs, Sheets, PDFs from Drive folders', 'OAuth (configured in Integrations)'],
            ['Web Scrape', 'Any public URL — scraped as plain text', 'No'],
          ]}
        />

        <h2 id="tagging" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Tagging & Filtering</h2>
        <p className="text-sm text-[#8b949e] mb-3">
          Every document can have one or more tags (e.g. <IC>IRS</IC> <IC>2024</IC> <IC>Client-ABC</IC> <IC>Payroll</IC>). Use the filter dropdown in the KB header to restrict RAG search to specific tagged documents.
        </p>
        <Callout type="tip" title="Pro tip: Tag by client">
          Tag documents with your client name. Then in chat, filter to that client&apos;s documents before asking questions — the AI will only reference their files.
        </Callout>

        <h2 id="using-in-chat" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Using the KB in Chat</h2>
        <Step n={1} title="Enable KB toggle">
          <p>In the chat input bar, click the <IC>+</IC> button and toggle <strong className="text-[#e6edf3]">Knowledge Base</strong> on. A blue <IC>KB</IC> badge appears in the chat header.</p>
        </Step>
        <Step n={2} title="Ask questions grounded in your documents">
          <p>Type your question naturally. The AI will retrieve relevant excerpts and cite the document name in its response.</p>
        </Step>
        <Step n={3} title="Combine with agents">
          <p>Select a finance agent <em>and</em> enable KB simultaneously. For example: CFO Advisor + your Q3 financial report = deeply contextual CFO analysis.</p>
        </Step>

        <h2 id="limits" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Limits & Best Practices</h2>
        <ul className="space-y-2 text-sm text-[#8b949e]">
          <li className="flex items-start gap-2"><span className="text-[#22c55e]">•</span> Keep individual files under 10 MB for fastest processing.</li>
          <li className="flex items-start gap-2"><span className="text-[#22c55e]">•</span> Use descriptive file names — they appear in citations.</li>
          <li className="flex items-start gap-2"><span className="text-[#22c55e]">•</span> Re-upload documents when they change (no auto-sync for file uploads).</li>
          <li className="flex items-start gap-2"><span className="text-[#f59e0b]">•</span> RAG works best with text-heavy documents. Images and charts inside PDFs are not yet extracted.</li>
          <li className="flex items-start gap-2"><span className="text-[#f59e0b]">•</span> Very large files (&gt;500K characters) are truncated to the first 500,000 characters.</li>
        </ul>
      </div>
    ),
  },

  // ── 5. Chat Interface ──────────────────────────────────────────────────────
  {
    id: 'chat',
    title: 'Chat Interface',
    sections: [
      { id: 'overview',   label: 'Overview' },
      { id: 'models',     label: 'Selecting a Model' },
      { id: 'plus-menu',  label: 'The + Capabilities Menu' },
      { id: 'history',    label: 'Chat History' },
      { id: 'streaming',  label: 'Streaming Responses' },
      { id: 'shortcuts',  label: 'Keyboard Shortcuts' },
    ],
    content: (
      <div>
        <p className="text-sm text-[#8b949e] mb-6">
          The Finedge chat interface is modeled after modern AI tools like LobeHub and ChatGPT, with a collapsible history sidebar, model selector, and a <IC>+</IC> capabilities menu for power users.
        </p>

        <h2 id="overview" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Overview</h2>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 mb-4 font-mono text-xs text-[#8b949e]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#3b82f6]">┌─</span>
            <span className="text-[#e6edf3]">History Sidebar</span>
            <span className="text-[#3b82f6]">──┐</span>
            <span className="text-[#e6edf3]">Chat Area</span>
            <span className="text-[#3b82f6]">──────────────────────────────────────┐</span>
          </div>
          <div className="flex gap-4">
            <div className="w-32 space-y-1">
              <p>• New Chat</p>
              <p>• Session 1</p>
              <p>• Session 2</p>
              <p>• Session 3</p>
            </div>
            <div className="flex-1 space-y-1">
              <p>Top bar: [Model Selector] [Agent Badge] [KB Badge]</p>
              <p>─────────────────────────────────────────────</p>
              <p>                Greeting / Messages</p>
              <p>─────────────────────────────────────────────</p>
              <p>Input: [📎][+][message…][🎤][Send]</p>
            </div>
          </div>
        </div>

        <h2 id="models" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Selecting a Model</h2>
        <p className="text-sm text-[#8b949e] mb-3">Click the model name in the top bar to open the model picker. Models are grouped by provider. Only models for which you have a valid API key are shown as available.</p>
        <DocTable
          headers={['Model', 'Best For', 'Context']}
          rows={[
            ['Claude Sonnet 4.5', 'General accounting tasks, drafting, analysis', '200K'],
            ['Claude Opus 4', 'Complex multi-step reasoning, legal review', '200K'],
            ['Gemini 2.5 Pro', 'Long financial documents, spreadsheets', '1.5M'],
            ['GPT-4o', 'Multimodal tasks, image analysis', '128K'],
            ['o3', 'Deep mathematical / financial modeling', '200K'],
          ]}
        />

        <h2 id="plus-menu" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">The + Capabilities Menu</h2>
        <p className="text-sm text-[#8b949e] mb-3">Click the <IC>+</IC> button in the input bar to toggle capabilities on or off for the current session:</p>
        <ul className="space-y-2 text-sm text-[#8b949e]">
          {[
            { cap: 'File Search',     icon: '📄', desc: 'Attach a file (PDF, XLSX, DOCX) to this specific message.' },
            { cap: 'Web Search',      icon: '🌐', desc: 'Enable Tavily real-time web search for this message.' },
            { cap: 'Knowledge Base',  icon: '📚', desc: 'Pull context from your uploaded KB documents.' },
            { cap: 'Skills',          icon: '🧠', desc: 'Activate an agent/skill persona.' },
            { cap: 'Code Interpreter',icon: '💻', desc: 'Ask the AI to write or explain code.' },
          ].map(c => (
            <li key={c.cap} className="flex items-start gap-3">
              <span className="text-base">{c.icon}</span>
              <span><strong className="text-[#e6edf3]">{c.cap}</strong> — {c.desc}</span>
            </li>
          ))}
        </ul>

        <h2 id="history" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Chat History</h2>
        <p className="text-sm text-[#8b949e] mb-3">All sessions are stored in <IC>localStorage</IC> with the key <IC>finedge_chat_sessions</IC>. Each session stores:</p>
        <Code lang="json">{`{
  "id": "sess_1714857600000",
  "title": "IRS Penalty Abatement Options",
  "model": "claude-sonnet-4-5",
  "agentId": "agent_irs",
  "messages": [...],
  "createdAt": "2026-05-11T14:00:00Z",
  "updatedAt": "2026-05-11T14:32:00Z"
}`}</Code>
        <p className="text-sm text-[#8b949e] mt-2">Sessions are auto-titled from the first user message. You can delete any session by hovering it in the sidebar and clicking the trash icon.</p>

        <h2 id="streaming" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Streaming Responses</h2>
        <p className="text-sm text-[#8b949e] mb-2">Responses stream via <strong className="text-[#e6edf3]">Server-Sent Events (SSE)</strong> from the <IC>/api/chat</IC> route. The stream format is compatible with Anthropic&apos;s streaming API:</p>
        <Code lang="text">{`event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"The IRS..."}}`}</Code>

        <h2 id="shortcuts" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Keyboard Shortcuts</h2>
        <DocTable
          headers={['Shortcut', 'Action']}
          rows={[
            ['Enter', 'Send message'],
            ['Shift + Enter', 'New line in message'],
            ['Ctrl/Cmd + K', 'Focus search (history sidebar)'],
            ['Ctrl/Cmd + N', 'New chat session'],
            ['Esc', 'Close capability menu or dropdowns'],
          ]}
        />
      </div>
    ),
  },

  // ── 6. Integrations ────────────────────────────────────────────────────────
  {
    id: 'integrations',
    title: 'Integrations',
    sections: [
      { id: 'gmail',    label: 'Gmail Monitor' },
      { id: 'stripe',   label: 'Billing (Stripe)' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'drive',    label: 'Google Drive' },
    ],
    content: (
      <div>
        <p className="text-sm text-[#8b949e] mb-6">
          Finedge integrates with your existing business tools via <strong className="text-[#e6edf3]">OAuth 2.0</strong>. Tokens are stored securely in Supabase with RLS. No integration is required to use AI chat — these are optional enhancements.
        </p>

        <h2 id="gmail" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Gmail Monitor</h2>
        <p className="text-sm text-[#8b949e] mb-3">Connect your Google account to analyze, summarize, and draft replies to emails from within Finedge.</p>
        <Step n={1} title="Connect Google Workspace">
          <p>Go to <strong className="text-[#e6edf3]">Settings → Integrations → Google Workspace</strong> and click <strong className="text-[#e6edf3]">Connect</strong>. You will be redirected to Google OAuth.</p>
        </Step>
        <Step n={2} title="Grant permissions">
          <p>Finedge requests <IC>gmail.readonly</IC> and <IC>gmail.send</IC> scopes. These allow reading and sending emails on your behalf.</p>
        </Step>
        <Step n={3} title="Use Gmail Monitor">
          <p>Click <strong className="text-[#e6edf3]">Gmail Monitor</strong> in the sidebar to view flagged emails, run AI analysis, and compose replies.</p>
        </Step>
        <Callout type="warning" title="Scope reminder">
          Finedge only reads emails if you explicitly trigger analysis. It does not background-sync your inbox.
        </Callout>

        <h2 id="stripe" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Billing (Stripe)</h2>
        <p className="text-sm text-[#8b949e] mb-3">Monitor your clients&apos; Stripe accounts — view charges, subscriptions, revenue metrics, and failed payments.</p>
        <Step n={1} title="Add Stripe Secret Key">
          <p>Go to <strong className="text-[#e6edf3]">Settings → API Keys → Stripe Secret Key</strong>. Use a <strong className="text-[#e6edf3]">Restricted Key</strong> with only <IC>read</IC> access for safety.</p>
        </Step>
        <Step n={2} title="Open Billing panel">
          <p>Click <strong className="text-[#e6edf3]">Billing</strong> in the sidebar to view live revenue data.</p>
        </Step>
        <Callout type="tip" title="Use restricted keys">
          Create a Stripe Restricted Key at dashboard.stripe.com/apikeys with read-only permissions. Never paste your main secret key.
        </Callout>

        <h2 id="calendar" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Calendar</h2>
        <p className="text-sm text-[#8b949e] mb-3">View your Google Calendar events and create AI-powered meeting summaries and agendas.</p>
        <Step n={1} title="Connect Google Calendar">
          <p>Settings → Integrations → Google Workspace → Enable Calendar scope. If you already connected Gmail, re-authorize to add calendar permissions.</p>
        </Step>
        <Step n={2} title="View Calendar">
          <p>Navigate to <strong className="text-[#e6edf3]">Calendar</strong> in the sidebar. Events from all your connected calendars appear in a monthly view.</p>
        </Step>

        <h2 id="drive" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">Google Drive</h2>
        <p className="text-sm text-[#8b949e] mb-3">Browse and import files from Google Drive directly into the Knowledge Base.</p>
        <Step n={1} title="Connect Drive">
          <p>Settings → Integrations → Google Workspace → Enable Drive scope.</p>
        </Step>
        <Step n={2} title="Browse files">
          <p>Click <strong className="text-[#e6edf3]">Google Drive</strong> in the sidebar to browse your Drive folders.</p>
        </Step>
        <Step n={3} title="Add to Knowledge Base">
          <p>Select a file and click <strong className="text-[#e6edf3]">Add to KB</strong>. The file is extracted and indexed automatically.</p>
        </Step>
      </div>
    ),
  },

  // ── 7. API Reference ───────────────────────────────────────────────────────
  {
    id: 'api-reference',
    title: 'API Reference',
    sections: [
      { id: 'chat-route',   label: 'POST /api/chat' },
      { id: 'keys-route',   label: 'GET /api/user-keys' },
      { id: 'kb-extract',   label: 'POST /api/kb/extract' },
      { id: 'kb-search',    label: 'GET /api/kb/search' },
    ],
    content: (
      <div>
        <p className="text-sm text-[#8b949e] mb-6">
          Finedge exposes a set of internal Next.js API routes. These are used by the frontend and can also be called from external scripts if you are self-hosting.
        </p>

        <Callout type="info" title="Authentication">
          All routes require a valid Clerk session cookie. Unauthenticated requests return <IC>401</IC>.
        </Callout>

        <h2 id="chat-route" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">POST /api/chat</h2>
        <p className="text-sm text-[#8b949e] mb-3">Streams an AI response. Supports Anthropic, Google Generative AI, and OpenAI-compatible providers.</p>
        <Code lang="json">{`// Request body
{
  "messages": [
    { "role": "user", "content": "Explain IRC Section 199A" }
  ],
  "model": "claude-sonnet-4-5",         // optional, default: claude-sonnet-4-5
  "agentInstruction": "You are a tax specialist...", // optional
  "kbContext": "...retrieved excerpts...",           // optional
  "webSearch": false                                 // optional
}`}</Code>
        <Code lang="text">{`// Response: Server-Sent Events stream
event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"IRC §199A..."}}

event: message_stop
data: {"type":"message_stop"}`}</Code>

        <h2 id="keys-route" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">GET /api/user-keys</h2>
        <p className="text-sm text-[#8b949e] mb-3">Returns which provider keys are set for the current user (never returns the actual key values).</p>
        <Code lang="json">{`// Response
{
  "has": {
    "anthropic": true,
    "google_ai": false,
    "openai": false,
    "tavily": true
  }
}`}</Code>

        <h2 id="kb-extract" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">POST /api/kb/extract</h2>
        <p className="text-sm text-[#8b949e] mb-3">Extracts text from an uploaded file. Accepts <IC>multipart/form-data</IC> with a <IC>file</IC> field.</p>
        <Code lang="bash">{`curl -X POST https://your-finedge.vercel.app/api/kb/extract \\
  -H "Cookie: __session=<clerk_session>" \\
  -F "file=@tax_report_2024.pdf"

# Response
{ "text": "Extracted plain text content..." }`}</Code>

        <h2 id="kb-search" className="mb-3 mt-8 text-lg font-bold text-[#e6edf3]">GET /api/kb/search</h2>
        <p className="text-sm text-[#8b949e] mb-3">Keyword search over serialized KB documents. Returns ranked excerpts.</p>
        <Code lang="bash">{`GET /api/kb/search?q=depreciation&docs=[serialized_docs_json]

# Response
{
  "results": [
    {
      "name": "IRS_Publication_946.pdf",
      "excerpt": "...MACRS depreciation allows...",
      "score": 0.87,
      "tags": ["IRS", "depreciation"]
    }
  ]
}`}</Code>

        <DocTable
          headers={['Parameter', 'Type', 'Description']}
          rows={[
            ['`q`', 'string', 'Search query (required)'],
            ['`docs`', 'string', 'URL-encoded JSON array of KB documents from localStorage'],
          ]}
        />
      </div>
    ),
  },
];

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Getting Started',
    pages: ['guide', 'api-keys'],
  },
  {
    label: 'Core Features',
    pages: ['chat', 'agents', 'knowledge-base'],
  },
  {
    label: 'Integrations & API',
    pages: ['integrations', 'api-reference'],
  },
];

const PAGE_LABELS: Record<string, string> = {
  'guide':          'Platform Guide',
  'api-keys':       'API Keys',
  'chat':           'Chat Interface',
  'agents':         'Creating Agents',
  'knowledge-base': 'Knowledge Base',
  'integrations':   'Integrations',
  'api-reference':  'API Reference',
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function DocsPanel() {
  const [activePage, setActivePage] = useState('guide');
  const [activeSection, setActiveSection] = useState('');
  const [showNav, setShowNav] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const page = PAGES.find(p => p.id === activePage) ?? PAGES[0];

  // Scroll spy
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    function onScroll() {
      const headings = el!.querySelectorAll('[id]');
      for (let i = headings.length - 1; i >= 0; i--) {
        const h = headings[i] as HTMLElement;
        if (h.getBoundingClientRect().top <= 120) {
          setActiveSection(h.id);
          return;
        }
      }
    }
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [activePage]);

  function goTo(pageId: string) {
    setActivePage(pageId);
    setActiveSection('');
    setShowNav(false);
    contentRef.current?.scrollTo(0, 0);
  }

  function scrollTo(sectionId: string) {
    const el = contentRef.current?.querySelector(`#${sectionId}`) as HTMLElement | null;
    if (el) {
      contentRef.current?.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  }

  function copyLLM() {
    const text = contentRef.current?.innerText ?? '';
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0d1117]">

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-60 z-20 w-56 shrink-0 overflow-y-auto border-r border-[#1e2836] bg-[#0d1117] transition-transform duration-200
        md:relative md:left-0 md:translate-x-0
        ${showNav ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-3 py-5">
          <div className="mb-4 flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8b949e]">Documentation</span>
            <button onClick={() => setShowNav(false)} className="md:hidden text-[#8b949e] hover:text-[#e6edf3]">
              <IconX className="h-4 w-4" />
            </button>
          </div>
          {NAV_GROUPS.map(g => (
            <div key={g.label} className="mb-4">
              <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-widest text-[#6e7681]">{g.label}</p>
              {g.pages.map(pid => (
                <button key={pid} onClick={() => goTo(pid)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all ${activePage === pid ? 'bg-[#1e2836] font-semibold text-[#e6edf3]' : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]'}`}>
                  {activePage === pid && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" />}
                  {PAGE_LABELS[pid]}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile nav backdrop */}
      {showNav && <div className="fixed inset-0 z-10 bg-black/60 md:hidden" onClick={() => setShowNav(false)} />}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1e2836] bg-[#0d1117]/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNav(v => !v)} className="md:hidden text-[#8b949e] hover:text-[#e6edf3]">
              <IconMenu2 className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold text-[#e6edf3]">{page.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyLLM}
              className="flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-[11px] font-medium text-[#8b949e] hover:border-[#3b82f6]/50 hover:text-[#e6edf3] transition-all">
              <IconCopy className="h-3 w-3" /> Copy for LLM
            </button>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-[11px] font-medium text-[#8b949e]">
              <span className="text-[9px]">⊞</span> View as Markdown
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="mx-auto max-w-3xl px-8 py-8">
          <h1 className="mb-2 text-2xl font-bold text-[#e6edf3]">{page.title}</h1>
          <div className="prose prose-invert max-w-none">
            {page.content}
          </div>

          {/* Prev / Next navigation */}
          <div className="mt-12 flex items-center justify-between border-t border-[#1e2836] pt-6">
            {(() => {
              const allPages = PAGES.map(p => p.id);
              const idx = allPages.indexOf(activePage);
              const prev = idx > 0 ? PAGES[idx - 1] : null;
              const next = idx < PAGES.length - 1 ? PAGES[idx + 1] : null;
              return (
                <>
                  {prev ? (
                    <button onClick={() => goTo(prev.id)}
                      className="flex items-center gap-2 rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-2.5 text-xs font-semibold text-[#8b949e] hover:border-[#3b82f6]/50 hover:text-[#e6edf3] transition-all">
                      ← {prev.title}
                    </button>
                  ) : <div />}
                  {next ? (
                    <button onClick={() => goTo(next.id)}
                      className="flex items-center gap-2 rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-2.5 text-xs font-semibold text-[#8b949e] hover:border-[#3b82f6]/50 hover:text-[#e6edf3] transition-all">
                      {next.title} →
                    </button>
                  ) : <div />}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Right: On this page ───────────────────────────────────────────── */}
      <aside className="hidden w-52 shrink-0 overflow-y-auto border-l border-[#1e2836] xl:block">
        <div className="sticky top-0 px-4 py-5">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8b949e]">
            <span>≡</span> On this page
          </p>
          <div className="space-y-0.5">
            {page.sections.map(s => (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                className={`block w-full text-left rounded-lg px-2 py-1.5 text-[11px] transition-all ${activeSection === s.id ? 'bg-[#1e2836] font-semibold text-[#3b82f6]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
                {activeSection === s.id && <span className="mr-1 text-[#3b82f6]">│</span>}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
