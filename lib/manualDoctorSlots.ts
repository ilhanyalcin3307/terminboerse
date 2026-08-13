import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type ManualDoctorSlot = {
  id: string;
  doctorId: string;
  start: string;
  end: string;
  status: "free" | "booked" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type CreateManualDoctorSlotInput = {
  doctorId: string;
  startsAt: string;
  durationMinutes?: number;
};

const SUPABASE_TABLE = "arzt_manual_slots";
const MAX_LOOKAHEAD_MS = 72 * 60 * 60 * 1000;
const DEFAULT_DURATION_MINUTES = 30;

const inMemorySlots = new Map<string, ManualDoctorSlot[]>();

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return Boolean(url && key);
}

function clampDuration(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DURATION_MINUTES;
  }
  return Math.min(240, Math.max(10, Math.round(value)));
}

function parseStartsAt(rawValue: string) {
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Ungültiges Datum/Zeit-Format.");
  }
  return date;
}

function assertWithinThreeDayWindow(start: Date, end: Date) {
  const nowMs = Date.now();
  const upperBound = nowMs + MAX_LOOKAHEAD_MS;

  if (start.getTime() < nowMs - 60 * 1000) {
    throw new Error("Slots in der Vergangenheit sind nicht erlaubt.");
  }

  if (start.getTime() > upperBound || end.getTime() > upperBound) {
    throw new Error("Es sind nur freie Slots in den nächsten 3 Tagen erlaubt.");
  }
}

function toManualSlot(row: {
  id: string;
  doctor_id: string;
  starts_at: string;
  ends_at: string;
  status: "free" | "booked" | "cancelled" | null;
  created_at: string | null;
  updated_at: string | null;
}): ManualDoctorSlot {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    start: row.starts_at,
    end: row.ends_at,
    status: row.status ?? "free",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function sortSlotsAscending(slots: ManualDoctorSlot[]) {
  return [...slots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function hasOverlap(slots: ManualDoctorSlot[], startMs: number, endMs: number, excludeId?: string) {
  return slots.some((slot) => {
    if (excludeId && slot.id === excludeId) {
      return false;
    }
    if (slot.status !== "free") {
      return false;
    }

    const existingStart = new Date(slot.start).getTime();
    const existingEnd = new Date(slot.end).getTime();
    if (Number.isNaN(existingStart) || Number.isNaN(existingEnd)) {
      return false;
    }

    return startMs < existingEnd && endMs > existingStart;
  });
}

async function listManualSlotsFromSupabase(doctorId: string) {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const limitIso = new Date(Date.now() + MAX_LOOKAHEAD_MS).toISOString();

  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select("id, doctor_id, starts_at, ends_at, status, created_at, updated_at")
    .eq("doctor_id", doctorId)
    .eq("status", "free")
    .gte("starts_at", nowIso)
    .lte("starts_at", limitIso)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.map((row) => toManualSlot(row)) : [];
}

function listManualSlotsFromMemory(doctorId: string) {
  const all = inMemorySlots.get(doctorId) ?? [];
  const nowMs = Date.now();
  const maxMs = nowMs + MAX_LOOKAHEAD_MS;

  return sortSlotsAscending(
    all.filter((slot) => {
      if (slot.status !== "free") {
        return false;
      }
      const startMs = new Date(slot.start).getTime();
      return Number.isFinite(startMs) && startMs >= nowMs && startMs <= maxMs;
    }),
  );
}

export async function listPublicManualDoctorSlots(doctorId: string) {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    return [] as ManualDoctorSlot[];
  }

  if (hasSupabaseConfig()) {
    try {
      return await listManualSlotsFromSupabase(normalizedDoctorId);
    } catch {
      return [] as ManualDoctorSlot[];
    }
  }

  return listManualSlotsFromMemory(normalizedDoctorId);
}

export async function createManualDoctorSlot(input: CreateManualDoctorSlotInput) {
  const doctorId = input.doctorId.trim();
  if (!doctorId) {
    throw new Error("doctorId fehlt.");
  }

  const startsAt = parseStartsAt(input.startsAt);
  const durationMinutes = clampDuration(input.durationMinutes);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  if (endsAt <= startsAt) {
    throw new Error("Ungültige Slot-Dauer.");
  }

  assertWithinThreeDayWindow(startsAt, endsAt);

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from(SUPABASE_TABLE)
      .select("id, doctor_id, starts_at, ends_at, status, created_at, updated_at")
      .eq("doctor_id", doctorId)
      .eq("status", "free")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString());

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingSlots = Array.isArray(existing) ? existing.map((row) => toManualSlot(row)) : [];
    if (hasOverlap(existingSlots, startsAt.getTime(), endsAt.getTime())) {
      throw new Error("Dieser Zeitraum überschneidet sich mit einem bestehenden freien Slot.");
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .insert({
        doctor_id: doctorId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "free",
      })
      .select("id, doctor_id, starts_at, ends_at, status, created_at, updated_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Slot konnte nicht gespeichert werden.");
    }

    return toManualSlot(data);
  }

  const slots = inMemorySlots.get(doctorId) ?? [];
  if (hasOverlap(slots, startsAt.getTime(), endsAt.getTime())) {
    throw new Error("Dieser Zeitraum überschneidet sich mit einem bestehenden freien Slot.");
  }

  const slot: ManualDoctorSlot = {
    id: `slot-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    doctorId,
    start: startsAt.toISOString(),
    end: endsAt.toISOString(),
    status: "free",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemorySlots.set(doctorId, sortSlotsAscending([...slots, slot]));
  return slot;
}

export async function deleteManualDoctorSlot(doctorId: string, slotId: string) {
  const normalizedDoctorId = doctorId.trim();
  const normalizedSlotId = slotId.trim();

  if (!normalizedDoctorId || !normalizedSlotId) {
    throw new Error("doctorId und slotId sind erforderlich.");
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .delete()
      .eq("doctor_id", normalizedDoctorId)
      .eq("id", normalizedSlotId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const current = inMemorySlots.get(normalizedDoctorId) ?? [];
  inMemorySlots.set(
    normalizedDoctorId,
    current.filter((slot) => slot.id !== normalizedSlotId),
  );
}

export async function reserveManualDoctorSlot(doctorId: string, slotId: string) {
  const normalizedDoctorId = doctorId.trim();
  const normalizedSlotId = slotId.trim();

  if (!normalizedDoctorId || !normalizedSlotId) {
    throw new Error("doctorId und slotId sind erforderlich.");
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .update({ status: "booked" })
      .eq("doctor_id", normalizedDoctorId)
      .eq("id", normalizedSlotId)
      .eq("status", "free")
      .select("id, doctor_id, starts_at, ends_at, status, created_at, updated_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return toManualSlot(data);
  }

  const current = inMemorySlots.get(normalizedDoctorId) ?? [];
  const target = current.find((slot) => slot.id === normalizedSlotId && slot.status === "free");

  if (!target) {
    return null;
  }

  target.status = "booked";
  target.updatedAt = new Date().toISOString();
  inMemorySlots.set(normalizedDoctorId, [...current]);

  return { ...target };
}

export async function getNextFreeSlotMap(doctorIds: string[]) {
  const normalizedDoctorIds = Array.from(new Set(doctorIds.map((id) => id.trim()).filter(Boolean)));
  const result = new Map<string, ManualDoctorSlot>();

  if (normalizedDoctorIds.length === 0) {
    return result;
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const limitIso = new Date(Date.now() + MAX_LOOKAHEAD_MS).toISOString();

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id, doctor_id, starts_at, ends_at, status, created_at, updated_at")
      .in("doctor_id", normalizedDoctorIds)
      .eq("status", "free")
      .gte("starts_at", nowIso)
      .lte("starts_at", limitIso)
      .order("starts_at", { ascending: true });

    if (error) {
      return result;
    }

    for (const row of data ?? []) {
      const slot = toManualSlot(row);
      if (!result.has(slot.doctorId)) {
        result.set(slot.doctorId, slot);
      }
    }

    return result;
  }

  for (const doctorId of normalizedDoctorIds) {
    const slots = listManualSlotsFromMemory(doctorId);
    const first = slots[0];
    if (first) {
      result.set(doctorId, first);
    }
  }

  return result;
}

export async function getUpcomingManualSlotsByDoctorIds(doctorIds: string[], maxPerDoctor = 3) {
  const normalizedDoctorIds = Array.from(new Set(doctorIds.map((id) => id.trim()).filter(Boolean)));
  const result = new Map<string, ManualDoctorSlot[]>();

  if (normalizedDoctorIds.length === 0) {
    return result;
  }

  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const limitIso = new Date(Date.now() + MAX_LOOKAHEAD_MS).toISOString();

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id, doctor_id, starts_at, ends_at, status, created_at, updated_at")
      .in("doctor_id", normalizedDoctorIds)
      .eq("status", "free")
      .gte("starts_at", nowIso)
      .lte("starts_at", limitIso)
      .order("starts_at", { ascending: true });

    if (error) {
      return result;
    }

    for (const row of data ?? []) {
      const slot = toManualSlot(row);
      const current = result.get(slot.doctorId) ?? [];
      if (current.length >= maxPerDoctor) {
        continue;
      }
      current.push(slot);
      result.set(slot.doctorId, current);
    }

    return result;
  }

  for (const doctorId of normalizedDoctorIds) {
    const slots = listManualSlotsFromMemory(doctorId).slice(0, maxPerDoctor);
    if (slots.length > 0) {
      result.set(doctorId, slots);
    }
  }

  return result;
}
