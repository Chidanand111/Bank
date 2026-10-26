import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingExcludes: {
    '*': [
      'tests/**',
      'scripts/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      'node_modules/@swc/**',
      'node_modules/esbuild/**',
      'node_modules/vitest/**',
      'node_modules/typescript/**',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/media/:path*',
      },
    ];
  },
};

export default nextConfig;
