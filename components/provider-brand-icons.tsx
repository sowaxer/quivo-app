'use client';

import type { ImgHTMLAttributes } from 'react';

/** User-provided Gemini mark (`public/brands/gemini-mark.png`). */
export const GEMINI_MARK_SRC = '/brands/gemini-mark.png';

/** Tabler-compatible icon for Google AI / Gemini rows (receives `className` e.g. h-4 w-4). */
export function GeminiMarkIcon({ className, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={GEMINI_MARK_SRC}
      alt={alt}
      draggable={false}
      className={`object-contain ${className ?? ''}`}
      {...rest}
    />
  );
}

/** User-provided OpenAI / ChatGPT mark (`public/brands/openai-mark.png`). */
export const OPENAI_MARK_SRC = '/brands/openai-mark.png';

/** Tabler-compatible icon for OpenAI / GPT rows (receives `className` e.g. h-4 w-4). */
export function OpenAIMarkIcon({ className, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={OPENAI_MARK_SRC}
      alt={alt}
      draggable={false}
      className={`object-contain ${className ?? ''}`}
      {...rest}
    />
  );
}

/** User-provided Anthropic / Claude mark (`public/brands/anthropic-mark.png`). */
export const ANTHROPIC_MARK_SRC = '/brands/anthropic-mark.png';

/** Tabler-compatible icon for Anthropic / Claude rows (receives `className` e.g. h-4 w-4). */
export function AnthropicMarkIcon({ className, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={ANTHROPIC_MARK_SRC}
      alt={alt}
      draggable={false}
      className={`object-contain ${className ?? ''}`}
      {...rest}
    />
  );
}

/** User-provided xAI mark (`public/brands/xai-mark.png`). */
export const XAI_MARK_SRC = '/brands/xai-mark.png';

/** Tabler-compatible icon for xAI rows (receives `className` e.g. h-4 w-4). */
export function XAIMarkIcon({ className, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={XAI_MARK_SRC}
      alt={alt}
      draggable={false}
      className={`object-contain ${className ?? ''}`}
      {...rest}
    />
  );
}

/** Real-style provider marks (SVG). Used in API Keys, Models, and elsewhere. */

export function LogoAnthropicClaude({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <img
      src={ANTHROPIC_MARK_SRC}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-md object-contain ${className ?? ''}`}
      aria-hidden
    />
  );
}

export function LogoOpenAI({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <img
      src={OPENAI_MARK_SRC}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-md object-contain ${className ?? ''}`}
      aria-hidden
    />
  );
}

/** Meta (Llama family) — paths derived from @tabler/icons-react IconBrandMeta (MIT) */
export function LogoMeta({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#0866FF" />
      <path
        d="M12 10.174c1.766 -2.784 3.315 -4.174 4.648 -4.174c2 0 3.263 2.213 4 5.217c.704 2.869 .5 6.783 -2 6.783c-1.114 0 -2.648 -1.565 -4.148 -3.652a27.627 27.627 0 0 1 -2.5 -4.174"
        fill="none"
        stroke="white"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10.174c-1.766 -2.784 -3.315 -4.174 -4.648 -4.174c-2 0 -3.263 2.213 -4 5.217c-.704 2.869 -.5 6.783 2 6.783c1.114 0 2.648 -1.565 4.148 -3.652c1 -1.391 1.833 -2.783 2.5 -4.174"
        fill="none"
        stroke="white"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoGoogleGemini({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <img
      src={GEMINI_MARK_SRC}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-md object-contain ${className ?? ''}`}
      aria-hidden
    />
  );
}

export function LogoGroq({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#E8958A" />
      <path
        d="M24 10a14 14 0 1 0 9.9 23.9l-3.5-3.5a9 9 0 1 1 0-12.8l3.5-3.5A14 14 0 0 0 24 10zm0 5a9 9 0 0 1 6.4 2.6L27 21a5 5 0 1 0 0 6l3.4 3.4A9 9 0 1 1 24 15z"
        fill="white"
        fillOpacity={0.95}
      />
    </svg>
  );
}

export function LogoMistral({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="8" fill="#E8A882" />
      <rect x="8" y="10" width="10" height="10" fill="#2A2420" opacity={0.85} />
      <rect x="30" y="10" width="10" height="10" fill="#2A2420" opacity={0.85} />
      <rect x="8" y="22" width="10" height="10" fill="#2A2420" opacity={0.85} />
      <rect x="19" y="22" width="10" height="10" fill="#2A2420" opacity={0.85} />
      <rect x="30" y="22" width="10" height="10" fill="#2A2420" opacity={0.85} />
      <rect x="8" y="34" width="10" height="6" fill="#2A2420" opacity={0.85} />
      <rect x="30" y="34" width="10" height="6" fill="#2A2420" opacity={0.85} />
    </svg>
  );
}

export function LogoDeepseek({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#8BAFE0" />
      <path d="M12 24c0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12-12-5.4-12-12zm12-8a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" fill="white" opacity={0.35} />
      <path d="M35 16l-6 6m0 0-5-3m5 3v7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="28" r="3" fill="white" />
    </svg>
  );
}

export function LogoXAI({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <img
      src={XAI_MARK_SRC}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-md object-contain ${className ?? ''}`}
      aria-hidden
    />
  );
}

export function LogoOpenRouter({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#A8B0E8" />
      <path
        d="M14 18h6m-6 0-4 6 4 6h6m-6-6h20m0-6h-6m6 0 4 6-4 6h-6m6-6H14"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoPerplexity({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="8" fill="#8EC9D4" />
      <path d="M24 8v32M14 14l10 10-10 10M34 14l-10 10 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoTavily({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#9BC9DC" />
      <circle cx="21" cy="21" r="8" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M27 27l10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LogoTwilio({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#E8999A" />
      <circle cx="18" cy="24" r="6" fill="white" />
      <circle cx="30" cy="24" r="6" fill="white" />
    </svg>
  );
}

export function LogoSendGrid({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#8BB4E0" />
      <path d="M12 18h24v3H12zm0 9h18v3H12zm0 9h22v3H12z" fill="white" />
    </svg>
  );
}

export function LogoStripe({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#B8B0E8" />
      <path d="M22 32c-4 0-6.5-2-6.5-5.2 0-2.8 1.5-4.4 5.8-5l2.2-.3c2-.3 2.6-.8 2.6-1.8 0-1.2-1.1-1.9-3.1-1.9-2.2 0-3.4.8-3.6 2.4h-4c.2-3.4 2.8-5.4 7.6-5.4 4.4 0 7 2 7 5.2v9.8h-4.2v-2c-1 1.4-2.8 2.2-5.8 2.2zm.4-3.2c2 0 3.4-1 3.4-2.6v-1.2c-.6.4-1.6.7-3 1l-1.8.3c-1.8.3-2.6 1-2.6 2 0 1.2 1 1.9 2.8 1.9z" fill="#2D2640" />
    </svg>
  );
}

export function LogoNotion({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#E8E6E1" />
      <path d="M26 12l10 3v22c0 2-1.5 3.5-3.5 3.5L26 38V12z" fill="#2F2F2F" />
      <path d="M22 12L12 15v22c0 2 1.5 3.5 3.5 3.5l6.5 2V12z" fill="#2F2F2F" opacity={0.75} />
    </svg>
  );
}

export function LogoGitHub({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#C8CCD4" />
      <path
        fill="#24292f"
        d="M24 10c-7.7 0-14 6.3-14 14 0 6.2 4 11.4 9.6 13.3.7.1 1-.3 1-.7v-2.5c-3.9.8-4.7-1.7-4.7-1.7-.6-1.6-1.5-2-1.5-2-1.3-.9.1-.9.1-.9 1.4.1 2.2 1.5 2.2 1.5 1.3 2.2 3.4 1.6 4.2 1.2.1-1 .5-1.6 1-2-3.1-.4-6.3-1.5-6.3-6.8 0-1.5.5-2.7 1.4-3.6-.1-.4-.6-1.8.1-3.7 0 0 1.2-.4 3.8 1.4 1.1-.3 2.2-.5 3.4-.5s2.3.2 3.4.5c2.6-1.8 3.8-1.4 3.8-1.4.7 1.9.3 3.3.1 3.7.9 1 1.4 2.1 1.4 3.6 0 5.3-3.2 6.4-6.3 6.7.5.4 1 1.3 1 2.6v3.9c0 .4.3.9 1 .7 5.5-1.9 9.5-7.1 9.5-13.3 0-7.7-6.3-14-14-14z"
      />
    </svg>
  );
}

export type ApiKeyBrandId =
  | 'anthropic'
  | 'google_ai'
  | 'openai'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'perplexity'
  | 'xai'
  | 'tavily'
  | 'twilio_sid'
  | 'twilio_token'
  | 'sendgrid'
  | 'stripe_secret'
  | 'stripe_pub'
  | 'notion'
  | 'github';

export function ProviderBrandMark({ id, size = 22 }: { id: string; size?: number }) {
  switch (id as ApiKeyBrandId) {
    case 'anthropic':
      return <LogoAnthropicClaude size={size} />;
    case 'google_ai':
      return <LogoGoogleGemini size={size} />;
    case 'openai':
      return <LogoOpenAI size={size} />;
    case 'groq':
      return <LogoGroq size={size} />;
    case 'mistral':
      return <LogoMistral size={size} />;
    case 'openrouter':
      return <LogoOpenRouter size={size} />;
    case 'perplexity':
      return <LogoPerplexity size={size} />;
    case 'xai':
      return <LogoXAI size={size} />;
    case 'tavily':
      return <LogoTavily size={size} />;
    case 'twilio_sid':
    case 'twilio_token':
      return <LogoTwilio size={size} />;
    case 'sendgrid':
      return <LogoSendGrid size={size} />;
    case 'stripe_secret':
    case 'stripe_pub':
      return <LogoStripe size={size} />;
    case 'notion':
      return <LogoNotion size={size} />;
    case 'github':
      return <LogoGitHub size={size} />;
    default:
      return (
        <div
          className="flex items-center justify-center rounded-lg bg-white/10 text-[10px] font-semibold text-white/70"
          style={{ width: size, height: size }}
        >
          ?
        </div>
      );
  }
}

/** Model catalogue uses these display names */
export function ProviderLogo({ provider, size = 20 }: { provider: string; size?: number }) {
  switch (provider) {
    case 'Anthropic':
      return <LogoAnthropicClaude size={size} />;
    case 'OpenAI':
      return <LogoOpenAI size={size} />;
    case 'Google':
      return <LogoGoogleGemini size={size} />;
    case 'Meta':
      return <LogoMeta size={size} />;
    case 'Groq':
      return <LogoGroq size={size} />;
    case 'Mistral':
      return <LogoMistral size={size} />;
    case 'Deepseek':
      return <LogoDeepseek size={size} />;
    case 'xAI':
      return <LogoXAI size={size} />;
    case 'OpenRouter':
      return <LogoOpenRouter size={size} />;
    case 'Perplexity':
      return <LogoPerplexity size={size} />;
    default:
      return (
        <div
          className="flex items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/50"
          style={{ width: size, height: size }}
        >
          {provider[0]}
        </div>
      );
  }
}
