/**
 * Copilot: Generate a basic OpenGraph image for homepage with title/subtitle using @vercel/og
 * - Export runtime = 'edge'
 * - Export default function that returns ImageResponse with gradient + text
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "imob.ro - Caută, compară și vinde în București";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "80px",
          }}
        >
          <h1
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              color: "white",
              marginBottom: "24px",
              lineHeight: 1.2,
            }}
          >
            imob.ro
          </h1>
          <p
            style={{
              fontSize: "36px",
              color: "rgba(255, 255, 255, 0.9)",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            Caută, compară și vinde în București
          </p>
          <p
            style={{
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.8)",
              marginTop: "16px",
            }}
          >
            Preț estimat • Timp de vânzare • Zone pe înțelesul tău
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
