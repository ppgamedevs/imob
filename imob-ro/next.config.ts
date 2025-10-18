import type { NextConfig } from "next";

const raw = process.env.NEXT_PUBLIC_IMAGE_DOMAINS ?? "";
const envDomains = raw
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    // allow configuring external image domains at build time via
    // NEXT_PUBLIC_IMAGE_DOMAINS="domain1.com,images.unsplash.com"
    domains: envDomains.length ? envDomains : ["images.unsplash.com"],
  },
};

export default nextConfig;
