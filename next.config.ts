import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    // Fix: Next.js 16 detected a stale package-lock.json in the home directory
    // and incorrectly set it as the workspace root. Explicitly setting root here
    // pins resolution to this project folder, fixing the tailwindcss lookup error.
    root: path.resolve(__dirname),
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ── Content Security Policy ──────────────────────────────────────
          // 'unsafe-inline' for scripts is required by Next.js (inline event
          // handlers and hydration). For a stricter setup, migrate to nonces.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-src 'none'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // ── Other security headers ───────────────────────────────────────
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
