import { NextRequest, NextResponse } from "next/server";
import { getAgentFullByToken } from "@/lib/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const full = await getAgentFullByToken(token);
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(full);
}
