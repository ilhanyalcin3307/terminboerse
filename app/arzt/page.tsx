import type { Metadata } from "next";
import { ArztDirectory } from "@/components/arzt/ArztDirectory";
import { getDirectoryPage } from "@/lib/doctorDirectory";

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
  const params = await searchParams;
  const page = getPageNumber(params.page);
  return {
    ...metadata,
    alternates: { canonical: page > 1 ? `/arzt?page=${page}` : "/arzt" },
    ...(params.search || params.category || params.district ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ArztPage({ searchParams }: ArztPageProps) {
  const params = await searchParams;
  const initialSearchQuery = params.search ?? "";
  const initialSelectedSpecialty = params.category ?? "Alle Fachbereiche";
  const initialSelectedDistrict = params.district ?? "Alle Bezirke";
  const result = await getDirectoryPage(initialSearchQuery, initialSelectedSpecialty, initialSelectedDistrict, getPageNumber(params.page));
  const { page, totalPages } = result;

  return (
    <ArztDirectory
      key={`${initialSearchQuery}::${initialSelectedSpecialty}::${initialSelectedDistrict}::${page}`}
      initialDoctors={result.doctors}
      initialPage={page}
      initialTotalMatches={result.totalMatches}
      initialTotalPages={totalPages}
      initialSearchParsed={params.page !== undefined}
      initialSearchQuery={initialSearchQuery}
      initialSelectedSpecialty={initialSelectedSpecialty}
      initialSelectedDistrict={initialSelectedDistrict}
    />
  );
}
