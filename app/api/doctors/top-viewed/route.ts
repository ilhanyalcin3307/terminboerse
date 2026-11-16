import { NextResponse } from "next/server";

import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { getTopViewedDoctorIds } from "@/lib/doctorCommunity";
import { getDoctorSeoSlug, mergeDoctorProfiles, normalizeDoctorsData } from "@/lib/doctors";

export async function GET() {
  try {
    const [customProfiles, hiddenDoctorIds, rankedDoctorIds] = await Promise.all([
      getCustomProfiles(),
      getHiddenDoctorIds(),
      getTopViewedDoctorIds(5),
    ]);
    const doctorsById = new Map(
      mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles).map((doctor) => [doctor.id, doctor]),
    );
    const items = rankedDoctorIds
      .map((entry) => {
        const doctor = doctorsById.get(entry.doctorId);
        if (!doctor || hiddenDoctorIds.has(doctor.id)) {
          return null;
        }
        return {
          doctorId: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          district: doctor.district,
          slug: getDoctorSeoSlug(doctor),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    console.error("/api/doctors/top-viewed failed", error);
    return NextResponse.json({ ok: false, items: [] }, { status: 500 });
  }
}
