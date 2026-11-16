import { NextResponse } from "next/server";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type AccountStatusBody = {
  token?: string;
  accountId?: string;
  isActive?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccountStatusBody;
    const token = typeof body.token === "string" ? body.token : "";
    const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
    const session = verifyArztbereichSessionToken(token);

    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    if (!accountId || typeof body.isActive !== "boolean") {
      return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("arzt_accounts").update({ is_active: body.isActive }).eq("id", accountId).eq("role", "doctor");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/arztbereich/managed-profiles/status failed", error);
    const message = error instanceof Error ? error.message : "Kontostatus konnte nicht gespeichert werden.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}