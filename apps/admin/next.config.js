/**
 * Purpose: Next.js build config for the internal admin console.
 * Security: Strict CSP, no framing, disabled powered-by header. This app
 * must never be reachable on the same public hostname as the scanner
 * portal — see docs/DEPLOYMENT.md.
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
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
