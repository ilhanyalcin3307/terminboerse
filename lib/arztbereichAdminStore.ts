import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { DoctorService, WorkingHoursEntry } from "@/lib/doctors";

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
  bookingUrl?: string;
  workingHours?: WorkingHoursEntry[];
  about?: string;
  services?: DoctorService[];
  languages?: string[];
  insuranceModels?: string[];
  acceptsNewPatients?: boolean;
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
  hiddenDoctorIds: string[];
};

const DEFAULT_STATE: ArztbereichState = {
  pendingRegistrations: [],
  doctorAccounts: [],
  customProfiles: [],
  hiddenDoctorIds: [],
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
    hiddenDoctorIds: Array.isArray(input.hiddenDoctorIds) ? input.hiddenDoctorIds.filter((item): item is string => typeof item === "string") : [],
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
      bookingUrl: row.booking_url ? String(row.booking_url) : undefined,
      workingHours: Array.isArray(row.working_hours) ? (row.working_hours as WorkingHoursEntry[]) : undefined,
      about: row.about ? String(row.about) : undefined,
      services: Array.isArray(row.services) ? (row.services as DoctorService[]) : undefined,
      languages: Array.isArray(row.languages) ? row.languages.map(String) : undefined,
      insuranceModels: Array.isArray(row.insurance_models) ? row.insurance_models.map(String) : undefined,
      acceptsNewPatients: typeof row.accepts_new_patients === "boolean" ? row.accepts_new_patients : undefined,
    }));
  }

  const state = await loadState();
  return state.customProfiles.slice();
}

export async function getHiddenDoctorIds() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("arzt_hidden_profiles").select("doctor_id");
    if (error) {
      throw new Error(error.message);
    }
    return new Set((data ?? []).map((row) => String(row.doctor_id)).filter(Boolean));
  }

  const state = await loadState();
  return new Set(state.hiddenDoctorIds);
}

export async function setDoctorProfileVisibility(params: { doctorId: string; hidden: boolean; adminEmail: string }) {
  const doctorId = params.doctorId.trim();
  if (!doctorId) {
    throw new Error("Arztprofil fehlt.");
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    if (params.hidden) {
      const { error } = await supabase
        .from("arzt_hidden_profiles")
        .upsert({ doctor_id: doctorId, hidden_by: params.adminEmail }, { onConflict: "doctor_id" });
      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("arzt_hidden_profiles").delete().eq("doctor_id", doctorId);
      if (error) {
        throw new Error(error.message);
      }
    }
    return;
  }

  const state = await loadState();
  state.hiddenDoctorIds = params.hidden
    ? Array.from(new Set([...state.hiddenDoctorIds, doctorId]))
    : state.hiddenDoctorIds.filter((item) => item !== doctorId);
  await saveState(state);
}

export async function deleteCustomDoctorProfile(doctorId: string) {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId.startsWith("custom-")) {
    throw new Error("Nur selbst erstellte Arztprofile können endgültig gelöscht werden.");
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const cleanupResults = await Promise.all([
      supabase.from("arzt_manual_slots").delete().eq("doctor_id", normalizedDoctorId),
      supabase.from("arzt_scheduling_status").delete().eq("doctor_id", normalizedDoctorId),
      supabase.from("arzt_google_calendar_connections").delete().eq("doctor_id", normalizedDoctorId),
      supabase.from("doctor_view_counters").delete().eq("doctor_id", normalizedDoctorId),
      supabase.from("arzt_account_doctors").delete().eq("doctor_id", normalizedDoctorId),
      supabase.from("arzt_hidden_profiles").delete().eq("doctor_id", normalizedDoctorId),
      supabase.from("arzt_custom_profiles").delete().eq("id", normalizedDoctorId),
    ]);
    const failed = cleanupResults.find((result) => result.error);
    if (failed?.error) {
      throw new Error(failed.error.message);
    }
    return;
  }

  const state = await loadState();
  state.customProfiles = state.customProfiles.filter((profile) => profile.id !== normalizedDoctorId);
  state.doctorAccounts = state.doctorAccounts.map((account) => ({
    ...account,
    doctorIds: account.doctorIds.filter((id) => id !== normalizedDoctorId),
  }));
  state.hiddenDoctorIds = state.hiddenDoctorIds.filter((id) => id !== normalizedDoctorId);
  await saveState(state);
}

export async function upsertDoctorProfile(profile: CustomDoctorProfile) {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("arzt_custom_profiles")
      .upsert({
        id: profile.id,
        name: profile.name,
        specialty: profile.specialty,
        district: profile.district,
        address: profile.address,
        provider_type: profile.providerType,
        phone: profile.phone ?? null,
        email: profile.email ?? null,
        website: profile.website ?? null,
        booking_url: profile.bookingUrl ?? null,
        working_hours: profile.workingHours ?? [],
        about: profile.about ?? null,
        services: profile.services ?? [],
        languages: profile.languages ?? [],
        insurance_models: profile.insuranceModels ?? [],
        accepts_new_patients: profile.acceptsNewPatients ?? null,
      }, { onConflict: "id" })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Arztprofil konnte nicht gespeichert werden.");
    }

    return {
      id: String(data.id),
      name: String(data.name),
      specialty: String(data.specialty),
      district: String(data.district),
      address: String(data.address),
      providerType: data.provider_type as DoctorProviderType,
      phone: data.phone ? String(data.phone) : undefined,
      email: data.email ? String(data.email) : undefined,
      website: data.website ? String(data.website) : undefined,
      bookingUrl: data.booking_url ? String(data.booking_url) : undefined,
      workingHours: Array.isArray(data.working_hours) ? (data.working_hours as WorkingHoursEntry[]) : undefined,
      about: data.about ? String(data.about) : undefined,
      services: Array.isArray(data.services) ? (data.services as DoctorService[]) : undefined,
      languages: Array.isArray(data.languages) ? data.languages.map(String) : undefined,
      insuranceModels: Array.isArray(data.insurance_models) ? data.insurance_models.map(String) : undefined,
      acceptsNewPatients: typeof data.accepts_new_patients === "boolean" ? data.accepts_new_patients : undefined,
    };
  }

  const state = await loadState();
  const existingIndex = state.customProfiles.findIndex((entry) => entry.id === profile.id);
  if (existingIndex >= 0) {
    state.customProfiles[existingIndex] = profile;
  } else {
    state.customProfiles.push(profile);
  }
  await saveState(state);
  return profile;
}
