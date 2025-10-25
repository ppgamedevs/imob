import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

interface OgOptions {
  /** Brand accent color (hex) */
  brand?: string;
  /** Brand logo URL */
  logo?: string;
  /** Title suffix (e.g., "powered by Agency") */
  titleSuffix?: string;
}

/**
 * renderOg - Shared Open Graph image renderer
 *
 * Creates consistent 1200x630 OG images with:
 * - Dark gradient background
 * - Brand color accents
 * - Optional logo
 * - Automatic footer with branding
 *
 * Usage:
 * return renderOg(<YourContent />, { brand: "#6A1B9A", logo: "..." })
 */
export function renderOg(children: React.ReactNode, options: OgOptions = {}) {
  const brandColor = options.brand || "#2563eb"; // default blue
  const footerText = options.titleSuffix || "imob.ro — insight engine";

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b0f1a 0%, #101828 50%, #0b0f1a 100%)",
          color: "white",
          padding: 48,
          fontSize: 28,
          fontWeight: 600,
          position: "relative",
        }}
      >
        {/* Content */}
        {children}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 48,
            right: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            opacity: 0.8,
          }}
        >
          <span>{footerText}</span>
          {options.logo && (
            <img src={options.logo} width={100} height={32} style={{ objectFit: "contain" }} />
          )}
        </div>

        {/* Brand accent (optional decorative element) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 200,
            height: 200,
            background: `radial-gradient(circle at center, ${brandColor}40 0%, transparent 70%)`,
            opacity: 0.3,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
