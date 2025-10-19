import { ImageResponse } from "next/og";

export const runtime = "edge";

export default async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address") || "Adresă necunoscută";
    const price = url.searchParams.get("price") || "—";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 48,
            background: "linear-gradient(135deg,#0f172a 0%,#111827 100%)",
            color: "white",
            fontFamily:
              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>imob.ro</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, opacity: 0.9 }}>Raport</div>
              <div style={{ fontSize: 18, opacity: 0.7 }}>{params.id}</div>
            </div>
          </div>

          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{price}</div>
            <div style={{ marginTop: 8, fontSize: 28 }}>{address}</div>
          </div>

          <div style={{ position: "absolute", bottom: 28, left: 48, fontSize: 14, opacity: 0.8 }}>
            estimări automate • nu constituie consultanță
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (err) {
    console.error(err);
    return new Response("", { status: 500 });
  }
}
