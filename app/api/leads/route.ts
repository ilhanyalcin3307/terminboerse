import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[Mock API] Neuer Lead:", body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Mock API] Fehler beim Verarbeiten des Leads", error);
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
}
