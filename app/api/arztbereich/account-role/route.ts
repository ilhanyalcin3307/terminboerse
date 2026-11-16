import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type AccountRoleBody = {
  accessToken?: string;
};

function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey) {
    throw new Error("Supabase ist nicht vollständig konfiguriert.");
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccountRoleBody;
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Sitzung fehlt." }, { status: 400 });
    }

    const supabase = createSupabasePublicClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: "Sitzung ungültig." }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: account, error: accountError } = await supabaseAdmin
      .from("arzt_accounts")
      .select("role, is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle<{ role: "admin" | "doctor"; is_active: boolean }>();

    if (accountError) {
      throw new Error(accountError.message);
    }

    return NextResponse.json({
      ok: true,
      role: account?.is_active ? account.role : null,
    });
  } catch (error) {
    console.error("/api/arztbereich/account-role failed", error);
    return NextResponse.json({ ok: false, error: "Kontorolle konnte nicht geladen werden." }, { status: 500 });
  }
}