import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getStoredDoctorAccounts } from "@/lib/arztbereichAdminStore";
import { getSchedulingStatusEntry } from "@/lib/arztbereichSchedulingStore";
import { getGoogleCalendarConnection } from "@/lib/googleCalendarConnectionStore";

export type PublicDoctorSchedulingStatus = {
  doctorId: string;
  isOnboarded: boolean;
  profileUpdated: boolean;
  calendarConnected: boolean;
  calendarId?: string;
  schedulingEnabled: boolean;
  canBookOnline: boolean;
  reason: "not_onboarded" | "profile_incomplete" | "calendar_not_connected" | "scheduling_not_enabled" | "active";
};

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function hasActiveDoctorMapping(doctorId: string) {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseAdminClient();

    const { data: links, error: linksError } = await supabase
      .from("arzt_account_doctors")
      .select("arzt_account_id")
      .eq("doctor_id", doctorId);

    if (linksError) {
      throw new Error(linksError.message);
    }

    const accountIds = (links ?? []).map((entry) => String(entry.arzt_account_id));
    if (accountIds.length === 0) {
      return false;
    }

    const { data: accounts, error: accountsError } = await supabase
      .from("arzt_accounts")
      .select("id")
      .in("id", accountIds)
      .eq("role", "doctor")
      .eq("is_active", true)
      .limit(1);

    if (accountsError) {
      throw new Error(accountsError.message);
    }

    return Array.isArray(accounts) && accounts.length > 0;
  }

  const storedAccounts = await getStoredDoctorAccounts();
  return storedAccounts.some((account) => account.isActive && account.doctorIds.includes(doctorId));
}

export async function getPublicDoctorSchedulingStatus(doctorId: string): Promise<PublicDoctorSchedulingStatus> {
  const normalizedDoctorId = doctorId.trim();
  if (!normalizedDoctorId) {
    return {
      doctorId: doctorId,
      isOnboarded: false,
      profileUpdated: false,
      calendarConnected: false,
      calendarId: undefined,
      schedulingEnabled: false,
      canBookOnline: false,
      reason: "not_onboarded",
    };
  }

  const entry = await getSchedulingStatusEntry(normalizedDoctorId);
  const connection = await getGoogleCalendarConnection(normalizedDoctorId);

  const profileUpdated = Boolean(entry?.profileUpdated);
  const connectionCalendarId = typeof connection?.calendarId === "string" && connection.calendarId.trim() ? connection.calendarId.trim() : undefined;
  const entryCalendarId = typeof entry?.calendarId === "string" && entry.calendarId.trim() ? entry.calendarId.trim() : undefined;
  const calendarId = entryCalendarId ?? connectionCalendarId;
  const calendarConnected = Boolean(entry?.calendarConnected) || Boolean(connectionCalendarId);
  const schedulingEnabled = typeof entry?.schedulingEnabled === "boolean" ? entry.schedulingEnabled : false;

  const isOnboarded = await hasActiveDoctorMapping(normalizedDoctorId);
  if (!isOnboarded) {
    return {
      doctorId: normalizedDoctorId,
      isOnboarded,
      profileUpdated,
      calendarConnected,
      calendarId,
      schedulingEnabled,
      canBookOnline: false,
      reason: "not_onboarded",
    };
  }

  if (!profileUpdated) {
    return {
      doctorId: normalizedDoctorId,
      isOnboarded,
      profileUpdated,
      calendarConnected,
      calendarId,
      schedulingEnabled,
      canBookOnline: false,
      reason: "profile_incomplete",
    };
  }

  if (!schedulingEnabled) {
    return {
      doctorId: normalizedDoctorId,
      isOnboarded,
      profileUpdated,
      calendarConnected,
      calendarId,
      schedulingEnabled,
      canBookOnline: false,
      reason: "scheduling_not_enabled",
    };
  }

  return {
    doctorId: normalizedDoctorId,
    isOnboarded,
    profileUpdated,
    calendarConnected,
    calendarId,
    schedulingEnabled,
    canBookOnline: true,
    reason: "active",
  };
}
