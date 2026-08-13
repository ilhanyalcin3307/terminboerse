import { NextResponse } from "next/server";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { createManualDoctorSlot, deleteManualDoctorSlot, listPublicManualDoctorSlots } from "@/lib/manualDoctorSlots";

type CreateBody = {
  token?: string;
  doctorId?: string;
  startsAt?: string;
  durationMinutes?: number;
};

type DeleteBody = {
  token?: string;
  doctorId?: string;
  slotId?: string;
};

function resolveDoctorId(session: { role: "admin" | "doctor"; doctorIds: string[] }, bodyDoctorId: string) {
  if (session.role === "doctor") {
    return session.doctorIds[0] ?? "";
  }
  return bodyDoctorId;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";
    const bodyDoctorId = searchParams.get("doctorId")?.trim() ?? "";

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

    const slots = await listPublicManualDoctorSlots(doctorId);

    return NextResponse.json({
      ok: true,
      slots: slots.map((slot) => ({
        id: slot.id,
        start: slot.start,
        end: slot.end,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Slots konnten nicht geladen werden.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBody;
    const token = typeof body.token === "string" ? body.token : "";
    const bodyDoctorId = typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const startsAt = typeof body.startsAt === "string" ? body.startsAt.trim() : "";

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

    if (!startsAt) {
      return NextResponse.json({ ok: false, error: "startsAt fehlt." }, { status: 400 });
    }

    const slot = await createManualDoctorSlot({
      doctorId,
      startsAt,
      durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : undefined,
    });

    return NextResponse.json({
      ok: true,
      slot: {
        id: slot.id,
        start: slot.start,
        end: slot.end,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Slot konnte nicht gespeichert werden.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as DeleteBody;
    const token = typeof body.token === "string" ? body.token : "";
    const bodyDoctorId = typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";

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

    if (!slotId) {
      return NextResponse.json({ ok: false, error: "slotId fehlt." }, { status: 400 });
    }

    await deleteManualDoctorSlot(doctorId, slotId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Slot konnte nicht gelöscht werden.",
      },
      { status: 400 },
    );
  }
}
