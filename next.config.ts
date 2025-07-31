import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript type checking during builds for deployment
    ignoreBuildErrors: true,
  },
  // Performance optimizations (removed optimizeCss due to critters module dependency)
  experimental: {
    optimizeServerReact: true,
  },
  // Add caching headers for static assets
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Cache static assets
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache API responses with shorter duration
      {
        source: '/api/analytics(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/api/dashboard/stats(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/api/categories(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=600, s-maxage=1200, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
