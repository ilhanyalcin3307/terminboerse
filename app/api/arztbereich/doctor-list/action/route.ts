import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { deleteCustomDoctorProfile, getCustomProfiles, setDoctorProfileVisibility } from "@/lib/arztbereichAdminStore";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { findDoctorById, normalizeDoctorsData } from "@/lib/doctors";

type DoctorActionBody = {
  token?: string;
  doctorId?: string;
  action?: "hide" | "restore" | "delete";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DoctorActionBody;
    const token = typeof body.token === "string" ? body.token : "";
    const doctorId = typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const session = verifyArztbereichSessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }
    if (!doctorId || !body.action) {
      return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
    }

    const customProfiles = await getCustomProfiles();
    const isCustomProfile = customProfiles.some((profile) => profile.id === doctorId);
    const exists = isCustomProfile || Boolean(findDoctorById(normalizeDoctorsData(doctorsJson), doctorId));
    if (!exists) {
      return NextResponse.json({ ok: false, error: "Arztprofil nicht gefunden." }, { status: 404 });
    }

    if (body.action === "delete") {
      if (!isCustomProfile) {
        return NextResponse.json({ ok: false, error: "OGD-Profile können nur ausgeblendet werden." }, { status: 400 });
      }
      await deleteCustomDoctorProfile(doctorId);
    } else {
      await setDoctorProfileVisibility({ doctorId, hidden: body.action === "hide", adminEmail: session.email });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/arztbereich/doctor-list/action failed", error);
    const message = error instanceof Error ? error.message : "Aktion konnte nicht ausgeführt werden.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}