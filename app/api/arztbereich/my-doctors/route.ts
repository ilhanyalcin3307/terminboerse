import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles } from "@/lib/arztbereichAdminStore";
import { normalizeDoctorsData } from "@/lib/doctors";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";

type MyDoctorsBody = {
  token?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MyDoctorsBody;
    const token = typeof body.token === "string" ? body.token : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token fehlt." }, { status: 400 });
    }

    const session = verifyArztbereichSessionToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Ungültige oder abgelaufene Sitzung." }, { status: 401 });
    }

    const allDoctors = [...normalizeDoctorsData(doctorsJson), ...(await getCustomProfiles())];
    const primaryDoctorId = session.doctorIds[0] ?? "";
    const doctors = (session.role === "admin" ? [] : allDoctors.filter((doctor) => doctor.id === primaryDoctorId)).map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        district: doctor.district,
        address: doctor.address,
        providerType: doctor.providerType,
        phone: doctor.phone,
        email: doctor.email,
        website: doctor.website,
      }));

    return NextResponse.json({
      ok: true,
      session: {
        email: session.email,
        role: session.role,
        expiresAt: session.expiresAt,
      },
      doctors,
    });
  } catch (error) {
    console.error("/api/arztbereich/my-doctors failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler beim Laden der Profile." }, { status: 500 });
  }
}
