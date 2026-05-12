'use client';

import { useState } from 'react';
import { IconSearch, IconCheck, IconPlus, IconExternalLink, IconLoader2 } from '@tabler/icons-react';

// ─── Plugin catalogue ─────────────────────────────────────────────────────────
const ALL_PLUGINS = [
  // Installed / model tools
  { id: 'web-browser',      name: 'Web Browser',       category: 'Model Tools', installed: true,  featured: false, icon: '🌐', desc: 'Browse websites in real time to answer questions with fresh data.' },
  { id: 'code-sandbox',     name: 'Code Sandbox',       category: 'Model Tools', installed: true,  featured: false, icon: '💻', desc: 'Execute and test code snippets in a secure sandbox environment.' },
  // Installed plugins
  { id: 'simple-calc',      name: 'Simple Calculator',  category: 'Utilities',   installed: true,  featured: false, icon: '🧮', desc: 'Help the AI perform math calculations more accurately.' },
  { id: 'web-app-builder',  name: 'Web App Builder',    category: 'Developer',   installed: true,  featured: false, icon: '🏗️', desc: 'Build simple web apps with HTML/CSS/JS. Preview in browser.' },
  { id: 'render-chart',     name: 'Render Chart',       category: 'Visualization', installed: true, featured: false, icon: '📊', desc: 'Visualize data by drawing charts. Uses Chart.js.' },
  { id: 'gpt-image-editor', name: 'GPT Image Editor',   category: 'Media',       installed: true,  featured: false, icon: '🖼️', desc: 'Generate or edit images using OpenAI image generation.' },
  { id: 'deep-research',    name: 'Deep Research',      category: 'Research',    installed: true,  featured: true,  icon: '🔬', desc: 'Perform deep research on a topic and compile a final report.' },
  // Store plugins
  { id: 'dall-e',           name: 'DALL-E 3',           category: 'Media',       installed: false, featured: true,  icon: '🎨', desc: 'Generate stunning images with DALL-E 3 inside the chat.' },
  { id: 'perplexity',       name: 'Perplexity Search',  category: 'Research',    installed: false, featured: false, icon: '🔍', desc: 'Real-time web search powered by Perplexity AI.' },
  { id: 'stable-diff-v2',   name: 'Stable Diffusion v2',category: 'Media',       installed: false, featured: false, icon: '🖼️', desc: 'Generate unique images with Stable Diffusion Transform.' },
  { id: 'stable-diff-v3',   name: 'Stable Diffusion v3',category: 'Media',       installed: false, featured: false, icon: '✨', desc: 'Next-gen image generation with Stable Diffusion v3.' },
  { id: 'interactive-canvas',name: 'Interactive Canvas', category: 'Developer',  installed: false, featured: false, icon: '🎭', desc: 'Allow the AI to create interactive canvases with user input.' },
  { id: 'mermaid',          name: 'Mermaid Diagram',    category: 'Visualization',installed: false, featured: false, icon: '📐', desc: 'Generate and render diagrams using the Mermaid.js library.' },
  { id: 'js-interpreter',   name: 'JavaScript Interpreter', category: 'Developer', installed: false, featured: false, icon: '⚙️', desc: 'Execute JavaScript code directly within the conversation.' },
  { id: 'render-html',      name: 'Render HTML',        category: 'Developer',   installed: false, featured: false, icon: '🌍', desc: 'Render HTML markup and preview pages inside the chat.' },
  { id: 'market-news',      name: 'Market News',        category: 'Finance',     installed: false, featured: true,  icon: '📈', desc: 'Up-to-date financial market news from Alpha Vantage.' },
  { id: 'todo-list',        name: 'Todo List',          category: 'Productivity',installed: false, featured: false, icon: '✅', desc: 'AI-powered todo manager that tracks long-running tasks.' },
  { id: 'extract-webpage',  name: 'Extract Web Page',   category: 'Research',    installed: false, featured: false, icon: '📄', desc: 'Extract content from a webpage using Firecrawl.' },
  { id: 'azure-ai-search',  name: 'Azure AI Search',    category: 'Enterprise',  installed: false, featured: false, icon: '☁️', desc: 'Connect TypingMind to your Azure AI Search training data.' },
  { id: 'web-search-serp',  name: 'Web Search (SERP)',  category: 'Research',    installed: false, featured: false, icon: '🔎', desc: 'Search the web using SerpAPI for real-time results.' },
  { id: 'image-search',     name: 'Image Search',       category: 'Media',       installed: false, featured: false, icon: '🖼️', desc: 'Search for images on the web using Google Image Search.' },
  { id: 'slack-notifier',   name: 'Slack Notifier',     category: 'Productivity',installed: false, featured: false, icon: '💬', desc: 'Send messages from Finedge AI to a Slack channel.' },
  { id: 'google-calendar',  name: 'Google Calendar',    category: 'Productivity',installed: false, featured: false, icon: '📅', desc: 'Give AI read-only access to your Google Calendar events.' },
  { id: 'google-drive-ai',  name: 'Drive Search (AI)',  category: 'Productivity',installed: false, featured: false, icon: '💾', desc: 'AI-powered search through your Google Drive documents.' },
  { id: 'generate-grok',    name: 'Generate Image Grok',category: 'Media',       installed: false, featured: false, icon: '🤖', desc: 'High quality image generation using xAI\'s Grok model.' },
  { id: 'open-router',      name: 'OpenRouter Models',  category: 'AI Models',   installed: false, featured: false, icon: '🔀', desc: 'Access 100+ AI models through OpenRouter API.' },
  { id: 'stripe-payments',  name: 'Stripe Payments',    category: 'Finance',     installed: false, featured: false, icon: '💳', desc: 'Manage invoices, subscriptions, and payments via Stripe API.' },
  { id: 'notion-ai',        name: 'Notion AI',          category: 'Productivity',installed: false, featured: false, icon: '📝', desc: 'Create and update Notion pages and databases with AI.' },
];

const CATEGORIES = ['All', 'Model Tools', 'Research', 'Finance', 'Developer', 'Media', 'Visualization', 'Productivity', 'Utilities', 'Enterprise', 'AI Models'];

function PluginCard({ plugin, onToggle }: { plugin: typeof ALL_PLUGINS[number]; onToggle: () => void }) {
  const [installing, setInstalling] = useState(false);

  async function handleToggle() {
    if (!plugin.installed) {
      setInstalling(true);
      // Real activation: web-browser uses Tavily, others are Claude native tools
      await new Promise(r => setTimeout(r, 500));
      setInstalling(false);
    }
    onToggle();
  }

  return (
    <div className="relative flex h-full min-h-[200px] flex-col rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--text-primary)]/20 hover:bg-[var(--bg-hover)]">
      {plugin.featured && (
        <span className="absolute right-3 top-3 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Featured</span>
      )}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--bg-border)] bg-[var(--bg-base)] text-xl">
          {plugin.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-[var(--text-primary)]">{plugin.name}</p>
          <span className="text-[10px] text-[var(--text-muted)]">{plugin.category}</span>
        </div>
      </div>
      <p className="mb-4 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">{plugin.desc}</p>
      <div className="mt-auto flex min-h-[40px] items-center justify-between gap-2 border-t border-[var(--bg-border)] pt-4">
        {plugin.installed ? (
          <button type="button" onClick={handleToggle}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-all hover:opacity-90">
            <IconCheck className="h-3 w-3" strokeWidth={2.5} /> Installed
          </button>
        ) : (
          <button type="button" onClick={handleToggle} disabled={installing}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--bg-border)] bg-[var(--text-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--bg-base)] transition-all hover:opacity-90 disabled:opacity-50">
            {installing ? <IconLoader2 className="h-3 w-3 animate-spin" /> : <IconPlus className="h-3 w-3" />}
            {installing ? 'Installing…' : 'Install'}
          </button>
        )}
        <button type="button" className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
          <IconExternalLink className="h-3 w-3" /> Docs
        </button>
      </div>
    </div>
  );
}

export default function PluginsPanel() {
  const [plugins, setPlugins] = useState(ALL_PLUGINS);
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'store' | 'installed'>('store');

  function togglePlugin(id: string) {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: !p.installed } : p));
  }

  const installed = plugins.filter(p => p.installed);
  const modelTools = installed.filter(p => p.category === 'Model Tools');
  const userPlugins = installed.filter(p => p.category !== 'Model Tools');

  const storePlugins = plugins.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchC = category === 'All' || p.category === category;
    return matchQ && matchC;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-base)]">
      {/* Sidebar */}
      <div className="w-52 shrink-0 overflow-y-auto border-r border-[var(--bg-border)] bg-[var(--bg-base)] p-4">
        <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Store</p>
        <div className="space-y-1">
          {['store', 'installed'].map(t => (
            <button key={t} type="button" onClick={() => setActiveTab(t as 'store' | 'installed')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium capitalize transition-all ${activeTab === t ? 'bg-[var(--text-primary)] text-[var(--bg-base)] ring-1 ring-white/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
              {t}
              <span className={`text-[10px] font-bold ${activeTab === t ? 'opacity-70' : 'text-[var(--text-muted)]'}`}>
                {t === 'installed' ? installed.length : ALL_PLUGINS.length}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'installed' && (
          <div className="mt-6 space-y-4">
            {modelTools.length > 0 && (
              <div>
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Model tools ({modelTools.length})</p>
                {modelTools.map(p => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]" />
                    <span className="truncate text-[11px] text-[var(--text-muted)]">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
            {userPlugins.length > 0 && (
              <div>
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Plugins ({userPlugins.length})</p>
                {userPlugins.map(p => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]" />
                    <span className="truncate text-[11px] text-[var(--text-muted)]">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'store' && (
          <div className="mt-6">
            <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Categories</p>
            <div className="space-y-0.5">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`flex w-full items-center rounded-lg px-3 py-1.5 text-xs transition-all ${category === c ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                  {category === c && <span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]" />}
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--bg-border)] bg-[var(--bg-base)] px-6 py-4">
          <div className="flex min-h-[40px] items-center gap-4">
            <h2 className="shrink-0 text-lg font-bold text-[var(--text-primary)]">
              {activeTab === 'store' ? 'Plugin Store' : `Installed (${installed.length})`}
            </h2>
            {activeTab === 'store' && (
              <div className="relative max-w-md flex-1">
                <IconSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plugins…"
                  className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-card)] py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/15" />
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'store' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
              {storePlugins.map(p => (
                <PluginCard key={p.id} plugin={p} onToggle={() => togglePlugin(p.id)} />
              ))}
              {storePlugins.length === 0 && (
                <div className="col-span-full flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No plugins found</p>
                  <p className="text-xs text-[var(--text-muted)]">Try a different search or category</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'installed' && (
            <div className="space-y-6">
              {modelTools.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Model Tools</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                    {modelTools.map(p => <PluginCard key={p.id} plugin={p} onToggle={() => togglePlugin(p.id)} />)}
                  </div>
                </div>
              )}
              {userPlugins.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Plugins</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                    {userPlugins.map(p => <PluginCard key={p.id} plugin={p} onToggle={() => togglePlugin(p.id)} />)}
                  </div>
                </div>
              )}
              {installed.length === 0 && (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No plugins installed</p>
                  <button type="button" onClick={() => setActiveTab('store')} className="text-xs font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">Browse the plugin store</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
