/**
 * Purpose: Next.js build config for the public scanner portal.
 * Security: `poweredByHeader` disabled to avoid revealing framework
 * version. X-Content-Type-Options/X-Frame-Options/Referrer-Policy are
 * static, so they're set here so every response carries them. The
 * Content-Security-Policy is NOT set here — it needs a fresh nonce on
 * every request (see middleware.ts), which this static headers() config
 * can't generate; a static CSP without a nonce blocks Next.js App
 * Router's own required inline hydration scripts, breaking the app
 * silently.
 * Related: middleware.ts, docs/SECURITY.md "Transport & headers".
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
