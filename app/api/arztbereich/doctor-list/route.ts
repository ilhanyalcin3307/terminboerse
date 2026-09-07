import { NextResponse } from "next/server";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";
import { mergeDoctorProfiles, normalizeDoctorSearchText, normalizeDoctorsData } from "@/lib/doctors";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type DoctorListBody = {
  token?: string;
  query?: string;
  page?: number;
};

type DoctorAccountRow = {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
};

type AccountDoctorLinkRow = {
  arzt_account_id: string;
  doctor_id: string;
};

type ManualSlotRow = {
  doctor_id: string;
  created_at: string;
};

type AuthUserRow = {
  id: string;
  last_sign_in_at?: string | null;
};

const PAGE_SIZE = 50;

function getProfileCompletion(doctor: {
  name: string;
  specialty: string;
  district: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  about?: string;
}) {
  const checks = [
    ["Name", doctor.name.trim().length >= 3],
    ["Fachbereich", doctor.specialty.trim().length >= 3],
    ["Bezirk", doctor.district.trim().length >= 2],
    ["Adresse", doctor.address.trim().length >= 6],
    ["Telefon", (doctor.phone ?? "").trim().length >= 6],
    ["E-Mail", (doctor.email ?? "").trim().includes("@")],
    ["Website", (doctor.website ?? "").trim().length >= 8],
    ["Über mich", (doctor.about ?? "").trim().length >= 80],
  ] as const;
  const missing = checks.filter(([, valid]) => !valid).map(([label]) => label);

  return {
    percent: Math.round(((checks.length - missing.length) / checks.length) * 100),
    missing,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DoctorListBody;
    const token = typeof body.token === "string" ? body.token : "";
    const session = verifyArztbereichSessionToken(token);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

    const query = normalizeDoctorSearchText(typeof body.query === "string" ? body.query : "");
    const requestedPage = typeof body.page === "number" && body.page > 0 ? Math.floor(body.page) : 1;
    const [customProfiles, hiddenDoctorIds] = await Promise.all([getCustomProfiles(), getHiddenDoctorIds()]);
    const customProfileIds = new Set(customProfiles.map((profile) => profile.id));
    const doctors = mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles)
      .filter((doctor) => {
        const searchable = normalizeDoctorSearchText(`${doctor.name} ${doctor.specialty} ${doctor.district} ${doctor.address}`);
        return !query || searchable.includes(query);
      })
      .sort((first, second) => first.name.localeCompare(second.name, "de"));
    const totalPages = Math.max(1, Math.ceil(doctors.length / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * PAGE_SIZE;
    const doctorsPage = doctors.slice(offset, offset + PAGE_SIZE);
    const doctorIds = doctorsPage.map((doctor) => doctor.id);
    const supabase = createSupabaseAdminClient();
    const [accountsResult, linksResult, slotsResult] = await Promise.all([
      supabase.from("arzt_accounts").select("id, user_id, email, is_active").eq("role", "doctor"),
      supabase.from("arzt_account_doctors").select("arzt_account_id, doctor_id").in("doctor_id", doctorIds),
      supabase.from("arzt_manual_slots").select("doctor_id, created_at").in("doctor_id", doctorIds).order("created_at", { ascending: false }),
    ]);
    if (accountsResult.error || linksResult.error || slotsResult.error) {
      throw new Error(accountsResult.error?.message ?? linksResult.error?.message ?? slotsResult.error?.message ?? "Aktivitätsdaten konnten nicht geladen werden.");
    }
    const { data: usersResult, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      throw new Error(usersError.message);
    }
    const authUsers = (usersResult.users ?? []) as AuthUserRow[];
    const accounts = (accountsResult.data ?? []) as DoctorAccountRow[];
    const links = (linksResult.data ?? []) as AccountDoctorLinkRow[];
    const slots = (slotsResult.data ?? []) as ManualSlotRow[];
    const usersById = new Map<string, AuthUserRow>(authUsers.map((user) => [user.id, user]));
    const accountsById = new Map<string, DoctorAccountRow>(accounts.map((account) => [account.id, account]));
    const accountByDoctorId = new Map(
      links
        .map((link) => {
          const account = accountsById.get(String(link.arzt_account_id));
          return account ? [String(link.doctor_id), account] as const : null;
        })
        .filter((entry): entry is readonly [string, DoctorAccountRow] => entry !== null),
    );
    const lastSlotPublishedByDoctorId = new Map<string, string>();
    for (const slot of slots) {
      const doctorId = slot.doctor_id;
      if (!lastSlotPublishedByDoctorId.has(doctorId)) {
        lastSlotPublishedByDoctorId.set(doctorId, slot.created_at);
      }
    }

    return NextResponse.json({
      ok: true,
      doctors: doctorsPage.map((doctor) => {
        const account = accountByDoctorId.get(doctor.id);
        const user = account ? usersById.get(String(account.user_id)) : undefined;
        return {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          district: doctor.district,
          address: doctor.address,
          isHidden: hiddenDoctorIds.has(doctor.id),
          isCustomProfile: customProfileIds.has(doctor.id),
          profileCompletion: getProfileCompletion(doctor),
          account: account
            ? {
                email: account.email,
                isActive: account.is_active,
                lastSignInAt: user?.last_sign_in_at ?? null,
              }
            : null,
          lastSlotPublishedAt: lastSlotPublishedByDoctorId.get(doctor.id) ?? null,
        };
      }),
      pagination: { page, totalPages, total: doctors.length },
    });
  } catch (error) {
    console.error("/api/arztbereich/doctor-list failed", error);
    const message = error instanceof Error ? error.message : "Arztliste konnte nicht geladen werden.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}