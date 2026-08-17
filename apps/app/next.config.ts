import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@liend/domain", "@liend/config", "@liend/api-client", "@liend/brand"],
}

export default nextConfig
