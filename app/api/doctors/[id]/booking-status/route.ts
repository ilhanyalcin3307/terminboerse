import { NextResponse } from "next/server";
import { getPublicDoctorSchedulingStatus } from "@/lib/doctorSchedulingStatus";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const doctorId = decodeURIComponent(params.id ?? "").trim();

    if (!doctorId) {
      return NextResponse.json({ ok: false, error: "doctorId fehlt." }, { status: 400 });
    }

    const status = await getPublicDoctorSchedulingStatus(doctorId);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("/api/doctors/[id]/booking-status failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler beim Laden des Buchungsstatus." }, { status: 500 });
  }
}
