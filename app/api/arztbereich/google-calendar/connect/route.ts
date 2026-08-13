import { NextResponse } from "next/server";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { buildGoogleCalendarOAuthUrl } from "@/lib/googleCalendarOAuth";

type ConnectBody = {
  token?: string;
  doctorId?: string;
  calendarId?: string;
};

function resolveDoctorId(session: { role: "admin" | "doctor"; doctorIds: string[] }, doctorIdFromBody: string) {
  if (session.role === "doctor") {
    return session.doctorIds[0] ?? "";
  }
  return doctorIdFromBody;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConnectBody;
    const token = typeof body.token === "string" ? body.token : "";
    const doctorIdFromBody = typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const calendarId = typeof body.calendarId === "string" ? body.calendarId.trim() : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token fehlt." }, { status: 400 });
    }

    const session = verifyArztbereichSessionToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Ungültige oder abgelaufene Sitzung." }, { status: 401 });
    }

    const doctorId = resolveDoctorId(session, doctorIdFromBody);
    if (!doctorId) {
      return NextResponse.json({ ok: false, error: "doctorId fehlt." }, { status: 400 });
    }

    const url = buildGoogleCalendarOAuthUrl({ doctorId, email: session.email, calendarIdHint: calendarId });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("/api/arztbereich/google-calendar/connect failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Google Kalender Verbindung konnte nicht gestartet werden.",
      },
      { status: 500 },
    );
  }
}
