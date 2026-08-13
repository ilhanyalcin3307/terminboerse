import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, reassignApprovedRegistration } from "@/lib/arztbereichAdminStore";
import { normalizeDoctorsData } from "@/lib/doctors";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";

type ReassignBody = {
  token?: string;
  requestId?: string;
  doctorId?: string;
  reviewNote?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReassignBody;
    const token = typeof body.token === "string" ? body.token : "";
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const doctorId = typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote : "";

    if (!token || !requestId || !doctorId) {
      return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
    }

    const session = verifyArztbereichSessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const allDoctors = [...normalizeDoctorsData(doctorsJson), ...(await getCustomProfiles())];
    const doctorExists = allDoctors.some((doctor) => doctor.id === doctorId);

    if (!doctorExists) {
      return NextResponse.json({ ok: false, error: "Profil-ID nicht gefunden." }, { status: 400 });
    }

    const requestItem = await reassignApprovedRegistration({
      requestId,
      doctorId,
      reviewerEmail: session.email,
      reviewNote,
    });

    return NextResponse.json({ ok: true, request: requestItem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Fehler bei der Zuordnung.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
