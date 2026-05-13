import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.quivo.site https://js.stripe.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.clerk.com https://*.gravatar.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.quivo.site https://api.anthropic.com https://generativelanguage.googleapis.com https://api.stripe.com https://api.tavily.com https://*.supabase.co wss://*.supabase.co https://*.upstash.io",
              "frame-src 'self' https://*.clerk.com https://clerk.quivo.site https://js.stripe.com https://hooks.stripe.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },

  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: '*.clerk.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },

  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
