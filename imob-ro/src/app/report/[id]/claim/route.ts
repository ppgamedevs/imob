import { NextResponse } from "next/server";

import { claimListing } from "../agent-actions";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const r = await claimListing(id);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
