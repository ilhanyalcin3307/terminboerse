import type { Metadata } from "next";
import { ArztDirectory } from "@/components/arzt/ArztDirectory";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { mergeDoctorProfiles, normalizeDoctorsData, tokenizeDoctorSearch } from "@/lib/doctors";

type ArztPageProps = {
  searchParams: Promise<{ search?: string; category?: string; district?: string; page?: string }>;
};

function getPageNumber(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

const metadata: Metadata = {
  title: "Ärzte in Wien finden | Terminbörse.at",
  description:
    "Durchsuche Ärztinnen und Ärzte in Wien nach Fachbereich und Bezirk. Vergleiche Profile, Kontaktwege und verfügbare Online-Terminbuchungen.",
  alternates: {
    canonical: "/arzt",
  },
  openGraph: {
    title: "Ärzte in Wien finden | Terminbörse.at",
    description:
      "Durchsuche Ärztinnen und Ärzte in Wien nach Fachbereich und Bezirk. Vergleiche Profile, Kontaktwege und verfügbare Online-Terminbuchungen.",
    url: "https://www.terminboerse.at/arzt",
    type: "website",
    locale: "de_AT",
    siteName: "Terminbörse.at",
  },
};

export async function generateMetadata({ searchParams }: ArztPageProps): Promise<Metadata> {
  const page = getPageNumber((await searchParams).page);
  return {
    ...metadata,
    alternates: { canonical: page > 1 ? `/arzt?page=${page}` : "/arzt" },
  };
}

export default async function ArztPage({ searchParams }: ArztPageProps) {
  const params = await searchParams;
  const initialSearchQuery = params.search ?? "";
  const initialSelectedSpecialty = params.category ?? "Alle Fachbereiche";
  const initialSelectedDistrict = params.district ?? "Alle Bezirke";
  const [customProfiles, hiddenDoctorIds] = await Promise.all([getCustomProfiles(), getHiddenDoctorIds()]);
  const tokens = tokenizeDoctorSearch(initialSearchQuery);
  const filteredDoctors = mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles)
    .filter((doctor) => !hiddenDoctorIds.has(doctor.id))
    .filter((doctor) => {
      const searchable = tokenizeDoctorSearch(`${doctor.name} ${doctor.address} ${doctor.specialty} ${doctor.district}`).join(" ");
      return (
        (initialSelectedSpecialty === "Alle Fachbereiche" || doctor.specialty === initialSelectedSpecialty) &&
        (initialSelectedDistrict === "Alle Bezirke" || doctor.district === initialSelectedDistrict) &&
        tokens.every((token) => searchable.includes(token))
      );
    });
  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / 24));
  const page = Math.min(getPageNumber(params.page), totalPages);
  const initialDoctors = filteredDoctors.slice((page - 1) * 24, page * 24);

  return (
    <ArztDirectory
      key={`${initialSearchQuery}::${initialSelectedSpecialty}::${initialSelectedDistrict}::${page}`}
      initialDoctors={initialDoctors}
      initialPage={page}
      initialTotalMatches={filteredDoctors.length}
      initialTotalPages={totalPages}
      initialSearchParsed={params.page !== undefined}
      initialSearchQuery={initialSearchQuery}
      initialSelectedSpecialty={initialSelectedSpecialty}
      initialSelectedDistrict={initialSelectedDistrict}
    />
  );
}
