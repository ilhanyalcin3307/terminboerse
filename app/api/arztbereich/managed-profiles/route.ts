import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles } from "@/lib/arztbereichAdminStore";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { mergeDoctorProfiles, normalizeDoctorsData } from "@/lib/doctors";
import { getUpcomingManualSlotsByDoctorIds } from "@/lib/manualDoctorSlots";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type ManagedProfilesBody = {
  token?: string;
};

type AccountRow = {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

type AccountDoctorRow = {
  arzt_account_id: string;
  doctor_id: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ManagedProfilesBody;
    const token = typeof body.token === "string" ? body.token : "";
    const session = verifyArztbereichSessionToken(token);

    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const [accountsResult, linksResult, customProfiles] = await Promise.all([
      supabase.from("arzt_accounts").select("id, email, is_active, created_at").eq("role", "doctor"),
      supabase.from("arzt_account_doctors").select("arzt_account_id, doctor_id"),
      getCustomProfiles(),
    ]);

    if (accountsResult.error || linksResult.error) {
      throw new Error(accountsResult.error?.message ?? linksResult.error?.message ?? "Konten konnten nicht geladen werden.");
    }

    const doctorsById = new Map(
      mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles).map((doctor) => [doctor.id, doctor]),
    );
    const accounts = (accountsResult.data ?? []) as AccountRow[];
    const links = (linksResult.data ?? []) as AccountDoctorRow[];
    const doctorIds = links.map((link) => link.doctor_id);
    const slotsByDoctorId = await getUpcomingManualSlotsByDoctorIds(doctorIds);
    const accountById = new Map(accounts.map((account) => [account.id, account]));

    const profiles = links
      .map((link) => {
        const account = accountById.get(link.arzt_account_id);
        const doctor = doctorsById.get(link.doctor_id);
        if (!account || !doctor) {
          return null;
        }

        return {
          accountId: account.id,
          accountEmail: account.email,
          accountCreatedAt: account.created_at,
          doctorId: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          district: doctor.district,
          address: doctor.address,
          isActive: account.is_active,
          openSlotsCount: slotsByDoctorId.get(doctor.id)?.length ?? 0,
        };
      })
      .filter((profile): profile is NonNullable<typeof profile> => profile !== null)
      .sort((first, second) => first.name.localeCompare(second.name, "de"));

    return NextResponse.json({ ok: true, profiles });
  } catch (error) {
    console.error("/api/arztbereich/managed-profiles failed", error);
    const message = error instanceof Error ? error.message : "Interner Fehler beim Laden der Profile.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}