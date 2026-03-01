import type { NextConfig } from "next";

const raw = process.env.NEXT_PUBLIC_IMAGE_DOMAINS ?? "";
const envDomains = raw
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: envDomains.length ? envDomains : ["images.unsplash.com"],
  },
  async rewrites() {
    if (!apiBaseUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
