import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles } from "@/lib/arztbereichAdminStore";
import { normalizeDoctorsData } from "@/lib/doctors";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";

type SearchBody = {
  token?: string;
  query?: string;
  limit?: number;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;
    const token = typeof body.token === "string" ? body.token : "";
    const query = typeof body.query === "string" ? normalizeSearch(body.query) : "";
    const limit = typeof body.limit === "number" ? Math.max(1, Math.min(100, body.limit)) : 25;

    if (query.length < 3) {
      return NextResponse.json({ ok: true, doctors: [] });
    }

    const baseDoctors = normalizeDoctorsData(doctorsJson);
    let scopedDoctors = baseDoctors;

    if (token) {
      const session = verifyArztbereichSessionToken(token);
      if (!session) {
        return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
      }

      const allDoctors = [...baseDoctors, ...(await getCustomProfiles())];
      const primaryDoctorId = session.doctorIds[0] ?? "";
      scopedDoctors = session.role === "admin" ? allDoctors : allDoctors.filter((doctor) => doctor.id === primaryDoctorId);
    }

    const results = scopedDoctors
      .filter((doctor) => {
        const haystack = `${doctor.name} ${doctor.specialty} ${doctor.district} ${doctor.address}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) {
          return aStarts - bStarts;
        }
        return a.name.localeCompare(b.name, "de");
      })
      .slice(0, limit)
      .map((doctor) => ({
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

    return NextResponse.json({ ok: true, doctors: results });
  } catch (error) {
    console.error("/api/arztbereich/search-doctors failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler bei der Suche." }, { status: 500 });
  }
}
