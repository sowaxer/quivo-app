<div align="center">

# Quivo

### A unified AI command center for accounting firms

One dashboard to centralize AI providers, specialized finance agents and business apps.<br/>
Bring-your-own-key (BYOK) architecture with an encrypted credential vault, real-time tool calling and multi-tenant isolation.

![Status](https://img.shields.io/badge/status-archived-lightgrey?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white)
![Encryption](https://img.shields.io/badge/Encryption-AES--256--GCM-orange?style=flat-square)

[Overview](#overview) · [Features](#features) · [Screenshots](#screenshots) · [Architecture](#architecture) · [Security](#security-design) · [Engineering](#engineering-highlights)

</div>

https://github.com/user-attachments/assets/92c372ea-5072-4240-a9d8-23abcecfddc7

> [!NOTE]
> **Status: archived.** This repository is published as a portfolio reference. Development has concluded and there is no public deployment.

<div align="center">

| 🤖 **16** | 🔑 **17** | 🛣️ **31** | 🗄️ **13** | 📝 **~21k** |
| :---: | :---: | :---: | :---: | :---: |
| finance agents | supported providers | API routes | SQL migrations | lines of TypeScript |

</div>

---

## Overview

Quivo brings an accounting firm's AI providers, data sources and daily workflows into a single workspace. A user connects their own API keys and accounts once; from there, an AI agent can read their inbox, calendar, files and Stripe data, answer questions in real time, and run specialized finance tasks — without the firm paying a markup on AI usage.

```mermaid
flowchart LR
    A["🔑 Connect<br/>API keys + OAuth apps"] --> B["🔒 Encrypt<br/>AES-256-GCM vault"]
    B --> C["🤖 Orchestrate<br/>agents + tool calling"]
    C --> D["📊 Act<br/>answers, reports, exports"]
    classDef indigo fill:#4F46E5,stroke:#3730A3,color:#fff
    classDef teal fill:#0D9488,stroke:#0F766E,color:#fff
    classDef amber fill:#D97706,stroke:#B45309,color:#fff
    classDef rose fill:#E11D48,stroke:#BE123C,color:#fff
    classDef slate fill:#334155,stroke:#1E293B,color:#fff
    class A indigo
    class B rose
    class C teal
    class D amber
```

```mermaid
mindmap
  root((Quivo))
    AI layer
      Multi-model chat
      16 finance agents
      Custom agents
      Tool calling
    Data
      Knowledge base
      Bank statements → Excel
      Notes and tasks
    Connected apps
      Gmail
      Google Calendar
      Google Drive
      Dropbox
      Stripe
    Platform
      Encrypted key vault
      Row Level Security
      Rate limiting
      Reminders and notifications
```

## Features

| | Feature | What it does |
| :---: | --- | --- |
| 💬 | **Multi-model chat** | Streaming chat with model switching. Claude (with tool calling) and DeepSeek are wired end-to-end; Gemini, OpenAI and xAI keys can be stored and verified. |
| 🧾 | **16 finance agents** | Tax Advisor, Bookkeeper, Virtual CFO, Audit Assistant, Payroll, IRS Notice Handler, Due Diligence, Entity & Corp Law and more — each with its own system prompt. Users can also create custom agents. |
| 🛠️ | **Real-time tool calling** | The agent decides when to query the user's Gmail, Calendar, Stripe, notes or the live web (Tavily) mid-conversation, and only for integrations the user has connected. |
| 📚 | **Knowledge Base** | Upload text documents or PDFs. Relevant excerpts are found by keyword match and injected into the prompt — a lightweight retrieval-augmented generation, without a vector database. |
| 🏦 | **Bank statement analysis** | Parses statement images and PDFs with Claude vision, categorizes transactions and generates a 4-sheet Excel workbook. |
| 🔌 | **Unified dashboard** | Inbox, Drive files, calendar and Stripe billing viewable in one place — Google and Dropbox via OAuth 2.0, Stripe via the user's own key. |
| ⏰ | **Tasks, notes & reminders** | Unified planner with scheduled reminders and in-app notifications. |
| 📈 | **Market module** | Live index ticker from Yahoo Finance quotes; headlines and watchlist ship with a demo data feed. |

## Screenshots

| AI Chat | AI Agents |
| :---: | :---: |
| ![AI chat](docs/screenshots/ai-chat.png) | ![AI agents marketplace](docs/screenshots/ai-agents.png) |
| **API Keys (BYOK)** | **Knowledge Base** |
| ![API keys](docs/screenshots/api-keys.png) | ![Knowledge base docs](docs/screenshots/knowledge-base.png) |
| **Finance** | **Dashboard** |
| ![Finance view](docs/screenshots/finance.png) | ![Dashboard](docs/screenshots/dashboard.png) |

## Tech stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,supabase,postgres,redis,vercel" alt="Next.js, React, TypeScript, Tailwind, Supabase, Postgres, Redis, Vercel" />
</p>

| Layer | Tools |
| --- | --- |
| **Framework** | Next.js 16 (App Router, Route Handlers) · React 19 · TypeScript |
| **UI** | Tailwind CSS 4 · shadcn/ui · Radix · Framer Motion · Recharts |
| **Auth** | Clerk |
| **Database** | Supabase (Postgres) with Row Level Security |
| **Security** | AES-256-GCM (`@noble/ciphers`) · Upstash rate limiting · Zod validation · CSP |
| **AI** | Anthropic SDK · Vercel AI SDK · DeepSeek API · Google Generative AI |
| **Integrations** | Gmail · Calendar · Drive · Dropbox · Stripe · Tavily |
| **Hosting** | Vercel |

## Architecture

```mermaid
flowchart TB
    User(["👤 Browser"])

    subgraph Edge["Next.js on Vercel"]
        direction TB
        Proxy["<b>proxy.ts</b><br/>session check · rate limit"]
        API["<b>Route handlers</b> /api/*<br/>Zod validation"]
        Vault["<b>Key vault</b><br/>AES-256-GCM · server-only"]
        Proxy --> API --> Vault
    end

    subgraph Services["Managed services"]
        Clerk["🔐 Clerk<br/>auth"]
        Redis[("⚡ Upstash Redis<br/>rate-limit counters")]
        DB[("🗄️ Supabase Postgres<br/>RLS on every table")]
    end

    subgraph External["Called with the user's own credentials"]
        AI["🤖 AI providers<br/>Anthropic · DeepSeek · Google · OpenAI"]
        Apps["🔌 Gmail · Calendar · Drive<br/>Dropbox · Stripe"]
    end

    User -->|HTTPS| Proxy
    Proxy -.-> Clerk
    Proxy -.-> Redis
    Vault <-->|ciphertext only| DB
    API -->|user's API key| AI
    API -->|user's OAuth token| Apps
    classDef indigo fill:#4F46E5,stroke:#3730A3,color:#fff
    classDef teal fill:#0D9488,stroke:#0F766E,color:#fff
    classDef amber fill:#D97706,stroke:#B45309,color:#fff
    classDef rose fill:#E11D48,stroke:#BE123C,color:#fff
    classDef slate fill:#334155,stroke:#1E293B,color:#fff
    class User slate
    class Proxy,API indigo
    class Vault rose
    class Clerk,Redis,DB teal
    class AI,Apps amber
    style Edge fill:#EEF2FF,stroke:#6366F1,color:#1E1B4B
    style Services fill:#F0FDFA,stroke:#14B8A6,color:#134E4A
    style External fill:#FFFBEB,stroke:#F59E0B,color:#78350F
```

### What happens when a user sends a chat message

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant P as proxy.ts
    participant R as /api/chat
    participant V as Key vault
    participant DB as Supabase
    participant C as Claude API
    participant G as Gmail API

    rect rgba(79, 70, 229, 0.12)
    Note over U,R: 1 · Authenticate and validate
    U->>P: POST message
    P->>P: Verify Clerk session + IP rate limit
    P->>R: Forward request
    R->>R: Validate body (Zod)
    end
    rect rgba(225, 29, 72, 0.12)
    Note over R,DB: 2 · Unlock the user's key
    R->>DB: Load encrypted key
    DB-->>V: fe256gcm:v1:…
    V-->>R: Decrypt in memory (never sent to browser)
    end
    rect rgba(13, 148, 136, 0.12)
    Note over R,G: 3 · Reason and call tools
    R->>C: Stream request with the user's key
    C-->>R: tool_use: query_gmail
    R->>G: Search inbox with the user's OAuth token
    G-->>R: Matching emails
    R->>C: Tool result
    C-->>R: Streamed answer
    R-->>U: Stream tokens to the browser
    end
```

## Security design

Quivo stores **other people's API keys and OAuth tokens**, so security got the most attention. It uses several layers, so one mistake doesn't expose secrets on its own:

```mermaid
flowchart LR
    A["1 · Clerk session<br/>required on protected routes"] --> B["2 · Rate limits<br/>Upstash sliding window"]
    B --> C["3 · Input validation<br/>Zod schemas"]
    C --> D["4 · Encryption<br/>AES-256-GCM"]
    D --> E["5 · Row Level Security<br/>Postgres policies"]
    classDef indigo fill:#4F46E5,stroke:#3730A3,color:#fff
    classDef teal fill:#0D9488,stroke:#0F766E,color:#fff
    classDef amber fill:#D97706,stroke:#B45309,color:#fff
    classDef rose fill:#E11D48,stroke:#BE123C,color:#fff
    classDef slate fill:#334155,stroke:#1E293B,color:#fff
    class A indigo
    class B slate
    class C teal
    class D rose
    class E amber
```

### 1 · Encryption at rest (AES-256-GCM)

Every secret is encrypted on the server **before** it touches the database ([`lib/encryption.ts`](lib/encryption.ts)):

```ts
export function encrypt(text: string): string {
  const key = keyBytes();                       // 32-byte key from ENCRYPTION_KEY, never from the DB
  const nonce = randomBytes(12);                // fresh random nonce for every write
  const cipher = gcm(key, nonce);
  const enc = cipher.encrypt(new TextEncoder().encode(text)); // ciphertext + 16-byte auth tag
  const combined = new Uint8Array(12 + enc.length);
  combined.set(nonce);
  combined.set(enc, 12);
  return `fe256gcm:v1:${Buffer.from(combined).toString('base64')}`;
}
```

| Design choice | Why it matters |
| --- | --- |
| Key lives in an environment variable | A database leak alone reveals only ciphertext. |
| Random 12-byte nonce per encryption | The same API key never produces the same stored value twice. |
| GCM authentication tag | Tampered data fails to decrypt instead of returning garbage. |
| Version prefix `fe256gcm:v1:` | The algorithm can be rotated later; an older CBC format is still readable for migration. |

### 2 · Row Level Security (Postgres)

RLS is enabled on every table that holds user data ([`supabase/migrations`](supabase/migrations)). A user can only read their own keys (simplified):

```sql
CREATE POLICY "api_keys_owner_select" ON public.api_keys
  FOR SELECT TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub'));   -- Clerk user ID from the JWT
```

OAuth token tables (`google_tokens`, `dropbox_tokens`) go further: **only the server's service role** can touch them, so even a misconfigured browser client cannot read them.

> [!IMPORTANT]
> **Lesson learned:** with Clerk, `user_id` is a text Clerk ID, not Supabase's `auth.uid()`. A policy written with `auth.uid()` *looks* secure but matches no rows. The migrations document why each policy is written the way it is.

### 3 · Other safeguards

| Safeguard | Detail |
| --- | --- |
| Rate limiting | Sliding windows per user or IP, e.g. 20 chat requests/min, 5 auth attempts/min, 50 key changes/hour. |
| Server-only secrets | The Supabase service-role client imports `server-only`, so the build fails if it ever reaches browser code. |
| Env validation | Zod checks environment variables at startup; production builds fail without an encryption key. |
| OAuth CSRF protection | HMAC-signed `state` parameter on the Google and Dropbox connect flows. |
| Key hints | The UI shows `sk-ant-…a8Kz`, never the full key. |
| Content-Security-Policy | CSP headers in `next.config.ts`, allowing only the app's own origins plus Clerk. |

## Engineering highlights

| Challenge | Approach |
| --- | --- |
| **Bridging Clerk identity with Postgres RLS** | Clerk issues text user IDs, so Supabase's `auth.uid()` never matches. Policies read the Clerk `sub` claim from the JWT instead, and OAuth token tables are locked to the service role. |
| **Streaming with tool calls** | The chat route streams tokens to the browser while handling Claude's `tool_use` turns server-side — running the tool with the user's credentials and feeding results back into the same stream. |
| **Multi-provider key management** | Each key is verified live against its provider's API before it is saved, encrypted, and stored with a non-secret hint and `last_used` timestamp so the UI never needs to decrypt it. |
| **Crypto agility** | Ciphertexts carry a version prefix. The vault moved from AES-256-CBC to AES-256-GCM while existing rows stayed readable during migration. |
| **Defense against abuse** | Edge-level IP limits in `proxy.ts`, per-user limits per route, and hard caps on payload size (120 messages, 120k characters each) before any model call. |
| **Fail-closed configuration** | Environment variables are schema-validated; a production build without an encryption key fails instead of deploying insecurely. |

<details>
<summary><b>📁 Project structure</b></summary>

```
app/
  api/            31 route handlers (chat, agent, keys, google, dropbox, stripe, kb…)
  dashboard/      main workspace
  settings/       account, appearance, API keys
components/       43 UI panels (chat, agents, knowledge base, planner, finance…)
lib/              encryption, key vault, Supabase clients, rate limits, env schema
supabase/
  migrations/     schema + RLS policies
proxy.ts          auth, CSP and rate limiting for every request
```

</details>

<details>
<summary><b>💻 Running it locally</b></summary>

The project is archived, but it still runs with your own services:

```bash
git clone https://github.com/sowaxer/quivo-app.git
cd quivo-app
npm install
cp .env.example .env.local   # fill in Clerk, Supabase, Upstash and ENCRYPTION_KEY
npm run dev
```

Run the SQL files in `supabase/migrations/` (starting with `00_SETUP_ALL.sql`) in your Supabase project, then add your own AI provider key under **Settings → API Keys**.

</details>

---

<div align="center">
<sub>© 2026 sowaxer · All rights reserved · Shared for portfolio purposes only, not licensed for reuse</sub>
</div>
