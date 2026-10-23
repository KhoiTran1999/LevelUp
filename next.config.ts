import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  logging: {
    browserToTerminal: true
  },
  outputFileTracingIncludes: {
    '/': ['./public/index.html']
  },
  // CRITICAL FOR NEXT.JS 16: Externalize native backend drivers from bundling
  serverExternalPackages: ['ioredis', 'postgres', '@aws-sdk/client-s3'],
  async rewrites() {
    return [
      {
        source: '/:tab(quests|shop|notes|bank|ledger|leaderboard|tracker|admin)',
        destination: '/',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate'
          }
        ]
      },
      {
        source: '/download/:path*',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="levelup-shield.zip"'
          },
          {
            key: 'Content-Type',
            value: 'application/zip'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      },
      {
        source: '/:path*.ps1',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      },
      {
        source: '/:path*.bat',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="install.bat"'
          },
          {
            key: 'Content-Type',
            value: 'application/x-bat'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          }
        ]
      },
      {
        source: '/:all*(png|svg|ico|webp|jpg|jpeg|gif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
