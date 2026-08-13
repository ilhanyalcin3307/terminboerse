import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { createClient } from "@supabase/supabase-js";
import { getCustomProfiles } from "@/lib/arztbereichAdminStore";
import { normalizeDoctorsData } from "@/lib/doctors";
import { createArztbereichSessionToken } from "@/lib/arztbereichSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type LoginBody = {
  email?: string;
  password?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    const body = (await request.json()) as LoginBody;
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "E-Mail und Passwort sind erforderlich." }, { status: 400 });
    }

    const supabase = createSupabasePublicClient();
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: "Ungültige Zugangsdaten." }, { status: 401 });
    }

    const allDoctors = [...normalizeDoctorsData(doctorsJson), ...(await getCustomProfiles())];
    const allDoctorIds = allDoctors.map((doctor) => doctor.id);

    const normalizedUserEmail = normalizeEmail(authData.user.email ?? email);
    const configuredAdminEmail = normalizeEmail(process.env.ARZTBEREICH_ADMIN_EMAIL ?? "kontakt@terminboerse.at");

    let { data: account, error: accountError } = await supabaseAdmin
      .from("arzt_accounts")
      .select("id, email, role, is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle<{ id: string; email: string; role: "admin" | "doctor"; is_active: boolean }>();

    if (accountError) {
      throw new Error(accountError.message);
    }

    if (!account) {
      const { data: accountByEmail, error: accountByEmailError } = await supabaseAdmin
        .from("arzt_accounts")
        .select("id, email, role, is_active")
        .eq("email", normalizedUserEmail)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; email: string; role: "admin" | "doctor"; is_active: boolean }>();

      if (accountByEmailError) {
        throw new Error(accountByEmailError.message);
      }

      if (accountByEmail) {
        const { data: healedAccount, error: healError } = await supabaseAdmin
          .from("arzt_accounts")
          .update({ user_id: authData.user.id, updated_at: new Date().toISOString() })
          .eq("id", accountByEmail.id)
          .select("id, email, role, is_active")
          .single<{ id: string; email: string; role: "admin" | "doctor"; is_active: boolean }>();

        if (healError || !healedAccount) {
          throw new Error(healError?.message ?? "Kontozuordnung konnte nicht aktualisiert werden.");
        }

        account = healedAccount;
      }
    }

    if (!account && normalizedUserEmail === configuredAdminEmail) {
      const { data: seededAdmin, error: seededAdminError } = await supabaseAdmin
        .from("arzt_accounts")
        .upsert(
          {
            user_id: authData.user.id,
            email: configuredAdminEmail,
            role: "admin",
            is_active: true,
          },
          { onConflict: "user_id" },
        )
        .select("id, email, role, is_active")
        .single<{ id: string; email: string; role: "admin" | "doctor"; is_active: boolean }>();

      if (seededAdminError || !seededAdmin) {
        throw new Error(seededAdminError?.message ?? "Adminkonto konnte nicht angelegt werden.");
      }

      account = seededAdmin;
    }

    if (!account || !account.is_active) {
      return NextResponse.json({ ok: false, error: "Konto ist nicht freigeschaltet." }, { status: 403 });
    }

    if (account.role === "admin") {
      const sessionPayload = {
        email: normalizeEmail(account.email),
        role: "admin" as const,
        doctorIds: [],
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      };
      return NextResponse.json({ ok: true, token: createArztbereichSessionToken(sessionPayload), session: sessionPayload });
    }

    const { data: links, error: linksError } = await supabaseAdmin
      .from("arzt_account_doctors")
      .select("doctor_id")
      .eq("arzt_account_id", account.id);

    if (linksError) {
      throw new Error(linksError.message);
    }

    const doctorIds = (links ?? [])
      .map((entry) => String(entry.doctor_id))
      .filter((id) => allDoctorIds.includes(id));

    if (doctorIds.length === 0) {
      return NextResponse.json({ ok: false, error: "Kein gültiges Arztprofil zugeordnet." }, { status: 403 });
    }

    const sessionPayload = {
      email,
      role: "doctor" as const,
      doctorIds,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    };

    return NextResponse.json({
      ok: true,
      token: createArztbereichSessionToken(sessionPayload),
      session: sessionPayload,
    });
  } catch (error) {
    console.error("/api/arztbereich/login failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler beim Login." }, { status: 500 });
  }
}
