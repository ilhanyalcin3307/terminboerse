import { NextResponse } from "next/server";
import { Resend } from "resend";
import doctorsJson from "@/data/doctors.json";
import { findDoctorById, normalizeDoctorsData } from "@/lib/doctors";

type LeadBody = {
  doctorId?: string;
  source?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  note?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadBody;
    const doctors = normalizeDoctorsData(doctorsJson);
    const doctor = body.doctorId ? findDoctorById(doctors, body.doctorId) : undefined;

    if (!doctor || !body.patientName || !body.patientEmail || !body.patientPhone) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.terminboerse.at";
    const fallbackEmail = process.env.LEAD_FALLBACK_EMAIL ?? "kontakt@terminboerse.at";
    const recipient = doctor.email ?? fallbackEmail;
    const claimUrl = `${siteUrl}/arzt/${encodeURIComponent(doctor.id)}?claim=true`;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Terminbörse <onboarding@resend.dev>";

    const subject = `Neue Termin-Anfrage für ${doctor.name} über Terminbörse.at`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px;">Neue Termin-Anfrage über Terminbörse.at</h2>
        <p>Sehr geehrte/r Frau/Herr Dr. ${doctor.name},</p>
        <p>ein Patient möchte einen Termin über Terminbörse.at anfragen.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin: 20px 0;">
          <p><strong>Name:</strong> ${body.patientName}</p>
          <p><strong>E-Mail:</strong> ${body.patientEmail}</p>
          <p><strong>Telefon:</strong> ${body.patientPhone}</p>
          <p><strong>Fachbereich:</strong> ${doctor.specialty}</p>
          <p><strong>Standort:</strong> ${doctor.address}</p>
          <p><strong>Notiz:</strong> ${body.note?.trim() ? body.note : "Keine zusätzliche Notiz"}</p>
        </div>
        <p>Sie können dem Patienten direkt antworten oder Ihr Profil auf Terminbörse.at kostenlos beanspruchen.</p>
        <p style="margin: 24px 0;">
          <a href="${claimUrl}" style="display: inline-block; background: #0284c7; color: white; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: bold;">
            Profil jetzt beanspruchen
          </a>
        </p>
        <p style="font-size: 14px; color: #475569;">Quelle: ${body.source ?? "unbekannt"}</p>
      </div>
    `;

    if (!process.env.RESEND_API_KEY) {
      console.log("[Simulated lead email]", { recipient, subject, claimUrl, doctor: doctor.id });
      return NextResponse.json({ ok: true, simulated: true, recipient });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      replyTo: body.patientEmail,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, result, recipient });
  } catch (error) {
    console.error("/api/lead failed", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}