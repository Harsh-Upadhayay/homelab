import { NextResponse } from "next/server";

import { getOverview } from "@/lib/overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overview = await getOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to build overview",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
