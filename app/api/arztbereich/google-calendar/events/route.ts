import { NextResponse } from "next/server";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/googleCalendarEvents";

type ManagedAppointmentPayload = {
  id?: string;
  patientName?: string;
  startsAt?: string;
  endsAt?: string;
  type?: string;
  status?: "confirmed" | "pending" | "blocked";
  note?: string;
  googleEventId?: string;
};

type SyncBody = {
  token?: string;
  doctorId?: string;
  action?: "create" | "update" | "delete";
  appointment?: ManagedAppointmentPayload;
  googleEventId?: string;
};

function resolveDoctorId(session: { role: "admin" | "doctor"; doctorIds: string[] }, bodyDoctorId: string) {
  if (session.role === "doctor") {
    return session.doctorIds[0] ?? "";
  }
  return bodyDoctorId;
}

function isValidAppointment(appointment: ManagedAppointmentPayload) {
  return (
    typeof appointment.id === "string" &&
    typeof appointment.patientName === "string" &&
    typeof appointment.startsAt === "string" &&
    typeof appointment.endsAt === "string" &&
    typeof appointment.type === "string" &&
    (appointment.status === "confirmed" || appointment.status === "pending" || appointment.status === "blocked")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncBody;
    const token = typeof body.token === "string" ? body.token : "";
    const bodyDoctorId = typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const action = body.action;

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

    if (action !== "create" && action !== "update" && action !== "delete") {
      return NextResponse.json({ ok: false, error: "Ungültige Aktion." }, { status: 400 });
    }

    if (action === "delete") {
      const eventId =
        typeof body.googleEventId === "string" && body.googleEventId.trim()
          ? body.googleEventId.trim()
          : typeof body.appointment?.googleEventId === "string"
            ? body.appointment.googleEventId.trim()
            : "";

      if (!eventId) {
        return NextResponse.json({ ok: false, error: "googleEventId fehlt für Löschung." }, { status: 400 });
      }

      await deleteGoogleCalendarEvent(doctorId, eventId);
      return NextResponse.json({ ok: true });
    }

    const appointment = body.appointment;
    if (!appointment || !isValidAppointment(appointment)) {
      return NextResponse.json({ ok: false, error: "Ungültige Termin-Daten." }, { status: 400 });
    }

    const normalizedAppointment = {
      id: appointment.id,
      patientName: appointment.patientName,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      type: appointment.type,
      status: appointment.status,
      note: appointment.note,
      googleEventId: appointment.googleEventId,
    } as {
      id: string;
      patientName: string;
      startsAt: string;
      endsAt: string;
      type: string;
      status: "confirmed" | "pending" | "blocked";
      note?: string;
      googleEventId?: string;
    };

    if (action === "create") {
      const googleEventId = await createGoogleCalendarEvent(doctorId, normalizedAppointment);

      return NextResponse.json({ ok: true, googleEventId });
    }

    await updateGoogleCalendarEvent(doctorId, normalizedAppointment);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/arztbereich/google-calendar/events failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Google Kalender Sync fehlgeschlagen.",
      },
      { status: 500 },
    );
  }
}
