import { getPublicDoctorSchedulingStatus } from "@/lib/doctorSchedulingStatus";
import { listPublicManualDoctorSlots } from "@/lib/manualDoctorSlots";

export type DoctorSlot = {
  id?: string;
  start: string;
  end: string;
};

export type DoctorSlotsResult = {
  doctorId: string;
  timezone: string;
  status: "ready" | "unavailable" | "misconfigured";
  reason?: string;
  slots: DoctorSlot[];
};

const DEFAULT_TIMEZONE = "Europe/Vienna";

export async function getDoctorAvailableSlots(doctorId: string): Promise<DoctorSlotsResult> {
  const status = await getPublicDoctorSchedulingStatus(doctorId);
  const manualSlots = await listPublicManualDoctorSlots(doctorId);

  if (!status.canBookOnline) {
    return {
      doctorId,
      timezone: DEFAULT_TIMEZONE,
      status: "unavailable",
      reason: status.reason,
      // Keep slots visible even if online booking is currently gated.
      slots: manualSlots.map((slot) => ({ id: slot.id, start: slot.start, end: slot.end })),
    };
  }

  return {
    doctorId,
    timezone: DEFAULT_TIMEZONE,
    status: "ready",
    slots: manualSlots.map((slot) => ({ id: slot.id, start: slot.start, end: slot.end })),
  };
}
