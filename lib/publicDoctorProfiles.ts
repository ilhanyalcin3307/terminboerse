import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds, getStoredDoctorAccounts } from "@/lib/arztbereichAdminStore";
import { isDoctorIndexable } from "@/lib/doctorIndexing";
import { getPublicDoctorSchedulingStatus } from "@/lib/doctorSchedulingStatus";
import { mergeDoctorProfiles, normalizeDoctorsData } from "@/lib/doctors";
import { DIRECTORY_TAG } from "@/lib/doctorDirectory";

const PROFILE_TAG = "public-doctor-profiles";
const BOOKING_TAG = "public-doctor-booking-status";
const baseDoctors = normalizeDoctorsData(doctorsJson);

export const getCachedBookingStatus = unstable_cache(
  async (doctorId: string) => getPublicDoctorSchedulingStatus(doctorId),
  [BOOKING_TAG],
  { revalidate: 60, tags: [BOOKING_TAG] },
);

const getCachedProfileData = unstable_cache(
  async () => {
    const [customProfiles, hiddenDoctorIds, accounts] = await Promise.all([
      getCustomProfiles(),
      getHiddenDoctorIds(),
      getStoredDoctorAccounts(),
    ]);
    const accountDoctorIds = new Set(accounts.filter((account) => account.isActive).flatMap((account) => account.doctorIds));
    const bookingCandidates = [...accountDoctorIds].filter((id) => !hiddenDoctorIds.has(id));
    const statuses = await Promise.all(bookingCandidates.map((id) => getCachedBookingStatus(id)));
    return {
      customProfiles,
      hiddenDoctorIds: [...hiddenDoctorIds],
      onlineBookableDoctorIds: statuses.filter((status) => status.canBookOnline).map((status) => status.doctorId),
    };
  },
  [
    "public-doctor-profiles-with-indexing-v1",
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "local",
    process.env.KV_REST_API_URL ?? "no-kv",
  ],
  { revalidate: 300, tags: [PROFILE_TAG, BOOKING_TAG] },
);

export const getPublicDoctorProfiles = cache(async () => {
  const data = await getCachedProfileData();
  const hiddenDoctorIds = new Set(data.hiddenDoctorIds);
  const onlineBookableDoctorIds = new Set(data.onlineBookableDoctorIds);
  const explicitLanguageIds = new Set(
    data.customProfiles.filter((profile) => profile.languages?.some((language) => language.trim())).map((profile) => profile.id),
  );
  const doctors = mergeDoctorProfiles(baseDoctors, data.customProfiles).filter(
    (doctor) => !hiddenDoctorIds.has(doctor.id),
  );
  const indexableDoctorIds = doctors
    .filter((doctor) => isDoctorIndexable(doctor, {
      hasExplicitLanguages: explicitLanguageIds.has(doctor.id),
      canBookOnline: onlineBookableDoctorIds.has(doctor.id),
    }))
    .map((doctor) => doctor.id);
  return { doctors, indexableDoctorIds };
});

export function revalidatePublicDoctorProfiles() {
  revalidateTag(PROFILE_TAG, { expire: 0 });
  revalidateTag(BOOKING_TAG, { expire: 0 });
  revalidateTag(DIRECTORY_TAG, { expire: 0 });
  revalidatePath("/");
  revalidatePath("/directory-isr/[kind]/[page]", "page");
  revalidatePath("/arzt/[id]", "page");
  revalidatePath("/sitemap.xml");
}
