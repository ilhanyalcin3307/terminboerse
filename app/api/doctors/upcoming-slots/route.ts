import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { mergeDoctorProfiles, normalizeDoctorsData } from "@/lib/doctors";
import { getUpcomingDoctorSlots } from "@/lib/upcomingDoctorSlots";

export async function GET() {
  try {
    const [customProfiles, hiddenDoctorIds] = await Promise.all([getCustomProfiles(), getHiddenDoctorIds()]);
    const doctors = mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles).filter(
      (doctor) => !hiddenDoctorIds.has(doctor.id),
    );
    const items = await getUpcomingDoctorSlots(doctors);

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Slots konnten nicht geladen werden.",
      },
      { status: 500 },
    );
  }
}
