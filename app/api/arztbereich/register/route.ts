import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createPendingRegistration } from "@/lib/arztbereichAdminStore";

type RegisterBody = {
  registrationType?: "existing" | "new";
  selectedDoctorId?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  specialty?: string;
  clinicAddress?: string;
  district?: string;
  providerType?: "OEGK" | "Wahlarzt" | "Privat";
  note?: string;
  password?: string;
  authUserId?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    const body = (await request.json()) as RegisterBody;
    const registrationType = body.registrationType === "new" ? "new" : "existing";
    const selectedDoctorId = typeof body.selectedDoctorId === "string" ? body.selectedDoctorId.trim() : "";

    const doctorName = typeof body.doctorName === "string" ? body.doctorName.trim() : "";
    const doctorEmail = typeof body.doctorEmail === "string" ? normalizeEmail(body.doctorEmail) : "";
    const doctorPhone = typeof body.doctorPhone === "string" ? body.doctorPhone.trim() : "";
    const specialty = typeof body.specialty === "string" ? body.specialty.trim() : "";
    const clinicAddress = typeof body.clinicAddress === "string" ? body.clinicAddress.trim() : "";
    const district = typeof body.district === "string" ? body.district.trim() : "";
    const providerType = body.providerType === "Wahlarzt" || body.providerType === "Privat" ? body.providerType : "OEGK";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const authUserIdFromBody = typeof body.authUserId === "string" ? body.authUserId.trim() : "";
    const hasOAuthIdentity = authUserIdFromBody.length > 0;

    if (!hasOAuthIdentity && (!password || password.length < 8)) {
      return NextResponse.json({ ok: false, error: "Bitte ein Passwort mit mindestens 8 Zeichen angeben." }, { status: 400 });
    }

    if (!doctorEmail || !doctorPhone) {
      return NextResponse.json({ ok: false, error: "Bitte fülle alle Pflichtfelder aus." }, { status: 400 });
    }

    if (registrationType === "existing" && !selectedDoctorId) {
      return NextResponse.json({ ok: false, error: "Bitte ein vorhandenes Profil auswählen." }, { status: 400 });
    }

    if (registrationType === "new" && (!doctorName || !specialty || !clinicAddress || !district)) {
      return NextResponse.json({ ok: false, error: "Für ein neues Profil bitte alle Profildaten ausfüllen." }, { status: 400 });
    }

    const passwordSha256 = hasOAuthIdentity
      ? createHash("sha256").update(`oauth:${authUserIdFromBody}`).digest("hex")
      : createHash("sha256").update(password).digest("hex");

    let authUserId = authUserIdFromBody;

    if (!authUserId) {
      const supabase = createSupabasePublicClient();
      const authAttempt = await supabase.auth.signInWithPassword({ email: doctorEmail, password });

      authUserId = authAttempt.data.user?.id ?? "";

      if (authAttempt.error || !authUserId) {
        const signUpAttempt = await supabase.auth.signUp({
          email: doctorEmail,
          password,
          options: {
            data: {
              role_hint: "doctor",
            },
          },
        });

        authUserId = signUpAttempt.data.user?.id ?? "";

        if (signUpAttempt.error || !authUserId) {
          return NextResponse.json(
            {
              ok: false,
              error: "Konto konnte nicht erstellt werden. Bitte prüfe E-Mail/Passwort oder versuche es später erneut.",
            },
            { status: 400 },
          );
        }
      }
    }

    const adminEmail = process.env.ARZTBEREICH_ADMIN_EMAIL ?? "kontakt@terminboerse.at";
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Terminbörse <onboarding@resend.dev>";

    const requestItem = await createPendingRegistration({
      registrationType,
      ...(selectedDoctorId ? { selectedDoctorId } : {}),
      ...(doctorName ? { doctorName } : {}),
      doctorEmail,
      doctorPhone,
      ...(specialty ? { specialty } : {}),
      ...(clinicAddress ? { clinicAddress } : {}),
      ...(district ? { district } : {}),
      providerType,
      ...(note ? { note } : {}),
      passwordSha256,
      authUserId,
    });

    const accountSnippet =
      registrationType === "existing"
        ? JSON.stringify(
            [
              {
                email: doctorEmail,
                doctorIds: [selectedDoctorId],
                passwordSha256,
                isActive: true,
              },
            ],
            null,
            2,
          )
        : JSON.stringify(
            [
              {
                email: doctorEmail,
                doctorIds: [`custom-${requestItem.id}`],
                passwordSha256,
                isActive: true,
              },
            ],
            null,
            2,
          );

    const subject = `Neue Arztbereich Registrierung: ${doctorName || doctorEmail}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px;">Neue Arztbereich Registrierung</h2>
        <p>Es ist eine neue Anfrage zur Freischaltung eingegangen.</p>
        <p><strong>Anfrage-ID:</strong> ${escapeHtml(requestItem.id)}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin: 16px 0;">
          <p><strong>Typ:</strong> ${registrationType === "existing" ? "Bestehendes Profil" : "Neues Profil"}</p>
          <p><strong>Profil-ID (bei bestehendem Profil):</strong> ${escapeHtml(selectedDoctorId || "-")}</p>
          <p><strong>Name:</strong> ${escapeHtml(doctorName)}</p>
          <p><strong>E-Mail:</strong> ${escapeHtml(doctorEmail)}</p>
          <p><strong>Telefon:</strong> ${escapeHtml(doctorPhone)}</p>
          <p><strong>Fachbereich:</strong> ${escapeHtml(specialty)}</p>
          <p><strong>Bezirk:</strong> ${escapeHtml(district || "-")}</p>
          <p><strong>Versicherungsmodell:</strong> ${escapeHtml(providerType)}</p>
          <p><strong>Ordinationsadresse:</strong> ${escapeHtml(clinicAddress)}</p>
          <p><strong>Nachricht:</strong> ${escapeHtml(note || "Keine zusätzliche Nachricht")}</p>
        </div>
        <p>Diese Anfrage kann jetzt direkt im Admin-Bereich unter <strong>Freischaltungen</strong> mit "Freigeben / Ablehnen" bearbeitet werden.</p>
        <p><strong>Fallback (manuell) - ARZTBEREICH_DOCTOR_ACCOUNTS_JSON</strong> Eintrag:</p>
        <pre style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:10px;overflow:auto;">${escapeHtml(accountSnippet)}</pre>
        <p>Nur falls Admin-Workflow nicht genutzt wird: Eintrag in <strong>ARZTBEREICH_DOCTOR_ACCOUNTS_JSON</strong> übernehmen und Deploy auslösen.</p>
      </div>
    `;

    if (!process.env.RESEND_API_KEY) {
      console.log("[Simulated registration email]", {
        requestId: requestItem.id,
        adminEmail,
        registrationType,
        selectedDoctorId,
        doctorName,
        doctorEmail,
        doctorPhone,
        specialty,
        district,
        providerType,
        clinicAddress,
        passwordSha256,
      });
      return NextResponse.json({ ok: true, simulated: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      replyTo: doctorEmail,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("/api/arztbereich/register failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler bei der Registrierung." }, { status: 500 });
  }
}
