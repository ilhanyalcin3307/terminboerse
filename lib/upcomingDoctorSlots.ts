import type { DoctorRecord } from "@/lib/doctors";
import { getUpcomingManualSlots } from "@/lib/manualDoctorSlots";

export type UpcomingDoctorSlotsItem = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  district: string;
  slots: Array<{ id: string; start: string; end: string }>;
};

export async function getUpcomingDoctorSlots(doctors: DoctorRecord[], limit = 10) {
  const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const slotsByDoctor = await getUpcomingManualSlots(3);

  return Array.from(slotsByDoctor.entries())
    .map(([doctorId, slots]): UpcomingDoctorSlotsItem | null => {
      const doctor = doctorsById.get(doctorId);
      if (!doctor || slots.length === 0) {
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
    .filter((item): item is UpcomingDoctorSlotsItem => item !== null)
    .slice(0, limit);
}
