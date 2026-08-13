import { NextResponse } from "next/server";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { removeGoogleCalendarConnection } from "@/lib/googleCalendarConnectionStore";
import { upsertSchedulingStatusEntry } from "@/lib/arztbereichSchedulingStore";

type DisconnectBody = {
  token?: string;
  doctorId?: string;
};

function resolveDoctorId(session: { role: "admin" | "doctor"; doctorIds: string[] }, doctorIdFromBody: string) {
  if (session.role === "doctor") {
    return session.doctorIds[0] ?? "";
  }
  return doctorIdFromBody;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DisconnectBody;
    const token = typeof body.token === "string" ? body.token : "";
    const doctorIdFromBody = typeof body.doctorId === "string" ? body.doctorId.trim() : "";

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

    await removeGoogleCalendarConnection(doctorId);
    await upsertSchedulingStatusEntry(doctorId, {
      calendarConnected: false,
      calendarId: "",
      schedulingEnabled: false,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/arztbereich/google-calendar/disconnect failed", error);
    return NextResponse.json({ ok: false, error: "Google Kalender Verbindung konnte nicht getrennt werden." }, { status: 500 });
  }
}
