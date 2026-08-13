import { NextResponse } from "next/server";
import { upsertSchedulingStatusEntry } from "@/lib/arztbereichSchedulingStore";
import { getPublicDoctorSchedulingStatus } from "@/lib/doctorSchedulingStatus";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";

type SchedulingStatusUpdateBody = {
  token?: string;
  doctorId?: string;
  profileUpdated?: boolean;
  calendarConnected?: boolean;
  calendarId?: string;
  schedulingEnabled?: boolean;
};

function resolveDoctorId(session: { role: "admin" | "doctor"; doctorIds: string[] }, bodyDoctorId: string) {
  if (session.role === "doctor") {
    return session.doctorIds[0] ?? "";
  }
  return bodyDoctorId;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SchedulingStatusUpdateBody;
    const token = typeof body.token === "string" ? body.token : "";
    const bodyDoctorId = typeof body.doctorId === "string" ? body.doctorId.trim() : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token fehlt." }, { status: 400 });
    }

    const session = verifyArztbereichSessionToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Ungültige oder abgelaufene Sitzung." }, { status: 401 });
    }

    const doctorId = resolveDoctorId(session, bodyDoctorId);
    if (!doctorId) {
      return NextResponse.json({ ok: false, error: "doctorId fehlt." }, { status: 400 });
    }

    const patch: {
      profileUpdated?: boolean;
      calendarConnected?: boolean;
      calendarId?: string;
      schedulingEnabled?: boolean;
    } = {};

    if (typeof body.profileUpdated === "boolean") {
      patch.profileUpdated = body.profileUpdated;
    }
    if (typeof body.calendarConnected === "boolean") {
      patch.calendarConnected = body.calendarConnected;
    }
    if (typeof body.calendarId === "string") {
      patch.calendarId = body.calendarId;
    }
    if (typeof body.schedulingEnabled === "boolean") {
      patch.schedulingEnabled = body.schedulingEnabled;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Keine Statusänderung übermittelt." }, { status: 400 });
    }

    await upsertSchedulingStatusEntry(doctorId, patch);
    const status = await getPublicDoctorSchedulingStatus(doctorId);

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("/api/arztbereich/scheduling-status/update failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler beim Speichern des Terminstatus." }, { status: 500 });
  }
}
