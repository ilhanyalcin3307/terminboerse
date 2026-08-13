import { decryptText, encryptText } from "@/lib/secureTokenCrypto";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type StoredGoogleCalendarConnection = {
  doctorId: string;
  calendarId: string;
  googleEmail?: string;
  refreshTokenEncrypted?: string;
  accessTokenEncrypted?: string;
  accessTokenExpiresAt?: number;
  scope?: string;
  connectedAt: string;
  updatedAt: string;
};

type GoogleCalendarConnectionState = {
  entries: StoredGoogleCalendarConnection[];
};

export type GoogleCalendarConnection = {
  doctorId: string;
  calendarId: string;
  googleEmail?: string;
  refreshToken?: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;
  scope?: string;
  connectedAt: string;
  updatedAt: string;
};

const STORE_KEY = "terminboerse:arztbereich:google-calendar:v1";
const DEFAULT_STATE: GoogleCalendarConnectionState = { entries: [] };
const SUPABASE_TABLE = "arzt_google_calendar_connections";
const NO_REFRESH_TOKEN_SENTINEL = "__NO_REFRESH_TOKEN__";

let inMemoryState: GoogleCalendarConnectionState = { ...DEFAULT_STATE };

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return Boolean(url && key);
}

function fromSupabaseRow(row: {
  doctor_id: string;
  calendar_id: string;
  google_email: string | null;
  refresh_token_encrypted: string | null;
  access_token_encrypted: string | null;
  access_token_expires_at: number | null;
  scope: string | null;
  connected_at: string | null;
  updated_at: string | null;
}): StoredGoogleCalendarConnection {
  return {
    doctorId: row.doctor_id,
    calendarId: row.calendar_id,
    googleEmail: row.google_email ?? undefined,
    refreshTokenEncrypted: row.refresh_token_encrypted ?? undefined,
    accessTokenEncrypted: row.access_token_encrypted ?? undefined,
    accessTokenExpiresAt: typeof row.access_token_expires_at === "number" ? row.access_token_expires_at : undefined,
    scope: row.scope ?? undefined,
    connectedAt: row.connected_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function toSupabaseRow(connection: StoredGoogleCalendarConnection) {
  return {
    doctor_id: connection.doctorId,
    calendar_id: connection.calendarId,
    google_email: connection.googleEmail ?? null,
    refresh_token_encrypted: connection.refreshTokenEncrypted ?? null,
    access_token_encrypted: connection.accessTokenEncrypted ?? null,
    access_token_expires_at: connection.accessTokenExpiresAt ?? null,
    scope: connection.scope ?? null,
    connected_at: connection.connectedAt,
    updated_at: connection.updatedAt,
  };
}

async function getConnectionFromSupabase(doctorId: string): Promise<StoredGoogleCalendarConnection | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select(
        "doctor_id, calendar_id, google_email, refresh_token_encrypted, access_token_encrypted, access_token_expires_at, scope, connected_at, updated_at",
      )
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

async function upsertConnectionToSupabase(connection: StoredGoogleCalendarConnection): Promise<boolean> {
  if (!hasSupabaseConfig()) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from(SUPABASE_TABLE).upsert(toSupabaseRow(connection), { onConflict: "doctor_id" });
    return !error;
  } catch {
    return false;
  }
}

async function removeConnectionFromSupabase(doctorId: string): Promise<boolean> {
  if (!hasSupabaseConfig()) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from(SUPABASE_TABLE).delete().eq("doctor_id", doctorId);
    return !error;
  } catch {
    return false;
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

function normalizeState(raw: unknown): GoogleCalendarConnectionState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STATE };
  }

  const input = raw as Partial<GoogleCalendarConnectionState>;
  return {
    entries: Array.isArray(input.entries) ? input.entries : [],
  };
}

async function loadState(): Promise<GoogleCalendarConnectionState> {
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

async function saveState(nextState: GoogleCalendarConnectionState) {
  const config = getKvConfig();
  if (!config) {
    inMemoryState = nextState;
    return;
  }

  await runKvCommand(["SET", STORE_KEY, JSON.stringify(nextState)]);
}

function fromStored(stored: StoredGoogleCalendarConnection): GoogleCalendarConnection {
  const decryptedRefreshToken = stored.refreshTokenEncrypted ? decryptText(stored.refreshTokenEncrypted) : undefined;

  return {
    doctorId: stored.doctorId,
    calendarId: stored.calendarId,
    googleEmail: stored.googleEmail,
    refreshToken:
      decryptedRefreshToken && decryptedRefreshToken !== NO_REFRESH_TOKEN_SENTINEL ? decryptedRefreshToken : undefined,
    accessToken: stored.accessTokenEncrypted ? decryptText(stored.accessTokenEncrypted) : undefined,
    accessTokenExpiresAt: stored.accessTokenExpiresAt,
    scope: stored.scope,
    connectedAt: stored.connectedAt,
    updatedAt: stored.updatedAt,
  };
}

function toStored(connection: GoogleCalendarConnection): StoredGoogleCalendarConnection {
  const refreshTokenRaw = connection.refreshToken?.trim() || NO_REFRESH_TOKEN_SENTINEL;

  return {
    doctorId: connection.doctorId,
    calendarId: connection.calendarId,
    googleEmail: connection.googleEmail,
    refreshTokenEncrypted: encryptText(refreshTokenRaw),
    accessTokenEncrypted: connection.accessToken ? encryptText(connection.accessToken) : undefined,
    accessTokenExpiresAt: connection.accessTokenExpiresAt,
    scope: connection.scope,
    connectedAt: connection.connectedAt,
    updatedAt: connection.updatedAt,
  };
}

export async function getGoogleCalendarConnection(doctorId: string): Promise<GoogleCalendarConnection | null> {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    return null;
  }

  if (!getKvConfig()) {
    const supabaseStored = await getConnectionFromSupabase(normalizedDoctorId);
    if (supabaseStored) {
      try {
        return fromStored(supabaseStored);
      } catch {
        return null;
      }
    }
  }

  const state = await loadState();
  const stored = state.entries.find((entry) => entry.doctorId === normalizedDoctorId);
  if (!stored) {
    return null;
  }

  try {
    return fromStored(stored);
  } catch {
    return null;
  }
}

export async function upsertGoogleCalendarConnection(
  doctorId: string,
  patch: {
    calendarId: string;
    googleEmail?: string;
    refreshToken?: string;
    accessToken?: string;
    accessTokenExpiresAt?: number;
    scope?: string;
  },
): Promise<GoogleCalendarConnection> {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    throw new Error("doctorId is required");
  }

  if (!patch.calendarId.trim()) {
    throw new Error("calendarId is required");
  }

  const state = await loadState();
  const index = state.entries.findIndex((entry) => entry.doctorId === normalizedDoctorId);
  const nowIso = new Date().toISOString();

  const existing = index >= 0 ? state.entries[index] : null;
  const existingConnectedAt = existing?.connectedAt ?? nowIso;
  const existingRefreshTokenRaw = existing?.refreshTokenEncrypted ? decryptText(existing.refreshTokenEncrypted) : undefined;
  const existingRefreshToken =
    existingRefreshTokenRaw && existingRefreshTokenRaw !== NO_REFRESH_TOKEN_SENTINEL ? existingRefreshTokenRaw : undefined;
  const nextRefreshToken = patch.refreshToken?.trim() || existingRefreshToken;

  if (!nextRefreshToken && !patch.accessToken?.trim()) {
    throw new Error("Either refreshToken or accessToken is required");
  }

  const connection: GoogleCalendarConnection = {
    doctorId: normalizedDoctorId,
    calendarId: patch.calendarId.trim(),
    googleEmail: patch.googleEmail?.trim() || undefined,
    refreshToken: nextRefreshToken,
    accessToken: patch.accessToken?.trim() || undefined,
    accessTokenExpiresAt: patch.accessTokenExpiresAt,
    scope: patch.scope,
    connectedAt: existingConnectedAt,
    updatedAt: nowIso,
  };

  const nextStored = toStored(connection);

  if (!getKvConfig()) {
    const savedInSupabase = await upsertConnectionToSupabase(nextStored);
    if (savedInSupabase) {
      return connection;
    }
  }

  if (index >= 0) {
    state.entries[index] = nextStored;
  } else {
    state.entries.push(nextStored);
  }

  await saveState(state);
  return connection;
}

export async function removeGoogleCalendarConnection(doctorId: string): Promise<void> {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    return;
  }

  if (!getKvConfig()) {
    const removedFromSupabase = await removeConnectionFromSupabase(normalizedDoctorId);
    if (removedFromSupabase) {
      return;
    }
  }

  const state = await loadState();
  state.entries = state.entries.filter((entry) => entry.doctorId !== normalizedDoctorId);
  await saveState(state);
}
