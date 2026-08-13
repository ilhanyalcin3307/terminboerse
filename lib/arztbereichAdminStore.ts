import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type DoctorProviderType = "OEGK" | "Wahlarzt" | "Privat";

type DoctorAccountEntry = {
  email: string;
  doctorIds: string[];
  passwordSha256: string;
  isActive: boolean;
};

type CustomDoctorProfile = {
  id: string;
  name: string;
  specialty: string;
  district: string;
  address: string;
  providerType: DoctorProviderType;
  phone?: string;
  email?: string;
  website?: string;
};

export type PendingRegistration = {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  registrationType: "existing" | "new";
  selectedDoctorId?: string;
  doctorName?: string;
  doctorEmail: string;
  doctorPhone: string;
  specialty?: string;
  clinicAddress?: string;
  district?: string;
  providerType: DoctorProviderType;
  note?: string;
  passwordSha256: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  approvedDoctorId?: string;
  authUserId?: string;
};

type ArztbereichState = {
  pendingRegistrations: PendingRegistration[];
  doctorAccounts: DoctorAccountEntry[];
  customProfiles: CustomDoctorProfile[];
};

const DEFAULT_STATE: ArztbereichState = {
  pendingRegistrations: [],
  doctorAccounts: [],
  customProfiles: [],
};

const STORE_KEY = "terminboerse:arztbereich:state:v1";
let inMemoryState: ArztbereichState = { ...DEFAULT_STATE };

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return null;
  }
  return { url, token };
}

async function runKvCommand(command: unknown[]) {
  const config = getKvConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KV command failed: ${response.status}`);
  }

  return (await response.json()) as { result?: unknown };
}

function normalizeState(raw: unknown): ArztbereichState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STATE };
  }

  const input = raw as Partial<ArztbereichState>;
  return {
    pendingRegistrations: Array.isArray(input.pendingRegistrations) ? input.pendingRegistrations : [],
    doctorAccounts: Array.isArray(input.doctorAccounts) ? input.doctorAccounts : [],
    customProfiles: Array.isArray(input.customProfiles) ? input.customProfiles : [],
  };
}

async function loadState(): Promise<ArztbereichState> {
  const config = getKvConfig();
  if (!config) {
    return inMemoryState;
  }

  try {
    const payload = await runKvCommand(["GET", STORE_KEY]);
    const rawValue = payload?.result;
    if (typeof rawValue !== "string" || rawValue.trim() === "") {
      return { ...DEFAULT_STATE };
    }

    const parsed = JSON.parse(rawValue) as unknown;
    return normalizeState(parsed);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(nextState: ArztbereichState) {
  const config = getKvConfig();
  if (!config) {
    inMemoryState = nextState;
    return;
  }

  await runKvCommand(["SET", STORE_KEY, JSON.stringify(nextState)]);
}

type SupabaseRegistrationRow = {
  id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  registration_type: "existing" | "new";
  selected_doctor_id: string | null;
  doctor_name: string | null;
  doctor_email: string;
  doctor_phone: string;
  specialty: string | null;
  clinic_address: string | null;
  district: string | null;
  provider_type: DoctorProviderType;
  note: string | null;
  password_sha256: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  approved_doctor_id: string | null;
  auth_user_id: string | null;
};

function mapRegistrationRow(row: SupabaseRegistrationRow): PendingRegistration {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    registrationType: row.registration_type,
    selectedDoctorId: row.selected_doctor_id ?? undefined,
    doctorName: row.doctor_name ?? undefined,
    doctorEmail: row.doctor_email,
    doctorPhone: row.doctor_phone,
    specialty: row.specialty ?? undefined,
    clinicAddress: row.clinic_address ?? undefined,
    district: row.district ?? undefined,
    providerType: row.provider_type,
    note: row.note ?? undefined,
    passwordSha256: row.password_sha256,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewNote: row.review_note ?? undefined,
    approvedDoctorId: row.approved_doctor_id ?? undefined,
    authUserId: row.auth_user_id ?? undefined,
  };
}

type CreatePendingRegistrationPayload = Omit<PendingRegistration, "id" | "createdAt" | "status">;

export async function createPendingRegistration(
  payload: CreatePendingRegistrationPayload,
): Promise<PendingRegistration> {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("arzt_registration_requests")
      .insert({
        registration_type: payload.registrationType,
        selected_doctor_id: payload.selectedDoctorId ?? null,
        doctor_name: payload.doctorName ?? null,
        doctor_email: payload.doctorEmail,
        doctor_phone: payload.doctorPhone,
        specialty: payload.specialty ?? null,
        clinic_address: payload.clinicAddress ?? null,
        district: payload.district ?? null,
        provider_type: payload.providerType,
        note: payload.note ?? null,
        password_sha256: payload.passwordSha256,
        auth_user_id: payload.authUserId ?? null,
      })
      .select("*")
      .single<SupabaseRegistrationRow>();

    if (error || !data) {
      throw new Error(error?.message ?? "Supabase insert failed for registration request.");
    }

    return mapRegistrationRow(data);
  }

  const state = await loadState();
  const request: PendingRegistration = {
    ...payload,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  const nextState: ArztbereichState = {
    ...state,
    pendingRegistrations: [request, ...state.pendingRegistrations],
  };

  await saveState(nextState);
  return request;
}

export async function listPendingRegistrations() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("arzt_registration_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapRegistrationRow(row as SupabaseRegistrationRow));
  }

  const state = await loadState();
  return state.pendingRegistrations
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function createCustomDoctorId(requestId: string) {
  return `custom-${requestId}`;
}

export async function reviewPendingRegistration(params: {
  requestId: string;
  decision: "approve" | "reject";
  reviewerEmail: string;
  reviewNote?: string;
}) {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from("arzt_registration_requests")
      .select("*")
      .eq("id", params.requestId)
      .single<SupabaseRegistrationRow>();

    if (existingError || !existing) {
      throw new Error("Anfrage nicht gefunden.");
    }

    if (existing.status !== "pending") {
      return mapRegistrationRow(existing);
    }

    let approvedDoctorId: string | null = null;
    if (params.decision === "approve") {
      approvedDoctorId =
        existing.registration_type === "existing" && existing.selected_doctor_id
          ? existing.selected_doctor_id
          : createCustomDoctorId(existing.id);

      if (existing.registration_type === "new") {
        const { data: existingProfile } = await supabase
          .from("arzt_custom_profiles")
          .select("id")
          .eq("id", approvedDoctorId)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase.from("arzt_custom_profiles").insert({
            id: approvedDoctorId,
            name: existing.doctor_name?.trim() || "Neue/r Arzt/Ärztin",
            specialty: existing.specialty?.trim() || "Allgemeinmedizin",
            district: existing.district?.trim() || "All Wien",
            address: existing.clinic_address?.trim() || "Adresse folgt",
            provider_type: existing.provider_type,
            phone: existing.doctor_phone,
            email: existing.doctor_email,
          });

          if (profileError) {
            throw new Error(profileError.message);
          }
        }
      }

      if (!existing.auth_user_id) {
        throw new Error("Kein Auth-User mit Anfrage verknüpft. Bitte Registrierung erneut ausführen.");
      }

      const { data: accountData, error: accountError } = await supabase
        .from("arzt_accounts")
        .upsert(
          {
            user_id: existing.auth_user_id,
            email: existing.doctor_email,
            role: "doctor",
            is_active: true,
          },
          { onConflict: "user_id" },
        )
        .select("id")
        .single<{ id: string }>();

      if (accountError || !accountData) {
        throw new Error(accountError?.message ?? "Arztkonto konnte nicht gespeichert werden.");
      }

      const { error: deleteLinksError } = await supabase
        .from("arzt_account_doctors")
        .delete()
        .eq("arzt_account_id", accountData.id);
      if (deleteLinksError) {
        throw new Error(deleteLinksError.message);
      }

      const { error: linkError } = await supabase.from("arzt_account_doctors").insert({
        arzt_account_id: accountData.id,
        doctor_id: approvedDoctorId,
      });
      if (linkError) {
        throw new Error(linkError.message);
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("arzt_registration_requests")
      .update({
        status: params.decision === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: params.reviewerEmail,
        review_note: params.reviewNote?.trim() || null,
        approved_doctor_id: approvedDoctorId,
      })
      .eq("id", params.requestId)
      .select("*")
      .single<SupabaseRegistrationRow>();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Freigabe konnte nicht gespeichert werden.");
    }

    return mapRegistrationRow(updated);
  }

  const state = await loadState();
  const request = state.pendingRegistrations.find((item) => item.id === params.requestId);

  if (!request) {
    throw new Error("Anfrage nicht gefunden.");
  }

  if (request.status !== "pending") {
    return request;
  }

  request.status = params.decision === "approve" ? "approved" : "rejected";
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = params.reviewerEmail;
  request.reviewNote = params.reviewNote?.trim() || undefined;

  if (params.decision === "approve") {
    const approvedDoctorId =
      request.registrationType === "existing" && request.selectedDoctorId
        ? request.selectedDoctorId
        : createCustomDoctorId(request.id);

    request.approvedDoctorId = approvedDoctorId;

    if (request.registrationType === "new") {
      const alreadyExists = state.customProfiles.some((profile) => profile.id === approvedDoctorId);
      if (!alreadyExists) {
        state.customProfiles.push({
          id: approvedDoctorId,
          name: request.doctorName?.trim() || "Neue/r Arzt/Ärztin",
          specialty: request.specialty?.trim() || "Allgemeinmedizin",
          district: request.district?.trim() || "All Wien",
          address: request.clinicAddress?.trim() || "Adresse folgt",
          providerType: request.providerType,
          phone: request.doctorPhone,
          email: request.doctorEmail,
        });
      }
    }

    const existingAccountIndex = state.doctorAccounts.findIndex((account) => account.email === request.doctorEmail);
    const nextAccount: DoctorAccountEntry = {
      email: request.doctorEmail,
      doctorIds: [approvedDoctorId],
      passwordSha256: request.passwordSha256,
      isActive: true,
    };

    if (existingAccountIndex >= 0) {
      state.doctorAccounts[existingAccountIndex] = nextAccount;
    } else {
      state.doctorAccounts.push(nextAccount);
    }
  }

  await saveState(state);
  return request;
}

export async function reassignApprovedRegistration(params: {
  requestId: string;
  doctorId: string;
  reviewerEmail: string;
  reviewNote?: string;
}) {
  const nextDoctorId = params.doctorId.trim();
  if (!nextDoctorId) {
    throw new Error("Neue Profil-ID fehlt.");
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from("arzt_registration_requests")
      .select("*")
      .eq("id", params.requestId)
      .single<SupabaseRegistrationRow>();

    if (existingError || !existing) {
      throw new Error("Anfrage nicht gefunden.");
    }

    if (existing.status !== "approved") {
      throw new Error("Nur genehmigte Anfragen können neu zugeordnet werden.");
    }

    if (!existing.auth_user_id) {
      throw new Error("Kein Auth-User mit Anfrage verknüpft.");
    }

    const { data: accountData, error: accountError } = await supabase
      .from("arzt_accounts")
      .upsert(
        {
          user_id: existing.auth_user_id,
          email: existing.doctor_email,
          role: "doctor",
          is_active: true,
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single<{ id: string }>();

    if (accountError || !accountData) {
      throw new Error(accountError?.message ?? "Arztkonto konnte nicht gespeichert werden.");
    }

    const { error: deleteLinksError } = await supabase
      .from("arzt_account_doctors")
      .delete()
      .eq("arzt_account_id", accountData.id);
    if (deleteLinksError) {
      throw new Error(deleteLinksError.message);
    }

    const { error: linkError } = await supabase.from("arzt_account_doctors").insert({
      arzt_account_id: accountData.id,
      doctor_id: nextDoctorId,
    });
    if (linkError) {
      throw new Error(linkError.message);
    }

    const { data: updated, error: updateError } = await supabase
      .from("arzt_registration_requests")
      .update({
        approved_doctor_id: nextDoctorId,
        reviewed_at: new Date().toISOString(),
        reviewed_by: params.reviewerEmail,
        review_note: params.reviewNote?.trim() || existing.review_note || null,
      })
      .eq("id", params.requestId)
      .select("*")
      .single<SupabaseRegistrationRow>();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Zuordnung konnte nicht gespeichert werden.");
    }

    return mapRegistrationRow(updated);
  }

  const state = await loadState();
  const request = state.pendingRegistrations.find((item) => item.id === params.requestId);

  if (!request) {
    throw new Error("Anfrage nicht gefunden.");
  }

  if (request.status !== "approved") {
    throw new Error("Nur genehmigte Anfragen können neu zugeordnet werden.");
  }

  request.approvedDoctorId = nextDoctorId;
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = params.reviewerEmail;
  request.reviewNote = params.reviewNote?.trim() || request.reviewNote;

  const existingAccountIndex = state.doctorAccounts.findIndex((account) => account.email === request.doctorEmail);
  const nextAccount: DoctorAccountEntry = {
    email: request.doctorEmail,
    doctorIds: [nextDoctorId],
    passwordSha256: request.passwordSha256,
    isActive: true,
  };

  if (existingAccountIndex >= 0) {
    state.doctorAccounts[existingAccountIndex] = nextAccount;
  } else {
    state.doctorAccounts.push(nextAccount);
  }

  await saveState(state);
  return request;
}

export async function getStoredDoctorAccounts() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { data: accounts, error: accountsError } = await supabase
      .from("arzt_accounts")
      .select("id, email, role, is_active")
      .eq("role", "doctor")
      .eq("is_active", true);

    if (accountsError) {
      throw new Error(accountsError.message);
    }

    const accountIds = (accounts ?? []).map((entry) => entry.id as string);
    if (accountIds.length === 0) {
      return [];
    }

    const { data: links, error: linksError } = await supabase
      .from("arzt_account_doctors")
      .select("arzt_account_id, doctor_id")
      .in("arzt_account_id", accountIds);

    if (linksError) {
      throw new Error(linksError.message);
    }

    const doctorIdsByAccount = new Map<string, string[]>();
    for (const link of links ?? []) {
      const accountId = String(link.arzt_account_id);
      const current = doctorIdsByAccount.get(accountId) ?? [];
      current.push(String(link.doctor_id));
      doctorIdsByAccount.set(accountId, current);
    }

    return (accounts ?? []).map((entry) => ({
      email: String(entry.email),
      doctorIds: doctorIdsByAccount.get(String(entry.id)) ?? [],
      passwordSha256: "",
      isActive: Boolean(entry.is_active),
    }));
  }

  const state = await loadState();
  return state.doctorAccounts.slice();
}

export async function getCustomProfiles() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("arzt_custom_profiles").select("*");
    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      specialty: String(row.specialty),
      district: String(row.district),
      address: String(row.address),
      providerType: row.provider_type as DoctorProviderType,
      phone: row.phone ? String(row.phone) : undefined,
      email: row.email ? String(row.email) : undefined,
      website: row.website ? String(row.website) : undefined,
    }));
  }

  const state = await loadState();
  return state.customProfiles.slice();
}
