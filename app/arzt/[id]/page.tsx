import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, Globe, Mail, MapPin, PhoneCall, Route, ShieldCheck, Stethoscope } from "lucide-react";
import doctorsJson from "@/data/doctors.json";
import { AppointmentRequestModal } from "@/components/arzt/AppointmentRequestModal";
import {
  findDoctorBySeoSlug,
  getDoctorSeoSlug,
  getDoctorWorkingHours,
  getGoogleMapsEmbedUrl,
  getGoogleMapsUrl,
  normalizeDoctorsData,
} from "@/lib/doctors";

type ArztDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ claim?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Omit<ArztDetailPageProps, "searchParams">): Promise<Metadata> {
  const { id } = await params;
  const doctors = normalizeDoctorsData(doctorsJson);
  const doctor = findDoctorBySeoSlug(doctors, decodeURIComponent(id));

  if (!doctor) {
    return {
      title: "Arztprofil nicht gefunden | Terminbörse.at",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalSlug = getDoctorSeoSlug(doctor);
  const title = `${doctor.name} in ${doctor.district}: ${doctor.specialty} | Terminbörse.at`;
  const description = `Profil von ${doctor.name} (${doctor.specialty}) in ${doctor.district}. Adresse, Kontaktwege und direkte Termin-Anfrage auf Terminbörse.at.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/arzt/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.terminboerse.at/arzt/${canonicalSlug}`,
      type: "website",
      locale: "de_AT",
      siteName: "Terminbörse.at",
    },
  };
}

export default async function ArztDetailPage({ params, searchParams }: ArztDetailPageProps) {
  const { id } = await params;
  const { claim } = await searchParams;

  const doctors = normalizeDoctorsData(doctorsJson);
  const doctor = findDoctorBySeoSlug(doctors, decodeURIComponent(id));

  if (!doctor) {
    notFound();
  }

  const workingHours = getDoctorWorkingHours(doctor);
  const mapsUrl = getGoogleMapsUrl(doctor);
  const mapsEmbedUrl = getGoogleMapsEmbedUrl(doctor);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/arzt" className="text-sm font-semibold text-sky-700 hover:underline">
          Zurück zur Arztliste
        </Link>
      </div>

      {claim === "true" ? (
        <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Claim Your Profile</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Profil kostenlos beanspruchen</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Verwalte Verfügbarkeiten, erhalte direkte Termin-Anfragen und präsentiere deine Ordination auf Terminbörse.at.
          </p>
          <a
            href={`mailto:claim@terminboerse.at?subject=${encodeURIComponent(`Profil beanspruchen: ${doctor.name}`)}`}
            className="mt-4 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Profil kostenlos beanspruchen
          </a>
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <Stethoscope className="h-3.5 w-3.5" />
            {doctor.providerType}
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{doctor.name}</h2>
          <p className="mt-2 text-lg text-slate-600">{doctor.specialty}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adresse</p>
              <p className="mt-2 inline-flex items-start gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 text-sky-600" />
                <span>{doctor.district} · {doctor.address}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nächster Kontaktweg</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                {doctor.phone ? "Telefonisch erreichbar" : "Rückmeldung über Anfrage"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {doctor.phone ? (
              <a
                href={`tel:${doctor.phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <PhoneCall className="h-4 w-4" />
                Telefon
              </a>
            ) : null}
            {doctor.email ? (
              <a
                href={`mailto:${doctor.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Mail className="h-4 w-4" />
                E-Mail
              </a>
            ) : null}
            {doctor.website ? (
              <a
                href={doctor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Globe className="h-4 w-4" />
                Website
              </a>
            ) : null}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Route className="h-4 w-4" />
              Route planen
            </a>
          </div>

          <div className="mt-6">
            <AppointmentRequestModal
              doctor={doctor}
              source="arzt-detail"
              triggerClassName="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 sm:w-auto"
            />
          </div>
        </article>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="aspect-[4/3] w-full bg-slate-100">
              <iframe
                src={mapsEmbedUrl}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Karte für ${doctor.name}`}
              />
            </div>
            <div className="p-4 text-sm text-slate-600">
              Standort in Wien. Für Navigation öffne direkt Google Maps.
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Sprechzeiten</h3>
            <div className="mt-4 space-y-3">
              {workingHours.map((entry) => (
                <div key={entry.label} className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{entry.label}</span>
                  <span className="text-sm text-slate-600">{entry.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Direkte Termin-Anfrage</h3>
            <p className="mt-2 text-sm text-slate-600">
              Nutze das Formular, um deine Anfrage an diese Ordination oder an das Terminbörse-Team zu senden.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-sky-600" />
                Fachbereich: {doctor.specialty}
              </p>
              <p className="mt-2 inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-600" />
                Bezirk: {doctor.district}
              </p>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}