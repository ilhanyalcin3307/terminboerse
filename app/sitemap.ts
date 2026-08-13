import type { MetadataRoute } from "next";
import doctorsJson from "@/data/doctors.json";
import { getDoctorSeoSlug, normalizeDoctorsData } from "@/lib/doctors";

const BASE_URL = "https://www.terminboerse.at";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/arzt`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/arztbereich`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/profil`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/kontakt`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/impressum`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/datenschutz`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/handwerker`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const doctors = normalizeDoctorsData(doctorsJson);
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
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...doctorRoutes];
}