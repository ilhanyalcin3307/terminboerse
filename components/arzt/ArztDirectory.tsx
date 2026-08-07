"use client";

import { useMemo, useState } from "react";
import { MapPin, ShieldCheck, Stethoscope } from "lucide-react";
import { DevAnalyticsPanel } from "@/components/analytics/DevAnalyticsPanel";
import type { DoctorRecord } from "@/lib/doctors";

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

  const filteredDoctors = useMemo(() => {
    return doctors.filter((item) => {
      const bySpecialty = selectedSpecialty === "Alle Fachbereiche" || item.specialty === selectedSpecialty;
      const byDistrict = selectedDistrict === "All Wien" || item.district === selectedDistrict;
      return bySpecialty && byDistrict;
    });
  }, [doctors, selectedDistrict, selectedSpecialty]);

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          <Stethoscope className="h-3.5 w-3.5" />
          Echtdaten aus Wien
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Arzt & Gesundheit in Wien</h1>
        <p className="mt-2 text-slate-600">Filtere nach Fachbereich und Bezirk und sichere dir kurzfristige Termine.</p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <select
            value={selectedDistrict}
            onChange={(event) => setSelectedDistrict(event.target.value)}
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
            onChange={(event) => setSelectedSpecialty(event.target.value)}
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

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredDoctors.map((doctor) => (
            <article key={doctor.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{doctor.name}</h2>
                <p className="text-sm text-slate-600">{doctor.specialty}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {doctor.providerType}
              </span>
            </div>
            <p className="mt-3 inline-flex items-center gap-1 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-sky-600" />
              {doctor.district} · {doctor.address}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              Naechster Slot: {doctor.nextSlot ?? "Auf Anfrage"}
            </p>
            <button
              onClick={() => {
                const existing = JSON.parse(localStorage.getItem("terminboerse_events") ?? "[]") as unknown[];
                const event = {
                  id: crypto.randomUUID(),
                  eventName: "cta_clicked",
                  payload: { source: "arzt-directory", category: doctor.specialty, district: doctor.district },
                  createdAt: new Date().toISOString(),
                };
                localStorage.setItem("terminboerse_events", JSON.stringify([event, ...existing]));
                const lead = {
                  id: crypto.randomUUID(),
                  source: "arzt-directory",
                  name: "",
                  contact: "interesse@placeholder.at",
                  category: doctor.specialty,
                  district: doctor.district,
                  createdAt: new Date().toISOString(),
                };
                const leads = JSON.parse(localStorage.getItem("terminboerse_leads") ?? "[]") as unknown[];
                localStorage.setItem("terminboerse_leads", JSON.stringify([lead, ...leads]));
                alert("Interesse wurde gespeichert. Wir informieren dich bei freien Terminen.");
              }}
              className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Termin sichern
            </button>
            </article>
          ))}
        </section>
      </main>
      <DevAnalyticsPanel />
    </>
  );
}
