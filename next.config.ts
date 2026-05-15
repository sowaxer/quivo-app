import type { NextConfig } from 'next';

/** Tight baseline CSP; extend connect-src when adding new third-party APIs. */
function contentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    [
      "connect-src 'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.anthropic.com',
      'https://api.openai.com',
      'https://api.stripe.com',
      'https://api.deepseek.com',
      'https://generativelanguage.googleapis.com',
      'https://*.clerk.com',
      'wss://*.clerk.com',
      'https://*.clerk.accounts.dev',
      'wss://*.clerk.accounts.dev',
      'https://clerk-telemetry.com',
      'https://www.googleapis.com',
      'https://gmail.googleapis.com',
      'https://oauth2.googleapis.com',
      'https://accounts.google.com',
      'https://finnhub.io',
      'https://query1.finance.yahoo.com',
      'https://vitals.vercel-insights.com',
    ].join(' '),
    "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com https://accounts.google.com",
    "worker-src 'self' blob:",
    "form-action 'self' https://checkout.stripe.com",
  ];
  if (process.env.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests');
  }
  return directives.join('; ');
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
        ],
      },
    ];
  },

  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: '*.clerk.com' },
      { protocol: 'https', hostname: '*.clerk.dev' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },

  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
