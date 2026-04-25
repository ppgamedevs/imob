import { NextResponse } from "next/server";

const GONE = {
  error: "deprecated_checkout_endpoint",
  message:
    "Report unlock checkout moved. Use POST /api/report/{analysisId}/unlock/checkout (replace {analysisId} with the analysis CUID).",
} as const;

/**
 * @deprecated One-time report unlock now uses `POST /api/report/[id]/unlock/checkout` only.
 */
export function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

/**
 * @deprecated
 */
export function GET() {
  return NextResponse.json(GONE, { status: 410 });
}
