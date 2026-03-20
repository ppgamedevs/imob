import type { NextConfig } from "next";

const raw = process.env.NEXT_PUBLIC_IMAGE_DOMAINS ?? "";
const envDomains = raw
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    domains: envDomains.length ? envDomains : ["images.unsplash.com"],
  },
};

export default nextConfig;
