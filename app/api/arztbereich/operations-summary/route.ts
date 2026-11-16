import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds, listPendingRegistrations } from "@/lib/arztbereichAdminStore";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { mergeDoctorProfiles, normalizeDoctorsData } from "@/lib/doctors";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type SummaryBody = {
  token?: string;
};

function isProfileComplete(doctor: {
  name: string;
  specialty: string;
  district: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  about?: string;
}) {
  return [
    doctor.name.trim().length >= 3,
    doctor.specialty.trim().length >= 3,
    doctor.district.trim().length >= 2,
    doctor.address.trim().length >= 6,
    (doctor.phone ?? "").trim().length >= 6,
    (doctor.email ?? "").trim().includes("@"),
    (doctor.website ?? "").trim().length >= 8,
    (doctor.about ?? "").trim().length >= 80,
  ].every(Boolean);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SummaryBody;
    const token = typeof body.token === "string" ? body.token : "";
    const session = verifyArztbereichSessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const [customProfiles, hiddenDoctorIds, registrations] = await Promise.all([
      getCustomProfiles(),
      getHiddenDoctorIds(),
      listPendingRegistrations(),
    ]);
    const doctors = mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles);
    const visibleDoctors = doctors.filter((doctor) => !hiddenDoctorIds.has(doctor.id));
    const visibleDoctorIds = new Set(visibleDoctors.map((doctor) => doctor.id));
    const supabase = createSupabaseAdminClient();
    const [accountsResult, linksResult, slotsResult] = await Promise.all([
      supabase.from("arzt_accounts").select("id").eq("role", "doctor").eq("is_active", true),
      supabase.from("arzt_account_doctors").select("arzt_account_id, doctor_id"),
      supabase.from("arzt_manual_slots").select("doctor_id").eq("status", "free").gte("starts_at", new Date().toISOString()),
    ]);
    if (accountsResult.error || linksResult.error || slotsResult.error) {
      throw new Error(accountsResult.error?.message ?? linksResult.error?.message ?? slotsResult.error?.message ?? "Operationsdaten konnten nicht geladen werden.");
    }
    const activeAccountIds = new Set((accountsResult.data ?? []).map((account) => String(account.id)));
    const managedDoctorIds = new Set(
      (linksResult.data ?? [])
        .filter((link) => activeAccountIds.has(String(link.arzt_account_id)))
        .map((link) => String(link.doctor_id))
        .filter((doctorId) => visibleDoctorIds.has(doctorId)),
    );
    const managedDoctors = visibleDoctors.filter((doctor) => managedDoctorIds.has(doctor.id));
    const doctorsWithFreeSlots = new Set(
      (slotsResult.data ?? []).map((slot) => String(slot.doctor_id)).filter((doctorId) => visibleDoctorIds.has(doctorId)),
    );

    return NextResponse.json({
      ok: true,
      summary: {
        activeDoctorAccounts: (accountsResult.data ?? []).length,
        pendingRegistrations: registrations.filter((item) => item.status === "pending").length,
        incompleteVisibleProfiles: managedDoctors.filter((doctor) => !isProfileComplete(doctor)).length,
        visibleProfilesWithoutFreeSlots: managedDoctors.filter((doctor) => !doctorsWithFreeSlots.has(doctor.id)).length,
        hiddenProfiles: hiddenDoctorIds.size,
      },
    });
  } catch (error) {
    console.error("/api/arztbereich/operations-summary failed", error);
    const message = error instanceof Error ? error.message : "Operationsübersicht konnte nicht geladen werden.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}