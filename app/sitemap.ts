import type { MetadataRoute } from "next";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { getDoctorSeoSlug, mergeDoctorProfiles, normalizeDoctorsData } from "@/lib/doctors";

const BASE_URL = "https://www.terminboerse.at";
const SPECIALTY_LANDING_PATHS = ["hausarzt", "hautarzt", "frauenarzt", "zahnarzt", "kinderarzt"];
const GUIDE_PATHS = ["arzttermin-wien", "arzttermin-kurzfristig", "facharzttermin-wien"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/arzt`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...SPECIALTY_LANDING_PATHS.map((specialty) => ({
      url: `${BASE_URL}/arzttermin-wien/${specialty}`,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...GUIDE_PATHS.map((topic) => ({
      url: `${BASE_URL}/ratgeber/${topic}`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    {
      url: `${BASE_URL}/arztbereich`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/profil`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/kontakt`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/impressum`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/datenschutz`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/handwerker`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const [customProfiles, hiddenDoctorIds] = await Promise.all([getCustomProfiles(), getHiddenDoctorIds()]);
  const doctors = mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles).filter(
    (doctor) => !hiddenDoctorIds.has(doctor.id),
  );
  const seen = new Set<string>();

  const doctorRoutes: MetadataRoute.Sitemap = doctors
    .filter((doctor) => {
      if (!doctor.id || seen.has(doctor.id)) {
        return false;
      }
      seen.add(doctor.id);
      return true;
    })
    .map((doctor) => ({
      url: `${BASE_URL}/arzt/${encodeURIComponent(getDoctorSeoSlug(doctor))}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...doctorRoutes];
}