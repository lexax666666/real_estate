import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Enable standalone output for Docker/container deployments
  // This creates a minimal standalone build in .next/standalone
  output: 'standalone',
};

export default nextConfig;
