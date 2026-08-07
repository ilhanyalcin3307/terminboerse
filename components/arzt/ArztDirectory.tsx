"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Globe,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Stethoscope,
  Route,
} from "lucide-react";
import { DevAnalyticsPanel } from "@/components/analytics/DevAnalyticsPanel";
import { prependLocalStorageItem, trackEvent } from "@/lib/analytics";
import { getGoogleMapsUrl, type DoctorRecord } from "@/lib/doctors";

type ArztDirectoryProps = {
  doctors: DoctorRecord[];
};

export function ArztDirectory({ doctors }: ArztDirectoryProps) {
  const specialties = useMemo(
    () => ["Alle Fachbereiche", ...Array.from(new Set(doctors.map((item) => item.specialty))).sort((a, b) => a.localeCompare(b))],
    [doctors],
  );

  const districts = useMemo(
    () => ["All Wien", ...Array.from(new Set(doctors.map((item) => item.district))).sort((a, b) => a.localeCompare(b))],
    [doctors],
  );

  const [selectedSpecialty, setSelectedSpecialty] = useState("Alle Fachbereiche");
  const [selectedDistrict, setSelectedDistrict] = useState("All Wien");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedDoctorId, setSavedDoctorId] = useState<string | null>(null);

  const featuredSpecialties = useMemo(() => specialties.slice(1, 7), [specialties]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((item) => {
      const bySpecialty = selectedSpecialty === "Alle Fachbereiche" || item.specialty === selectedSpecialty;
      const byDistrict = selectedDistrict === "All Wien" || item.district === selectedDistrict;
      const bySearch =
        searchQuery.trim() === "" ||
        `${item.name} ${item.address} ${item.specialty}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return bySpecialty && byDistrict && bySearch;
    });
  }, [doctors, searchQuery, selectedDistrict, selectedSpecialty]);

  const doctorsWithPhone = useMemo(() => doctors.filter((item) => item.phone).length, [doctors]);

  function saveInterest(doctor: DoctorRecord) {
    trackEvent("cta_clicked", {
      source: "arzt-directory",
      category: doctor.specialty,
      district: doctor.district,
      doctor_id: doctor.id,
      action: "appointment_interest",
    });
    trackEvent("lead_submitted", {
      source: "arzt-directory",
      category: doctor.specialty,
      district: doctor.district,
      channel: "directory_interest",
      doctor_id: doctor.id,
    });

    prependLocalStorageItem("terminboerse_leads", {
      id: crypto.randomUUID(),
      source: "arzt-directory",
      name: "",
      contact: "interesse@placeholder.at",
      category: doctor.specialty,
      district: doctor.district,
      createdAt: new Date().toISOString(),
    });

    setSavedDoctorId(doctor.id);
  }

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
              <p className="mt-2 text-2xl font-bold text-slate-900">{doctors.length}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Mit Telefon</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{doctorsWithPhone}</p>
            </article>
            <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-semibold text-rose-700">Fachbereiche</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{specialties.length - 1}</p>
            </article>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedSpecialty("Alle Fachbereiche");
                trackEvent("specialty_selected", { source: "arzt-quick-filter", specialty: "Alle Fachbereiche" });
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedSpecialty === "Alle Fachbereiche" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Alle Fachbereiche
            </button>
            {featuredSpecialties.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSelectedSpecialty(item);
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
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nach Name, Adresse oder Fachbereich suchen"
                className="w-full bg-transparent outline-none"
              />
            </label>
            <select
              value={selectedDistrict}
              onChange={(event) => {
                const nextDistrict = event.target.value;
                setSelectedDistrict(nextDistrict);
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
            Treffer: <span className="font-semibold text-slate-700">{filteredDoctors.length}</span>
          </p>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          {filteredDoctors.map((doctor) => (
            <article key={doctor.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
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
                    onClick={() => trackDoctorAction(doctor, "phone")}
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
                    onClick={() => trackDoctorAction(doctor, "website")}
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
                  onClick={() => trackDoctorAction(doctor, "route")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Route className="h-4 w-4" />
                  Route planen
                </a>
              </div>

              <button
                onClick={() => saveInterest(doctor)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                <CalendarClock className="h-4 w-4" />
                Termin sichern
              </button>

              {savedDoctorId === doctor.id ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">
                  Interesse gespeichert. Wir melden uns bei passenden freien Terminen.
                </p>
              ) : null}
            </article>
          ))}

          {filteredDoctors.length === 0 ? (
            <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 xl:col-span-2">
              Keine Treffer fuer diese Kombination. Bitte waehle einen anderen Bezirk, Fachbereich oder Suchbegriff.
            </article>
          ) : null}
        </section>
      </main>
      <DevAnalyticsPanel />
    </>
  );
}
