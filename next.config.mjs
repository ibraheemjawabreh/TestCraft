import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // Strict mode catches potential issues during development
  reactStrictMode: true,
  // Useful for verification on machines with limited free disk space.
  webpack(config) {
    if (process.env.TESTCRAFT_NO_BUILD_CACHE === '1') config.cache = false
    return config
  },

  // Allow external images from Google Auth and Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gpqebvkpvdrcqvucbjgr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Security HTTP response headers applied to every route
  async headers() {
    return [
      ...['schema', 'example'].map(file => ({
        source: `/curriculum/${file}.json`,
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Content-Disposition', value: `attachment; filename="curriculum-${file}.json"` },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      })),
      {
        source: '/(.*)',
        headers: [
          // Prevent browsers from sniffing MIME types
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent embedding in iframes (clickjacking protection)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Restrict browser feature usage
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // XSS protection for older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

// Development and production webpack runtimes use different chunk layouts.
// Keep their output separate so a build cannot corrupt a running dev server.
export default function config(phase) {
  return {
    ...nextConfig,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  }
}
