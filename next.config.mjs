/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode catches potential issues during development
  reactStrictMode: true,

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
