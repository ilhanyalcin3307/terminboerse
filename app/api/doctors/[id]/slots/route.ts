import { NextResponse } from "next/server";
import { getDoctorAvailableSlots } from "@/lib/googleCalendarAvailability";
import { getPublicDoctorSchedulingStatus } from "@/lib/doctorSchedulingStatus";
import { reserveManualDoctorSlot } from "@/lib/manualDoctorSlots";

type Context = {
  params: Promise<{ id: string }>;
};

type BookSlotBody = {
  slotId?: string;
};

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const doctorId = decodeURIComponent(params.id ?? "").trim();

    if (!doctorId) {
      return NextResponse.json({ ok: false, error: "doctorId fehlt." }, { status: 400 });
    }

    const result = await getDoctorAvailableSlots(doctorId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("/api/doctors/[id]/slots failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler beim Laden der Slots." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const params = await context.params;
    const doctorId = decodeURIComponent(params.id ?? "").trim();

    if (!doctorId) {
      return NextResponse.json({ ok: false, error: "doctorId fehlt." }, { status: 400 });
    }

    const body = (await request.json()) as BookSlotBody;
    const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
    if (!slotId) {
      return NextResponse.json({ ok: false, error: "slotId fehlt." }, { status: 400 });
    }

    const status = await getPublicDoctorSchedulingStatus(doctorId);
    if (!status.canBookOnline) {
      return NextResponse.json({ ok: false, error: "Online-Buchung ist aktuell nicht aktiv." }, { status: 403 });
    }

    const reserved = await reserveManualDoctorSlot(doctorId, slotId);
    if (!reserved) {
      return NextResponse.json(
        { ok: false, error: "Dieser Slot ist nicht mehr verfügbar." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      slot: {
        id: reserved.id,
        start: reserved.start,
        end: reserved.end,
        status: reserved.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Slot konnte nicht gebucht werden.",
      },
      { status: 500 },
    );
  }
}
