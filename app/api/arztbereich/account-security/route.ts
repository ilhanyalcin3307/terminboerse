import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type AccountSecurityBody = {
  token?: string;
  action?: "change_password" | "change_email" | "send_password_reset" | "admin_send_password_reset";
  currentPassword?: string;
  newPassword?: string;
  newEmail?: string;
  accountId?: string;
  origin?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey) {
    throw new Error("Supabase ist nicht vollständig konfiguriert.");
  }
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccountSecurityBody;
    const token = typeof body.token === "string" ? body.token : "";
    const session = verifyArztbereichSessionToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const requestedAccountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
    const accountQuery = supabaseAdmin
      .from("arzt_accounts")
      .select("id, user_id, email, role, is_active")
      .eq("role", "doctor")
      .eq("is_active", true);
    const { data: account, error: accountError } = await (session.role === "admin" && body.action === "admin_send_password_reset"
      ? accountQuery.eq("id", requestedAccountId)
      : accountQuery.eq("email", normalizeEmail(session.email))
    ).maybeSingle<{ id: string; user_id: string; email: string; role: "doctor"; is_active: boolean }>();
    if (accountError || !account) {
      return NextResponse.json({ ok: false, error: "Aktives Arztkonto nicht gefunden." }, { status: 403 });
    }

    const action = body.action;
    const publicClient = createSupabasePublicClient();
    if (action === "send_password_reset" || action === "admin_send_password_reset") {
      if (action === "admin_send_password_reset" && session.role !== "admin") {
        return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
      }
      const origin = typeof body.origin === "string" && /^https:\/\//.test(body.origin) ? body.origin : "https://www.terminboerse.at";
      const { error } = await publicClient.auth.resetPasswordForEmail(account.email, {
        redirectTo: `${origin}/login?recovery=doctor`,
      });
      if (error) {
        throw new Error(error.message);
      }
      return NextResponse.json({ ok: true });
    }

    if (session.role !== "doctor") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    if (!currentPassword) {
      return NextResponse.json({ ok: false, error: "Aktuelles Passwort fehlt." }, { status: 400 });
    }
    const { error: verifyError } = await publicClient.auth.signInWithPassword({ email: account.email, password: currentPassword });
    if (verifyError) {
      return NextResponse.json({ ok: false, error: "Aktuelles Passwort ist nicht korrekt." }, { status: 400 });
    }

    if (action === "change_password") {
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (newPassword.length < 8) {
        return NextResponse.json({ ok: false, error: "Das neue Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(account.user_id, { password: newPassword });
      if (error) {
        throw new Error(error.message);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "change_email") {
      const newEmail = normalizeEmail(typeof body.newEmail === "string" ? body.newEmail : "");
      if (!newEmail.includes("@")) {
        return NextResponse.json({ ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." }, { status: 400 });
      }
      const { data: updatedUser, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(account.user_id, { email: newEmail });
      if (updateUserError || !updatedUser.user) {
        throw new Error(updateUserError?.message ?? "E-Mail-Adresse konnte nicht geändert werden.");
      }
      const { error: updateAccountError } = await supabaseAdmin
        .from("arzt_accounts")
        .update({ email: newEmail })
        .eq("id", account.id);
      if (updateAccountError) {
        throw new Error(updateAccountError.message);
      }
      return NextResponse.json({ ok: true, email: newEmail });
    }

    return NextResponse.json({ ok: false, error: "Ungültige Aktion." }, { status: 400 });
  } catch (error) {
    console.error("/api/arztbereich/account-security failed", error);
    const message = error instanceof Error ? error.message : "Kontoeinstellung konnte nicht gespeichert werden.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}