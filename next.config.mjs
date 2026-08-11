/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'sqlite3'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./sdk_detector.db', './schema.sql'],
    },
  },
};

export default nextConfig;
