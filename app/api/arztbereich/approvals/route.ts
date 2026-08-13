import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { listPendingRegistrations } from "@/lib/arztbereichAdminStore";
import { getCustomProfiles } from "@/lib/arztbereichAdminStore";
import { normalizeDoctorsData } from "@/lib/doctors";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";

type ListBody = {
  token?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ListBody;
    const token = typeof body.token === "string" ? body.token : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token fehlt." }, { status: 400 });
    }

    const session = verifyArztbereichSessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const requests = await listPendingRegistrations();
    const allDoctors = [...normalizeDoctorsData(doctorsJson), ...(await getCustomProfiles())];
    const doctorNameById = new Map(allDoctors.map((doctor) => [doctor.id, doctor.name]));

    const enrichedRequests = requests.map((item) => ({
      ...item,
      selectedDoctorName: item.selectedDoctorId ? doctorNameById.get(item.selectedDoctorId) : undefined,
      approvedDoctorName: item.approvedDoctorId ? doctorNameById.get(item.approvedDoctorId) : undefined,
    }));

    return NextResponse.json({ ok: true, requests: enrichedRequests });
  } catch (error) {
    console.error("/api/arztbereich/approvals failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler beim Laden der Freigaben." }, { status: 500 });
  }
}
