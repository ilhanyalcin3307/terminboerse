import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type SchedulingStatusEntry = {
  doctorId: string;
  profileUpdated: boolean;
  calendarConnected: boolean;
  calendarId?: string;
  schedulingEnabled: boolean;
  updatedAt: string;
};

type SchedulingState = {
  entries: SchedulingStatusEntry[];
};

const STORE_KEY = "terminboerse:arztbereich:scheduling:v1";
const DEFAULT_STATE: SchedulingState = { entries: [] };
const SUPABASE_TABLE = "arzt_scheduling_status";

let inMemoryState: SchedulingState = { ...DEFAULT_STATE };

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return Boolean(url && key);
}

function fromSupabaseRow(row: {
  doctor_id: string;
  profile_updated: boolean | null;
  calendar_connected: boolean | null;
  calendar_id: string | null;
  scheduling_enabled: boolean | null;
  updated_at: string | null;
}): SchedulingStatusEntry {
  return {
    doctorId: row.doctor_id,
    profileUpdated: Boolean(row.profile_updated),
    calendarConnected: Boolean(row.calendar_connected),
    calendarId: typeof row.calendar_id === "string" && row.calendar_id.trim() ? row.calendar_id.trim() : undefined,
    schedulingEnabled: Boolean(row.scheduling_enabled),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

async function getSchedulingStatusEntryFromSupabase(doctorId: string): Promise<SchedulingStatusEntry | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("doctor_id, profile_updated, calendar_connected, calendar_id, scheduling_enabled, updated_at")
      .eq("doctor_id", doctorId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return fromSupabaseRow(data);
  } catch {
    return null;
  }
}

async function upsertSchedulingStatusEntryToSupabase(
  doctorId: string,
  patch: Partial<Pick<SchedulingStatusEntry, "profileUpdated" | "calendarConnected" | "calendarId" | "schedulingEnabled">>,
): Promise<SchedulingStatusEntry | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const existing = await getSchedulingStatusEntryFromSupabase(doctorId);

    const row = {
      doctor_id: doctorId,
      profile_updated: patch.profileUpdated ?? existing?.profileUpdated ?? false,
      calendar_connected: patch.calendarConnected ?? existing?.calendarConnected ?? false,
      calendar_id:
        typeof patch.calendarId === "string"
          ? patch.calendarId.trim() || null
          : existing?.calendarId && existing.calendarId.trim()
            ? existing.calendarId.trim()
            : null,
      scheduling_enabled: patch.schedulingEnabled ?? existing?.schedulingEnabled ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(row, { onConflict: "doctor_id" })
      .select("doctor_id, profile_updated, calendar_connected, calendar_id, scheduling_enabled, updated_at")
      .single();

    if (error || !data) {
      return null;
    }

    return fromSupabaseRow(data);
  } catch {
    return null;
  }
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL?.trim() ?? "";
  const token = process.env.KV_REST_API_TOKEN?.trim() ?? "";
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

function normalizeState(raw: unknown): SchedulingState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STATE };
  }

  const input = raw as Partial<SchedulingState>;
  return {
    entries: Array.isArray(input.entries) ? input.entries : [],
  };
}

async function loadState(): Promise<SchedulingState> {
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

async function saveState(nextState: SchedulingState) {
  const config = getKvConfig();
  if (!config) {
    inMemoryState = nextState;
    return;
  }

  await runKvCommand(["SET", STORE_KEY, JSON.stringify(nextState)]);
}

export async function getSchedulingStatusEntry(doctorId: string): Promise<SchedulingStatusEntry | null> {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    return null;
  }

  if (!getKvConfig()) {
    const supabaseEntry = await getSchedulingStatusEntryFromSupabase(normalizedDoctorId);
    if (supabaseEntry) {
      return supabaseEntry;
    }
  }

  const state = await loadState();
  return state.entries.find((entry) => entry.doctorId === normalizedDoctorId) ?? null;
}

export async function upsertSchedulingStatusEntry(
  doctorId: string,
  patch: Partial<Pick<SchedulingStatusEntry, "profileUpdated" | "calendarConnected" | "calendarId" | "schedulingEnabled">>,
): Promise<SchedulingStatusEntry> {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    throw new Error("doctorId is required");
  }

  if (!getKvConfig()) {
    const supabaseEntry = await upsertSchedulingStatusEntryToSupabase(normalizedDoctorId, patch);
    if (supabaseEntry) {
      return supabaseEntry;
    }
  }

  const state = await loadState();
  const index = state.entries.findIndex((entry) => entry.doctorId === normalizedDoctorId);

  const current: SchedulingStatusEntry =
    index >= 0
      ? state.entries[index]
      : {
          doctorId: normalizedDoctorId,
          profileUpdated: false,
          calendarConnected: false,
          schedulingEnabled: false,
          updatedAt: new Date(0).toISOString(),
        };

  const next: SchedulingStatusEntry = {
    ...current,
    ...patch,
    ...(typeof patch.calendarId === "string" ? { calendarId: patch.calendarId.trim() || undefined } : {}),
    doctorId: normalizedDoctorId,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    state.entries[index] = next;
  } else {
    state.entries.push(next);
  }

  await saveState(state);
  return next;
}
