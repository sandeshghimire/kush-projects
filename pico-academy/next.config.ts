import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['pabi'],
  serverExternalPackages: ['better-sqlite3'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
