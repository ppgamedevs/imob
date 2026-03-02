import type { NextConfig } from "next";

const raw = process.env.NEXT_PUBLIC_IMAGE_DOMAINS ?? "";
const envDomains = raw
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    domains: envDomains.length ? envDomains : ["images.unsplash.com"],
  },
  async rewrites() {
    // When NEXT_PUBLIC_API_BASE_URL is set (Vercel production), ALL /api/*
    // requests are proxied to the VPS. This includes NextAuth - the VPS
    // has NEXTAUTH_URL set to the Vercel domain so cookies and OAuth
    // callbacks work correctly through the transparent proxy.
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
