/**
 * Purpose: Next.js build config for the public scanner portal.
 * Security: `poweredByHeader` disabled to avoid revealing framework
 * version; security headers (CSP/HSTS/frame-deny) are set here so every
 * response carries them, not just specific routes.
 * Related: docs/SECURITY.md "Transport & headers".
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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' " + (process.env.NEXT_PUBLIC_API_BASE_URL ?? ''),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
