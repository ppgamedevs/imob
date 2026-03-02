import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          borderRadius: "40px",
        }}
      >
        <span
          style={{
            fontSize: "100px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          iI
        </span>
      </div>
    ),
    { ...size },
  );
}
