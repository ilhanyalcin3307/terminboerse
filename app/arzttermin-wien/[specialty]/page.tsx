import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArztDirectory } from "@/components/arzt/ArztDirectory";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { mergeDoctorProfiles, normalizeDoctorsData, tokenizeDoctorSearch } from "@/lib/doctors";

type SpecialtyLanding = {
  specialty: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  guidance: string;
};

const specialtyLandings: Record<string, SpecialtyLanding> = {
  hausarzt: {
    specialty: "Hausarzt / Allgemeinmedizin",
    title: "Hausarzt in Wien finden | Terminbörse.at",
    description: "Finde Hausärztinnen und Hausärzte in Wien nach Bezirk. Vergleiche Kontaktmöglichkeiten und veröffentlichte freie Termine.",
    heading: "Hausarzt in Wien finden",
    intro: "Hier findest du Hausärztinnen und Hausärzte für Allgemeinmedizin in Wien. Nutze die Bezirksauswahl, um Ordinationen in deiner Nähe zu vergleichen.",
    guidance: "Bei akuten oder lebensbedrohlichen Beschwerden wende dich bitte an den Notruf 144 oder eine geeignete Notfallambulanz.",
  },
  hautarzt: {
    specialty: "Dermatologie",
    title: "Hautarzt in Wien finden | Terminbörse.at",
    description: "Finde Hautärztinnen und Hautärzte in Wien nach Bezirk. Prüfe Kontaktdaten und freie Termine der nächsten drei Tage.",
    heading: "Hautarzt in Wien finden",
    intro: "Finde dermatologische Ordinationen in Wien und grenze die Ergebnisse nach Bezirk ein. In den Profilen siehst du Kontaktwege sowie veröffentlichte freie Termine.",
    guidance: "Terminbörse.at bietet Orientierung bei der Arztsuche und ersetzt keine medizinische Beratung oder Akutversorgung.",
  },
  frauenarzt: {
    specialty: "Gynäkologie / Frauenarzt",
    title: "Frauenarzt in Wien finden | Terminbörse.at",
    description: "Finde Frauenärztinnen und Frauenärzte in Wien nach Bezirk. Vergleiche Ordinationen, Kontaktdaten und freie Termine.",
    heading: "Frauenarzt in Wien finden",
    intro: "Diese Übersicht hilft dir, gynäkologische Ordinationen in Wien nach Bezirk zu finden. Vergleiche Profile und nimm bei einem passenden Angebot direkt Kontakt auf.",
    guidance: "Bei dringenden Beschwerden kontaktiere bitte den medizinischen Notdienst oder eine geeignete Akutambulanz.",
  },
  zahnarzt: {
    specialty: "Zahnmedizin",
    title: "Zahnarzt in Wien finden | Terminbörse.at",
    description: "Finde Zahnärztinnen und Zahnärzte in Wien nach Bezirk. Prüfe Kontaktmöglichkeiten und veröffentlichte freie Termine.",
    heading: "Zahnarzt in Wien finden",
    intro: "Finde zahnmedizinische Ordinationen in Wien und filtere nach Bezirk. Die Profile enthalten Kontaktdaten und, sofern veröffentlicht, freie Zeitfenster.",
    guidance: "Bei starken Schmerzen oder einem zahnmedizinischen Notfall wende dich bitte an den zahnärztlichen Notdienst.",
  },
  kinderarzt: {
    specialty: "Kinderheilkunde",
    title: "Kinderarzt in Wien finden | Terminbörse.at",
    description: "Finde Kinderärztinnen und Kinderärzte in Wien nach Bezirk. Vergleiche Profile, Kontaktwege und verfügbare Termine.",
    heading: "Kinderarzt in Wien finden",
    intro: "Hier findest du Ordinationen für Kinderheilkunde in Wien. Wähle einen Bezirk und prüfe die Profile, um eine passende Kontaktmöglichkeit zu finden.",
    guidance: "Bei medizinischen Notfällen von Kindern rufe bitte 144 oder suche unmittelbar eine geeignete Notfallversorgung auf.",
  },
};

type SpecialtyPageProps = {
  params: Promise<{ specialty: string }>;
  searchParams: Promise<{ search?: string; category?: string; district?: string; page?: string }>;
};

function getPageNumber(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

function getLanding(specialty: string) {
  return specialtyLandings[specialty];
}

export function generateStaticParams() {
  return Object.keys(specialtyLandings).map((specialty) => ({ specialty }));
}

export async function generateMetadata({ params, searchParams }: SpecialtyPageProps): Promise<Metadata> {
  const { specialty } = await params;
  const landing = getLanding(specialty);
  if (!landing) {
    return { title: "Seite nicht gefunden | Terminbörse.at", robots: { index: false, follow: false } };
  }
  const page = getPageNumber((await searchParams).page);

  return {
    title: landing.title,
    description: landing.description,
    alternates: { canonical: `/arzttermin-wien/${specialty}${page > 1 ? `?page=${page}` : ""}` },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url: `https://www.terminboerse.at/arzttermin-wien/${specialty}`,
      type: "website",
      locale: "de_AT",
      siteName: "Terminbörse.at",
    },
  };
}

export default async function SpecialtyPage({ params, searchParams }: SpecialtyPageProps) {
  const { specialty } = await params;
  const landing = getLanding(specialty);
  if (!landing) {
    notFound();
  }
  const query = await searchParams;
  const initialSearchQuery = query.search ?? "";
  const initialSelectedSpecialty = query.category ?? landing.specialty;
  const initialSelectedDistrict = query.district ?? "Alle Bezirke";
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
  const page = Math.min(getPageNumber(query.page), totalPages);
  const initialDoctors = filteredDoctors.slice((page - 1) * 24, page * 24);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Terminbörse.at", item: "https://www.terminboerse.at/" },
      { "@type": "ListItem", position: 2, name: "Arztliste", item: "https://www.terminboerse.at/arzt" },
      { "@type": "ListItem", position: 3, name: landing.heading, item: `https://www.terminboerse.at/arzttermin-wien/${specialty}` },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <section className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold text-sky-700">Arztsuche in Wien</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{landing.heading}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{landing.intro}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{landing.guidance}</p>
      </section>
      <ArztDirectory
        key={`${initialSearchQuery}::${initialSelectedSpecialty}::${initialSelectedDistrict}::${page}`}
        initialDoctors={initialDoctors}
        initialPage={page}
        initialTotalMatches={filteredDoctors.length}
        initialTotalPages={totalPages}
        initialSearchParsed={query.page !== undefined}
        paginationPath={`/arzttermin-wien/${specialty}`}
        initialSearchQuery={initialSearchQuery}
        initialSelectedSpecialty={initialSelectedSpecialty}
        initialSelectedDistrict={initialSelectedDistrict}
      />
    </div>
  );
}