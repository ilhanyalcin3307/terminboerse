import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type DoctorComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

export type DoctorCommunitySnapshot = {
  doctorId: string;
  averageRating: number;
  ratingsCount: number;
  commentsCount: number;
  viewsCount: number;
  lastComments: DoctorComment[];
  canRate: boolean;
};

type DoctorViewCountersEntry = {
  doctorId: string;
  profileViews: number;
  listImpressions: number;
  updatedAt: string;
};

type DoctorViewCountersState = {
  entries: DoctorViewCountersEntry[];
};

const SUPABASE_TABLE = "doctor_view_counters";
const STORE_KEY = "terminboerse:doctor-community:views:v1";
const DEFAULT_VIEW_STATE: DoctorViewCountersState = { entries: [] };

let inMemoryViewState: DoctorViewCountersState = { ...DEFAULT_VIEW_STATE };

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function getSeededBaseMetrics(doctorId: string) {
  const seed = hashString(doctorId);
  return { ratingsCount: 0, commentsCount: 0, averageRating: 0, seed };
}

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return Boolean(url && key);
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

function normalizeViewState(raw: unknown): DoctorViewCountersState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_VIEW_STATE };
  }

  const input = raw as Partial<DoctorViewCountersState>;
  return {
    entries: Array.isArray(input.entries) ? input.entries : [],
  };
}

async function loadViewState(): Promise<DoctorViewCountersState> {
  const config = getKvConfig();
  if (!config) {
    return inMemoryViewState;
  }

  try {
    const payload = await runKvCommand(["GET", STORE_KEY]);
    const rawValue = payload?.result;
    if (typeof rawValue !== "string" || rawValue.trim() === "") {
      return { ...DEFAULT_VIEW_STATE };
    }

    const parsed = JSON.parse(rawValue) as unknown;
    return normalizeViewState(parsed);
  } catch {
    return { ...DEFAULT_VIEW_STATE };
  }
}

async function saveViewState(nextState: DoctorViewCountersState) {
  const config = getKvConfig();
  if (!config) {
    inMemoryViewState = nextState;
    return;
  }

  await runKvCommand(["SET", STORE_KEY, JSON.stringify(nextState)]);
}

function normalizeCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function getEntryByDoctorId(state: DoctorViewCountersState, doctorId: string): DoctorViewCountersEntry | null {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    return null;
  }

  const entry = state.entries.find((item) => item.doctorId === normalizedDoctorId);
  if (!entry) {
    return null;
  }

  return {
    doctorId: normalizedDoctorId,
    profileViews: normalizeCount(entry.profileViews),
    listImpressions: normalizeCount(entry.listImpressions),
    updatedAt: typeof entry.updatedAt === "string" && entry.updatedAt ? entry.updatedAt : new Date(0).toISOString(),
  };
}

async function getSupabaseCounters(doctorId: string): Promise<DoctorViewCountersEntry | null> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .select("doctor_id, profile_views, list_impressions, updated_at")
    .eq("doctor_id", doctorId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    doctorId: data.doctor_id,
    profileViews: normalizeCount(data.profile_views),
    listImpressions: normalizeCount(data.list_impressions),
    updatedAt: data.updated_at ?? new Date(0).toISOString(),
  };
}

async function bumpSupabaseCounters(doctorId: string, profileViewsDelta: number, listImpressionsDelta: number) {
  const client = createSupabaseAdminClient();
  const current = (await getSupabaseCounters(doctorId)) ?? {
    doctorId,
    profileViews: 0,
    listImpressions: 0,
    updatedAt: new Date(0).toISOString(),
  };

  const { error } = await client.from(SUPABASE_TABLE).upsert(
    {
      doctor_id: doctorId,
      profile_views: current.profileViews + profileViewsDelta,
      list_impressions: current.listImpressions + listImpressionsDelta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "doctor_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function getTopSupabaseCounters(limit: number) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .select("doctor_id, profile_views")
    .gt("profile_views", 0)
    .order("profile_views", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({ doctorId: row.doctor_id as string, profileViews: normalizeCount(row.profile_views) }));
}

async function bumpViewCounters(doctorId: string, patch: { profileViewsDelta?: number; listImpressionsDelta?: number }) {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    return;
  }

  const profileViewsDelta = normalizeCount(patch.profileViewsDelta);
  const listImpressionsDelta = normalizeCount(patch.listImpressionsDelta);
  if (profileViewsDelta === 0 && listImpressionsDelta === 0) {
    return;
  }

  if (hasSupabaseConfig()) {
    try {
      await bumpSupabaseCounters(normalizedDoctorId, profileViewsDelta, listImpressionsDelta);
      return;
    } catch {
      // fall through to KV/in-memory store below
    }
  }

  const state = await loadViewState();
  const index = state.entries.findIndex((item) => item.doctorId === normalizedDoctorId);
  const current =
    index >= 0
      ? getEntryByDoctorId(state, normalizedDoctorId)
      : {
          doctorId: normalizedDoctorId,
          profileViews: 0,
          listImpressions: 0,
          updatedAt: new Date(0).toISOString(),
        };

  if (!current) {
    return;
  }

  const nextEntry: DoctorViewCountersEntry = {
    doctorId: normalizedDoctorId,
    profileViews: current.profileViews + profileViewsDelta,
    listImpressions: current.listImpressions + listImpressionsDelta,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    state.entries[index] = nextEntry;
  } else {
    state.entries.push(nextEntry);
  }

  await saveViewState(state);
}

function getSeededComments(): DoctorComment[] {
  return [];
}

export async function trackDoctorProfileView(doctorId: string) {
  await bumpViewCounters(doctorId, { profileViewsDelta: 1 });
}

export async function trackDoctorListImpressions(doctorIds: string[]) {
  const seen = new Set<string>();

  for (const rawDoctorId of doctorIds) {
    const doctorId = rawDoctorId.trim();
    if (!doctorId || seen.has(doctorId)) {
      continue;
    }
    seen.add(doctorId);
    await bumpViewCounters(doctorId, { listImpressionsDelta: 1 });
  }
}

export async function getDoctorCommunitySnapshot(doctorId: string): Promise<DoctorCommunitySnapshot> {
  const base = getSeededBaseMetrics(doctorId);

  let counters: DoctorViewCountersEntry | null = null;
  if (hasSupabaseConfig()) {
    counters = await getSupabaseCounters(doctorId);
  }
  if (!counters) {
    const state = await loadViewState();
    counters = getEntryByDoctorId(state, doctorId);
  }

  const profileViews = counters?.profileViews ?? 0;
  const listImpressions = counters?.listImpressions ?? 0;

  return {
    doctorId,
    averageRating: base.averageRating,
    ratingsCount: base.ratingsCount,
    commentsCount: base.commentsCount,
    viewsCount: profileViews + listImpressions,
    lastComments: getSeededComments(),
    canRate: false,
  };
}

export async function getDoctorCommunityPreviews(doctorIds: string[]) {
  return Promise.all(doctorIds.map(async (doctorId) => {
    const snapshot = await getDoctorCommunitySnapshot(doctorId);
    return {
      doctorId,
      averageRating: snapshot.averageRating,
      ratingsCount: snapshot.ratingsCount,
      commentsCount: snapshot.commentsCount,
      viewsCount: snapshot.viewsCount,
    };
  }));
}

export async function getTopViewedDoctorIds(limit: number) {
  if (hasSupabaseConfig()) {
    try {
      return await getTopSupabaseCounters(limit);
    } catch {
      // fall through to KV/in-memory store below
    }
  }

  const state = await loadViewState();

  return state.entries
    .map((entry) => ({ doctorId: entry.doctorId, profileViews: normalizeCount(entry.profileViews) }))
    .filter((entry) => entry.profileViews > 0)
    .sort((a, b) => b.profileViews - a.profileViews)
    .slice(0, limit);
}