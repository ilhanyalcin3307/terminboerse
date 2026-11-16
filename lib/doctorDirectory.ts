import { unstable_cache } from "next/cache";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { mergeDoctorProfiles, normalizeDoctorsData, tokenizeDoctorSearch } from "@/lib/doctors";

export const DIRECTORY_TAG = "public-doctor-directory";

const baseDoctors = normalizeDoctorsData(doctorsJson);
const getDirectoryOverrides = unstable_cache(
  async () => {
    const [customProfiles, hiddenDoctorIds] = await Promise.all([getCustomProfiles(), getHiddenDoctorIds()]);
    return { customProfiles, hiddenDoctorIds: [...hiddenDoctorIds] };
  },
  ["public-doctor-directory-overrides-v1", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "local", process.env.KV_REST_API_URL ?? "no-kv"],
  { revalidate: 3600, tags: [DIRECTORY_TAG] },
);

export async function getDirectoryDoctors() {
  const { customProfiles, hiddenDoctorIds } = await getDirectoryOverrides();
  const hidden = new Set(hiddenDoctorIds);
  return mergeDoctorProfiles(baseDoctors, customProfiles).filter((doctor) => !hidden.has(doctor.id));
}

export async function getDirectoryPage(search: string, specialty: string, district: string, requestedPage: number) {
  const doctors = await getDirectoryDoctors();
  const tokens = tokenizeDoctorSearch(search);
  const filtered = doctors.filter((doctor) => {
    if (specialty !== "Alle Fachbereiche" && doctor.specialty !== specialty) return false;
    if (district !== "Alle Bezirke" && doctor.district !== district) return false;
    if (tokens.length === 0) return true;
    const searchable = tokenizeDoctorSearch(`${doctor.name} ${doctor.address} ${doctor.specialty} ${doctor.district}`).join(" ");
    return tokens.every((token) => searchable.includes(token));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / 24));
  const page = Math.min(requestedPage, totalPages);
  return { doctors: filtered.slice((page - 1) * 24, page * 24), page, totalPages, totalMatches: filtered.length };
}
