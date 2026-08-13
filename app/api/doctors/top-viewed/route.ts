import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getTopViewedDoctorIds } from "@/lib/doctorCommunity";
import { normalizeDoctorsData } from "@/lib/doctors";

const doctors = normalizeDoctorsData(doctorsJson);
const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
const LIMIT = 5;

export async function GET() {
  try {
    const topDoctorIds = await getTopViewedDoctorIds(LIMIT);

    const items = topDoctorIds
      .map((entry) => {
        const doctor = doctorsById.get(entry.doctorId);
        if (!doctor) {
          return null;
        }

        return {
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          district: doctor.district,
          profileViews: entry.profileViews,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Rangliste konnte nicht geladen werden.",
      },
      { status: 500 },
    );
  }
}
