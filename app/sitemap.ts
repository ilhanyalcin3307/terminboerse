import type { MetadataRoute } from "next";
import { getDoctorSeoSlug } from "@/lib/doctors";
import { getPublicDoctorProfiles } from "@/lib/publicDoctorProfiles";

export const revalidate = 300;

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
  ];

  const { doctors, indexableDoctorIds } = await getPublicDoctorProfiles();
  const indexableIds = new Set(indexableDoctorIds);
  const seen = new Set<string>();

  const doctorRoutes: MetadataRoute.Sitemap = doctors
    .filter((doctor) => {
      if (!doctor.id || seen.has(doctor.id) || !indexableIds.has(doctor.id)) {
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