import path from 'node:path'
import { fileURLToPath } from 'node:url'
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // Strict mode catches potential issues during development
  reactStrictMode: true,

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

export default nextConfig
