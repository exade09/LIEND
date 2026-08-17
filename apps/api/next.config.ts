import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Shared packages ship as TypeScript source and are compiled by the consumer.
  transpilePackages: ["@liend/domain", "@liend/config"],
}

export default nextConfig
