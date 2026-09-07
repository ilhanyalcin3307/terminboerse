import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CalendarCheck, CalendarClock, Car, Footprints, MapPin, ParkingCircle, ShieldCheck, Stethoscope, TrainFront } from "lucide-react";
import doctorsJson from "@/data/doctors.json";
import { getCustomProfiles, getHiddenDoctorIds } from "@/lib/arztbereichAdminStore";
import { AppointmentRequestModal } from "@/components/arzt/AppointmentRequestModal";
import { DoctorProfileActions } from "@/components/arzt/DoctorProfileActions";
import { getDoctorAvailableSlots } from "@/lib/googleCalendarAvailability";
import { getPublicDoctorSchedulingStatus } from "@/lib/doctorSchedulingStatus";
import { getNearestPharmacies, getNearestTransitStops, getNearestParkingGarages } from "@/lib/nearbyPlaces";
import {
  findDoctorBySeoSlug,
  getDoctorSeoSlug,
  getProviderTypeLabel,
  getDoctorWorkingHours,
  getGoogleMapsEmbedUrl,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsUrl,
  getGoogleMapsNearbySearchUrl,
  mergeDoctorProfiles,
  normalizeDoctorsData,
} from "@/lib/doctors";

type ArztDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ claim?: string }>;
};

export const dynamic = "force-dynamic";

function getBookingStatusLabel(
  reason: "not_onboarded" | "profile_incomplete" | "calendar_not_connected" | "scheduling_not_enabled" | "active",
  doctorName: string,
  variant: "short" | "detailed" = "short",
) {
  if (reason === "not_onboarded") {
    return variant === "detailed"
      ? `${doctorName} nimmt aktuell noch keine Online-Terminanfragen entgegen. Kontaktiere die Ordination direkt für eine Terminvereinbarung.`
      : "Aktuell keine Online-Termine verfügbar. Diese Praxis ist noch nicht im aktiven Terminportal freigeschaltet.";
  }
  if (reason === "profile_incomplete") {
    return variant === "detailed"
      ? `Das Terminprofil von ${doctorName} wird gerade eingerichtet. Bitte kontaktiere die Ordination direkt für einen Termin.`
      : "Aktuell keine Online-Termine verfügbar. Das Terminprofil dieser Praxis wird gerade eingerichtet.";
  }
  if (reason === "calendar_not_connected") {
    return variant === "detailed"
      ? `Der Online-Kalender von ${doctorName} ist derzeit deaktiviert. Kontaktiere die Ordination direkt für einen Termin.`
      : "Aktuell keine Online-Termine verfügbar. Der Synchron-Kalender ist derzeit deaktiviert.";
  }
  if (reason === "scheduling_not_enabled") {
    return variant === "detailed"
      ? `Die Online-Buchung bei ${doctorName} ist vorübergehend pausiert. Kontaktiere die Ordination direkt für einen Termin.`
      : "Aktuell keine Online-Termine verfügbar. Die Online-Buchung ist vorübergehend pausiert.";
  }
  return "Online-Termine sind aktiv.";
}

function formatSlotDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function EmptyProfileValue({ label, specialty, district }: { label: string; specialty: string; district: string }) {
  return (
    <span className="text-sm text-slate-400">
      Angaben zu &quot;{label}&quot; der {specialty}-Ordination im {district} liegen noch nicht vor.
    </span>
  );
}

export async function generateMetadata({ params }: Omit<ArztDetailPageProps, "searchParams">): Promise<Metadata> {
  const { id } = await params;
  const [customProfiles, hiddenDoctorIds] = await Promise.all([getCustomProfiles(), getHiddenDoctorIds()]);
  const doctors = mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles).filter(
    (doctor) => !hiddenDoctorIds.has(doctor.id),
  );
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

  const [customProfiles, hiddenDoctorIds] = await Promise.all([getCustomProfiles(), getHiddenDoctorIds()]);
  const doctors = mergeDoctorProfiles(normalizeDoctorsData(doctorsJson), customProfiles).filter(
    (doctor) => !hiddenDoctorIds.has(doctor.id),
  );
  const requestedSlug = decodeURIComponent(id).trim().toLowerCase();
  const doctor = findDoctorBySeoSlug(doctors, requestedSlug);

  if (!doctor) {
    notFound();
  }

  const canonicalSlug = getDoctorSeoSlug(doctor);
  if (canonicalSlug !== requestedSlug) {
    permanentRedirect(`/arzt/${encodeURIComponent(canonicalSlug)}`);
  }

  const workingHours = getDoctorWorkingHours(doctor);
  const mapsUrl = getGoogleMapsUrl(doctor);
  const mapsEmbedUrl = getGoogleMapsEmbedUrl(doctor);
  const drivingUrl = getGoogleMapsDirectionsUrl(doctor, "driving");
  const transitUrl = getGoogleMapsDirectionsUrl(doctor, "transit");
  const walkingUrl = getGoogleMapsDirectionsUrl(doctor, "walking");
  const parkingUrl = getGoogleMapsNearbySearchUrl(doctor, "Parkgarage");
  const bookingStatus = await getPublicDoctorSchedulingStatus(doctor.id);
  const bookingStatusLabel = getBookingStatusLabel(bookingStatus.reason, doctor.name, "short");
  const bookingStatusDetail = getBookingStatusLabel(bookingStatus.reason, doctor.name, "detailed");
  const nearestPharmacies = getNearestPharmacies(doctor.latitude, doctor.longitude, 3);
  const nearestTransitStops = getNearestTransitStops(doctor.latitude, doctor.longitude, 3);
  const nearestParkingGarages = getNearestParkingGarages(doctor.latitude, doctor.longitude, 3);
  const slotResult = await getDoctorAvailableSlots(doctor.id);
  const visibleSlots = slotResult.slots.slice(0, 8);
  const profileFields = [
    { label: "Über mich", value: doctor.about },
    { label: "Sprechzeiten", value: doctor.workingHours?.length ? "vorhanden" : "" },
    { label: "Leistungen", value: doctor.services?.map((service) => service.title).filter(Boolean).join(", ") ?? "" },
    { label: "Gesprochene Sprachen", value: doctor.languages?.join(", ") ?? "" },
    { label: "Versicherung", value: doctor.insuranceModels?.join(", ") ?? "" },
    {
      label: "Neue Patienten",
      value: typeof doctor.acceptsNewPatients === "boolean" ? (doctor.acceptsNewPatients ? "Ja" : "Nein") : "",
    },
    { label: "Online-Termin Link", value: doctor.bookingUrl ? "Vorhanden" : "" },
  ];
  const completedProfileFields = profileFields.filter((field) => Boolean(field.value)).length;
  const profileCompletion = Math.round((completedProfileFields / profileFields.length) * 100);
  const displayFields = [profileFields[0], ...profileFields.slice(2)];
  const filledDisplayFields = displayFields.filter((field) => Boolean(field.value));
  const missingDisplayFields = displayFields.filter((field) => !field.value);

  const sameAsUrls = [doctor.website, doctor.bookingUrl].filter((url): url is string => Boolean(url));
  const physicianSchema = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.name,
    medicalSpecialty: doctor.specialty,
    url: `https://www.terminboerse.at/arzt/${canonicalSlug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: doctor.address,
      addressLocality: "Wien",
      addressRegion: doctor.district,
      addressCountry: "AT",
    },
    ...(typeof doctor.latitude === "number" && typeof doctor.longitude === "number"
      ? { geo: { "@type": "GeoCoordinates", latitude: doctor.latitude, longitude: doctor.longitude } }
      : {}),
    ...(doctor.phone ? { telephone: doctor.phone } : {}),
    ...(sameAsUrls.length > 0 ? { sameAs: sameAsUrls.length === 1 ? sameAsUrls[0] : sameAsUrls } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(physicianSchema) }} />
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
            {getProviderTypeLabel(doctor.providerType)}
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{doctor.name}</h2>
          <p className="mt-2 text-lg text-slate-600">{doctor.specialty}</p>

          {doctor.about ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Über mich</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{doctor.about}</p>
            </div>
          ) : null}

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

          <DoctorProfileActions
            doctorId={doctor.id}
            doctorName={doctor.name}
            doctorSpecialty={doctor.specialty}
            phone={doctor.phone}
            email={doctor.email}
            website={doctor.website}
            bookingUrl={doctor.bookingUrl}
            mapsUrl={mapsUrl}
          />

          {doctor.bookingUrl ? (
            <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Direkte Online-Terminbuchung möglich</p>
              <p className="mt-1 text-sm text-slate-700">Diese Ordination bietet die Terminbuchung über ein externes Buchungssystem an.</p>
              <a
                href={doctor.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
              >
                <CalendarCheck className="h-4 w-4" />
                Jetzt Online-Termin buchen
              </a>
            </div>
          ) : null}

          <section className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profilinformationen</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Alles auf einen Blick</h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500">Profil vollständig</p>
                <p className="mt-1 text-lg font-bold text-sky-700">{profileCompletion} %</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${profileCompletion}%` }} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {filledDisplayFields.map((field) => (
                <div
                  key={field.label}
                  className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${field.label === "Über mich" ? "sm:col-span-2" : ""}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
                  <div className="mt-2 whitespace-pre-line leading-6">
                    <p className="text-sm text-slate-700">{field.value}</p>
                  </div>
                </div>
              ))}
              {missingDisplayFields.length > 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Noch nicht angegeben</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {missingDisplayFields.map((field) => field.label).join(", ")} der {doctor.specialty}-Ordination im {doctor.district} liegen noch nicht vor.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <div className="mt-6">
            {bookingStatus.canBookOnline ? (
              <AppointmentRequestModal
                doctor={doctor}
                source="arzt-detail"
                availableSlots={visibleSlots}
                triggerClassName="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 sm:w-auto"
              />
            ) : null}
            {doctor.email ? (
              <a
                href={`mailto:${doctor.email}?subject=${encodeURIComponent(`Direkte Anfrage: ${doctor.name}`)}`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:mt-0 sm:ml-3 sm:w-auto"
              >
                Direkt fragen
              </a>
            ) : null}
            {!bookingStatus.canBookOnline ? <p className="mt-3 text-sm text-slate-600">{bookingStatusDetail}</p> : null}
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
            <h3 className="text-lg font-bold text-slate-900">Anreise & Parken</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Plane deine Anreise zur Ordination in {doctor.district}, {doctor.address}. Die passende Route und nahe Parkmöglichkeiten werden in Google Maps geöffnet.
            </p>
            <div className="mt-4 space-y-3">
              <a
                href={transitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
              >
                <TrainFront className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <span>
                  <strong className="block text-sm text-slate-800">Öffentliche Verkehrsmittel</strong>
                  <span className="text-xs text-slate-500">U-Bahn, Straßenbahn und Bus zur Ordination in Google Maps planen.</span>
                  {nearestTransitStops.length > 0 ? (
                    <span className="mt-1 block space-y-0.5">
                      {nearestTransitStops.map((stop) => (
                        <span key={stop.name} className="block text-xs text-slate-600">
                          <strong>{stop.name}</strong>{stop.lines.length > 0 ? ` (Linien ${stop.lines.join(", ")})` : ""}, ca. {Math.round(stop.distanceMeters / 10) * 10} m entfernt
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </a>
              <a
                href={drivingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
              >
                <Car className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <span>
                  <strong className="block text-sm text-slate-800">Mit dem Auto</strong>
                  <span className="text-xs text-slate-500">Fahrtroute und Verkehrslage in Google Maps prüfen.</span>
                  {nearestParkingGarages.length > 0 ? (
                    <span className="mt-1 block text-xs text-slate-600">
                      Nächste Garage: <strong>{nearestParkingGarages[0].name}</strong>, ca. {Math.round(nearestParkingGarages[0].distanceMeters / 10) * 10} m entfernt
                    </span>
                  ) : null}
                </span>
              </a>
              <a
                href={parkingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
              >
                <ParkingCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <span>
                  <strong className="block text-sm text-slate-800">Parken</strong>
                  <span className="text-xs text-slate-500">Parkgaragen und Parkmöglichkeiten in der Nähe anzeigen.</span>
                  {nearestParkingGarages.length > 0 ? (
                    <span className="mt-1 block space-y-0.5">
                      {nearestParkingGarages.map((garage) => (
                        <span key={`${garage.name}-${garage.address}`} className="block text-xs text-slate-600">
                          <strong>{garage.name}</strong> · {garage.address}{garage.operator ? ` · ${garage.operator}` : ""}, ca. {Math.round(garage.distanceMeters / 10) * 10} m entfernt
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </a>
              <a
                href={walkingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
              >
                <Footprints className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span>
                  <strong className="block text-sm text-slate-800">Zu Fuß</strong>
                  <span className="text-xs text-slate-500">Fußweg vom aktuellen Standort zur Ordination planen.</span>
                </span>
              </a>
            </div>
          </section>

          {nearestPharmacies.length > 0 ? (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Apotheken in der Nähe</h3>
              <div className="mt-4 space-y-3">
                {nearestPharmacies.map((pharmacy) => (
                  <div
                    key={`${pharmacy.name}-${pharmacy.address}`}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-700">{pharmacy.name}</span>
                    <span className="text-right text-sm text-slate-600">
                      {pharmacy.address}
                      <span className="mt-0.5 block text-xs text-slate-500">ca. {Math.round(pharmacy.distanceMeters / 10) * 10} m entfernt</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

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
            <p className="mt-2 text-sm text-slate-600">{bookingStatusLabel}</p>
            {visibleSlots.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Nächste freie Slots</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {visibleSlots.map((slot) => (
                    <span key={slot.start} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      {formatSlotDate(slot.start)}
                    </span>
                  ))}
                </div>
                {slotResult.status === "misconfigured" ? (
                  <p className="mt-2 text-xs text-rose-700">Kalenderdaten sind aktuell nicht abrufbar. Bitte später erneut versuchen.</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-700">Aktuell wurden keine freien Zeiten eingetragen.</p>
            )}
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
    </>
  );
}