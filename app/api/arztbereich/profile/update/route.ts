import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, upsertDoctorProfile } from "@/lib/arztbereichAdminStore";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { findDoctorById, normalizeDoctorsData } from "@/lib/doctors";
import type { DoctorService } from "@/lib/doctors";

type ProfileUpdateBody = {
  token?: string;
  doctorId?: string;
  name?: string;
  specialty?: string;
  district?: string;
  address?: string;
  providerType?: "OEGK" | "Wahlarzt" | "Privat";
  phone?: string;
  email?: string;
  website?: string;
  bookingUrl?: string;
  about?: string;
  workingHours?: Record<string, { isClosed?: boolean; start?: string; end?: string }>;
  services?: DoctorService[];
  languages?: string[];
  insuranceModels?: string[];
  acceptsNewPatients?: boolean;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getProviderType(value: unknown, fallback: "OEGK" | "Wahlarzt" | "Privat") {
  return value === "OEGK" || value === "Wahlarzt" || value === "Privat" ? value : fallback;
}

function normalizeWorkingHours(value: ProfileUpdateBody["workingHours"]) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const labels: Record<string, string> = {
    monday: "Montag",
    tuesday: "Dienstag",
    wednesday: "Mittwoch",
    thursday: "Donnerstag",
    friday: "Freitag",
    saturday: "Samstag",
    sunday: "Sonntag",
  };

  return Object.entries(value).map(([key, entry]) => ({
    label: labels[key] ?? key,
    value: entry?.isClosed ? "Geschlossen" : `${text(entry?.start)}-${text(entry?.end)}`,
  }));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProfileUpdateBody;
    const token = text(body.token);
    const doctorId = text(body.doctorId);
    const session = verifyArztbereichSessionToken(token);

    if (!session) {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }
    if (!doctorId || (session.role === "doctor" && !session.doctorIds.includes(doctorId))) {
      return NextResponse.json({ ok: false, error: "Dieses Arztprofil darf nicht geändert werden." }, { status: 403 });
    }

    const baseDoctor = findDoctorById(normalizeDoctorsData(doctorsJson), doctorId);
    const customDoctor = (await getCustomProfiles()).find((doctor) => doctor.id === doctorId);
    if (!baseDoctor && !customDoctor) {
      return NextResponse.json({ ok: false, error: "Arztprofil nicht gefunden." }, { status: 404 });
    }

    const source = customDoctor ?? baseDoctor!;
    const profile = await upsertDoctorProfile({
      id: doctorId,
      name: text(body.name) || source.name,
      specialty: text(body.specialty) || source.specialty,
      district: text(body.district) || source.district,
      address: text(body.address) || source.address,
      providerType: getProviderType(body.providerType, source.providerType),
      phone: text(body.phone) || undefined,
      email: text(body.email) || undefined,
      website: text(body.website) || undefined,
      bookingUrl: text(body.bookingUrl)
        ? text(body.bookingUrl).startsWith("http://") || text(body.bookingUrl).startsWith("https://")
          ? text(body.bookingUrl)
          : `https://${text(body.bookingUrl)}`
        : undefined,
      workingHours: body.workingHours ? normalizeWorkingHours(body.workingHours) : source.workingHours,
      about: text(body.about) || undefined,
      services: Array.isArray(body.services) ? body.services : source.services,
      languages: Array.isArray(body.languages) ? body.languages.map(text).filter(Boolean) : source.languages,
      insuranceModels: Array.isArray(body.insuranceModels) ? body.insuranceModels.map(text).filter(Boolean) : source.insuranceModels,
      acceptsNewPatients:
        typeof body.acceptsNewPatients === "boolean" ? body.acceptsNewPatients : source.acceptsNewPatients,
    });

    return NextResponse.json({ ok: true, doctor: profile });
  } catch (error) {
    console.error("/api/arztbereich/profile/update failed", error);
    return NextResponse.json({ ok: false, error: "Arztprofil konnte nicht gespeichert werden." }, { status: 500 });
  }
}
