"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Stethoscope,
  Route,
} from "lucide-react";
import { AppointmentRequestModal } from "@/components/arzt/AppointmentRequestModal";
import { DevAnalyticsPanel } from "@/components/analytics/DevAnalyticsPanel";
import { trackEvent } from "@/lib/analytics";
import { getGoogleMapsUrl, normalizeDoctorSearchText, type DoctorRecord } from "@/lib/doctors";

const ALL_SPECIALTIES = "Alle Fachbereiche";
const ALL_DISTRICTS = "Alle Bezirke";
const PAGE_SIZE = 24;

type ArztDirectoryProps = {
  initialDoctors?: DoctorRecord[];
  initialSearchQuery?: string;
  initialSelectedSpecialty?: string;
  initialSelectedDistrict?: string;
};

type DoctorsApiPayload = {
  doctors?: DoctorRecord[];
  pagination?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
  facets?: {
    districts?: string[];
    specialties?: string[];
  };
  stats?: {
    totalDoctors?: number;
    totalWithPhone?: number;
    totalSpecialties?: number;
  };
};

function parseDistrictFromSearch(query: string, districts: string[]) {
  const normalizedQuery = normalizeDoctorSearchText(query);
  const districtMatch = normalizedQuery.match(/\b(0?[1-9]|1\d|2[0-3])\s*\.?\s*(bezirk)?\b/);
  if (!districtMatch) {
    return undefined;
  }

  const districtNumber = Number(districtMatch[1]);
  if (!Number.isFinite(districtNumber)) {
    return undefined;
  }

  const districtLabel = `${String(districtNumber).padStart(2, "0")}. Bezirk`;
  return districts.find((item) => normalizeDoctorSearchText(item) === normalizeDoctorSearchText(districtLabel));
}

function parseSpecialtyFromSearch(query: string, specialties: string[]) {
  const normalizedQuery = normalizeDoctorSearchText(query);
  const specialtyOptions = specialties.filter((item) => item !== ALL_SPECIALTIES);

  const directOrthopedicsMatch = specialtyOptions.find((item) => {
    const normalized = normalizeDoctorSearchText(item);
    if (!normalized.includes("orthop")) {
      return false;
    }
    return /(orthop|ortopedi)/.test(normalizedQuery);
  });

  if (directOrthopedicsMatch) {
    return directOrthopedicsMatch;
  }

  return specialtyOptions.find((item) => {
    const normalized = normalizeDoctorSearchText(item);
    return normalized.length >= 4 && normalizedQuery.includes(normalized);
  });
}

function parseSmartInitialFilters(query: string, districts: string[], specialties: string[]) {
  const trimmedQuery = query.trim();
  if (trimmedQuery === "") {
    return {
      selectedDistrict: ALL_DISTRICTS,
      selectedSpecialty: ALL_SPECIALTIES,
      searchQuery: "",
    };
  }

  const parsedDistrict = parseDistrictFromSearch(trimmedQuery, districts);
  const parsedSpecialty = parseSpecialtyFromSearch(trimmedQuery, specialties);

  let freeText = trimmedQuery;
  freeText = freeText.replace(/\b(0?[1-9]|1\d|2[0-3])\s*\.?\s*bezirk\b/gi, " ");
  freeText = freeText.replace(/\b(0?[1-9]|1\d|2[0-3])\s*\./gi, " ");

  if (parsedSpecialty) {
    const escaped = parsedSpecialty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    freeText = freeText.replace(new RegExp(escaped, "gi"), " ");
  }

  freeText = freeText.replace(/\s+/g, " ").trim();

  return {
    selectedDistrict: parsedDistrict ?? ALL_DISTRICTS,
    selectedSpecialty: parsedSpecialty ?? ALL_SPECIALTIES,
    searchQuery: freeText,
  };
}

export function ArztDirectory({
  initialDoctors = [],
  initialSearchQuery = "",
  initialSelectedSpecialty = ALL_SPECIALTIES,
  initialSelectedDistrict = ALL_DISTRICTS,
}: ArztDirectoryProps) {
  const router = useRouter();

  const [doctors, setDoctors] = useState<DoctorRecord[]>(initialDoctors);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [specialties, setSpecialties] = useState<string[]>([ALL_SPECIALTIES]);
  const [districts, setDistricts] = useState<string[]>([ALL_DISTRICTS]);

  const [totalMatches, setTotalMatches] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [totalDoctors, setTotalDoctors] = useState(0);
  const [doctorsWithPhone, setDoctorsWithPhone] = useState(0);
  const [totalSpecialties, setTotalSpecialties] = useState(0);

  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSelectedSpecialty);
  const [selectedDistrict, setSelectedDistrict] = useState(initialSelectedDistrict);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [smartParsingApplied, setSmartParsingApplied] = useState(initialSearchQuery.trim() === "");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const controller = new AbortController();

      async function loadDoctors() {
        setIsLoading(true);
        setErrorMessage("");

        try {
          const params = new URLSearchParams({
            q: searchQuery,
            district: selectedDistrict,
            specialty: selectedSpecialty,
            page: String(page),
            pageSize: String(PAGE_SIZE),
          });

          const response = await fetch(`/api/doctors?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Doctors API failed with ${response.status}`);
          }

          const payload = (await response.json()) as DoctorsApiPayload;

          const nextDistricts = payload.facets?.districts;
          const nextSpecialties = payload.facets?.specialties;
          const resolvedDistricts = Array.isArray(nextDistricts) && nextDistricts.length > 0 ? nextDistricts : [ALL_DISTRICTS];
          const resolvedSpecialties = Array.isArray(nextSpecialties) && nextSpecialties.length > 0 ? nextSpecialties : [ALL_SPECIALTIES];

          if (!smartParsingApplied && initialSearchQuery.trim() !== "") {
            const parsed = parseSmartInitialFilters(initialSearchQuery, resolvedDistricts, resolvedSpecialties);
            const shouldRequery =
              parsed.selectedDistrict !== selectedDistrict ||
              parsed.selectedSpecialty !== selectedSpecialty ||
              parsed.searchQuery !== searchQuery ||
              page !== 1;

            setSmartParsingApplied(true);

            if (shouldRequery) {
              setSelectedDistrict(parsed.selectedDistrict);
              setSelectedSpecialty(parsed.selectedSpecialty);
              setSearchQuery(parsed.searchQuery);
              setPage(1);
              setDistricts(resolvedDistricts);
              setSpecialties(resolvedSpecialties);
              return;
            }
          }

          setDoctors(Array.isArray(payload.doctors) ? payload.doctors : []);
          setTotalMatches(payload.pagination?.total ?? 0);
          setPage(payload.pagination?.page ?? 1);
          setTotalPages(payload.pagination?.totalPages ?? 1);
          setDistricts(resolvedDistricts);
          setSpecialties(resolvedSpecialties);

          setTotalDoctors(payload.stats?.totalDoctors ?? 0);
          setDoctorsWithPhone(payload.stats?.totalWithPhone ?? 0);
          setTotalSpecialties(payload.stats?.totalSpecialties ?? 0);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          console.error("Arztdaten konnten nicht geladen werden", error);
          setDoctors([]);
          setTotalMatches(0);
          setTotalPages(1);
          setErrorMessage("Arztdaten konnten nicht geladen werden. Bitte versuche es erneut.");
        } finally {
          setIsLoading(false);
        }
      }

      void loadDoctors();

      return () => {
        controller.abort();
      };
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialSearchQuery, page, searchQuery, selectedDistrict, selectedSpecialty, smartParsingApplied]);

  const featuredSpecialties = useMemo(() => specialties.slice(1, 7), [specialties]);

  function trackDoctorAction(doctor: DoctorRecord, action: "phone" | "website" | "route") {
    trackEvent("doctor_action_clicked", {
      source: "arzt-directory",
      action,
      doctor_id: doctor.id,
      category: doctor.specialty,
      district: doctor.district,
    });
  }

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <Stethoscope className="h-3.5 w-3.5" />
            Echtdaten aus Wien
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Arzt & Gesundheit in Wien</h1>
              <p className="mt-2 text-slate-600">
                Durchsuche reale Wiener Arztstandorte nach Fachbereich, Bezirk und Name. Nutze Telefon,
                Website oder Route direkt vom Eintrag aus.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Zur Startseite
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold text-sky-700">Arztstandorte</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{totalDoctors}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Mit Telefon</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{doctorsWithPhone}</p>
            </article>
            <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-semibold text-rose-700">Fachbereiche</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{totalSpecialties}</p>
            </article>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedSpecialty(ALL_SPECIALTIES);
                setPage(1);
                trackEvent("specialty_selected", { source: "arzt-quick-filter", specialty: ALL_SPECIALTIES });
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedSpecialty === ALL_SPECIALTIES ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {ALL_SPECIALTIES}
            </button>
            {featuredSpecialties.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSelectedSpecialty(item);
                  setPage(1);
                  trackEvent("specialty_selected", { source: "arzt-quick-filter", specialty: item });
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedSpecialty === item ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600">
              <Search className="h-4 w-4 text-sky-600" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSelectedDistrict(ALL_DISTRICTS);
                  setSelectedSpecialty(ALL_SPECIALTIES);
                  setPage(1);
                }}
                placeholder="Nach Name, Adresse oder Fachbereich suchen"
                className="w-full bg-transparent outline-none"
              />
            </label>
            <select
              value={selectedDistrict}
              onChange={(event) => {
                const nextDistrict = event.target.value;
                setSelectedDistrict(nextDistrict);
                setPage(1);
                trackEvent("district_selected", { source: "arzt-filter", district: nextDistrict });
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={selectedSpecialty}
              onChange={(event) => {
                const nextSpecialty = event.target.value;
                setSelectedSpecialty(nextSpecialty);
                setPage(1);
                trackEvent("specialty_selected", { source: "arzt-filter", specialty: nextSpecialty });
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {specialties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Treffer: <span className="font-semibold text-slate-700">{totalMatches}</span>
          </p>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          {isLoading ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 xl:col-span-2">
              Arztdaten werden geladen...
            </article>
          ) : null}

          {errorMessage ? (
            <article className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700 xl:col-span-2">
              {errorMessage}
            </article>
          ) : null}

          {!isLoading ? doctors.map((doctor) => (
            <article
              key={doctor.id}
              onClick={() => {
                trackEvent("cta_clicked", {
                  source: "arzt-directory-card",
                  action: "doctor_detail",
                  doctor_id: doctor.id,
                  category: doctor.specialty,
                  district: doctor.district,
                });
                router.push(`/arzt/${encodeURIComponent(doctor.id)}`);
              }}
              className="cursor-pointer rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{doctor.name}</h2>
                  <p className="text-sm text-slate-600">{doctor.specialty}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {doctor.providerType}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{doctor.district} · {doctor.address}</span>
                </p>
                <p className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  Naechster Slot: {doctor.nextSlot ?? "Auf Anfrage"}
                </p>
                {doctor.phone ? (
                  <p className="inline-flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-sky-600" />
                    {doctor.phone}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {doctor.phone ? (
                  <a
                    href={`tel:${doctor.phone.replace(/[^+\d]/g, "")}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      trackDoctorAction(doctor, "phone");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Telefon
                  </a>
                ) : null}
                {doctor.website ? (
                  <a
                    href={doctor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      event.stopPropagation();
                      trackDoctorAction(doctor, "website");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                ) : null}
                <a
                  href={getGoogleMapsUrl(doctor)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    event.stopPropagation();
                    trackDoctorAction(doctor, "route");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Route className="h-4 w-4" />
                  Route planen
                </a>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link
                  href={`/arzt/${encodeURIComponent(doctor.id)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    trackEvent("cta_clicked", {
                      source: "arzt-directory",
                      action: "doctor_detail",
                      doctor_id: doctor.id,
                      category: doctor.specialty,
                      district: doctor.district,
                    });
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Profil ansehen
                </Link>
                <AppointmentRequestModal
                  doctor={doctor}
                  source="arzt-card"
                  triggerClassName="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
                />
              </div>
            </article>
          )) : null}

          {!isLoading && doctors.length === 0 && !errorMessage ? (
            <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 xl:col-span-2">
              Keine Treffer fuer diese Kombination. Bitte waehle einen anderen Bezirk, Fachbereich oder Suchbegriff.
            </article>
          ) : null}
        </section>

        {!isLoading && totalPages > 1 ? (
          <section className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Zurueck
            </button>
            <p>
              Seite <span className="font-semibold text-slate-800">{page}</span> von <span className="font-semibold text-slate-800">{totalPages}</span>
            </p>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Weiter
            </button>
          </section>
        ) : null}
      </main>
      <DevAnalyticsPanel />
    </>
  );
}
