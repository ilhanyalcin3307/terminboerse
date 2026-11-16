import type { DoctorRecord } from "@/lib/doctors";

type DoctorIndexingOptions = {
  canBookOnline?: boolean;
  hasExplicitLanguages?: boolean;
};

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function hasBookingUrl(value: string | undefined) {
  if (!value?.trim()) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasWorkingHours(doctor: DoctorRecord) {
  return Boolean(doctor.workingHours?.some(({ label, value }) => {
    if (!hasText(label)) {
      return false;
    }
    const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)\s*[-–]\s*([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      return false;
    }
    return `${match[1]}:${match[2]}` < `${match[3]}:${match[4]}`;
  }));
}

export function isDoctorIndexable(
  doctor: DoctorRecord,
  { canBookOnline = false, hasExplicitLanguages = false }: DoctorIndexingOptions = {},
) {
  // The imported directory and profile merge both supply "Deutsch" as a default.
  const hasLanguages = doctor.languages?.some(
    (language) => hasText(language) && (hasExplicitLanguages || language.trim().toLowerCase() !== "deutsch"),
  );

  return Boolean(
    canBookOnline ||
    hasBookingUrl(doctor.bookingUrl) ||
    hasText(doctor.about) ||
    doctor.services?.some((service) => hasText(service.title)) ||
    hasWorkingHours(doctor) ||
    hasLanguages ||
    doctor.insuranceModels?.some(hasText) ||
    typeof doctor.acceptsNewPatients === "boolean"
  );
}
