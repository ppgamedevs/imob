import type { NextConfig } from "next";

const raw = process.env.NEXT_PUBLIC_IMAGE_DOMAINS ?? "";
const envDomains = raw
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean);

/**
 * Server Actions verifică Host/Origin. Dacă userul e pe www iar app e setat pe apex
 * (sau invers), sau pe domeniu din spatele unui proxy, acțiunea poate fi respinsă fără mesaj util.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
 */
function serverActionAllowedOrigins(): string[] {
  const hosts = new Set<string>(["localhost:3000", "127.0.0.1:3000"]);

  const list = process.env.SERVER_ACTION_ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  list?.forEach((h) => hosts.add(h));

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    "";
  if (site) {
    try {
      const u = new URL(site.includes("://") ? site : `https://${site}`);
      hosts.add(u.host.toLowerCase());
      const h = u.hostname.toLowerCase();
      if (h.startsWith("www.")) {
        hosts.add(h.slice(4));
        hosts.add(`www.${h.slice(4)}`);
      } else {
        hosts.add(h);
        hosts.add(`www.${h}`);
      }
    } catch {
      /* ignore */
    }
  }

  const vercel = process.env.VERCEL_URL?.trim().toLowerCase();
  if (vercel) hosts.add(vercel);

  return [...hosts];
}

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    domains: envDomains.length ? envDomains : ["images.unsplash.com"],
  },
  serverActions: {
    allowedOrigins: serverActionAllowedOrigins(),
  },
};

export default nextConfig;
