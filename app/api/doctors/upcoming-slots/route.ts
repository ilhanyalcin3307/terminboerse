import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getUpcomingManualSlotsByDoctorIds } from "@/lib/manualDoctorSlots";
import { normalizeDoctorsData } from "@/lib/doctors";

const doctors = normalizeDoctorsData(doctorsJson);
const CHUNK_SIZE = 120;

function chunkDoctorIds(ids: string[], size: number) {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

export async function GET() {
  try {
    const slotsByDoctor = new Map<
      string,
      Array<{ id: string; doctorId: string; start: string; end: string; status: "free" | "booked" | "cancelled"; createdAt: string; updatedAt: string }>
    >();

    for (const doctorIdsChunk of chunkDoctorIds(doctors.map((doctor) => doctor.id), CHUNK_SIZE)) {
      const chunkMap = await getUpcomingManualSlotsByDoctorIds(doctorIdsChunk, 3);
      for (const [doctorId, slots] of chunkMap.entries()) {
        slotsByDoctor.set(doctorId, slots);
      }
    }

    const items = doctors
      .map((doctor) => {
        const slots = slotsByDoctor.get(doctor.id) ?? [];
        if (slots.length === 0) {
          return null;
        }

        return {
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          district: doctor.district,
          slots: slots.map((slot) => ({
            id: slot.id,
            start: slot.start,
            end: slot.end,
          })),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 10);

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
