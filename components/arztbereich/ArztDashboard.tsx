"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Save,
  UserRound,
} from "lucide-react";
import { getDoctorSeoSlug } from "@/lib/doctors";

type ArztDashboardDoctor = {
  id: string;
  name: string;
  specialty: string;
  district: string;
  address: string;
  providerType: "OEGK" | "Wahlarzt" | "Privat";
  phone?: string;
  email?: string;
  website?: string;
};

type ArztDashboardProps = {
  doctors: ArztDashboardDoctor[];
};

type ProfileForm = {
  name: string;
  specialty: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  about: string;
  expertise: string;
  languages: string;
  insuranceModels: string;
  emergencyNote: string;
};

type AvailabilityForm = Record<string, string>;

type AppointmentForm = {
  slotDurationMinutes: number;
  bufferMinutes: number;
  cancellationHours: number;
  acceptsNewPatients: boolean;
  onlineAppointments: boolean;
  appointmentTypes: string;
  preparationNote: string;
  calendarConnectionStatus: "Nicht verbunden" | "Verbunden";
};

type RequestStatus = "Neu" | "In Bearbeitung" | "Erledigt";
type DashboardTab = "profil" | "randevu" | "anfragen";

type IncomingRequest = {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  note: string;
  createdAt: string;
  status: RequestStatus;
};

const WEEKDAY_CONFIG: Array<{ key: keyof AvailabilityForm; label: string }> = [
  { key: "monday", label: "Montag" },
  { key: "tuesday", label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday", label: "Donnerstag" },
  { key: "friday", label: "Freitag" },
  { key: "saturday", label: "Samstag" },
  { key: "sunday", label: "Sonntag" },
];

function getDefaultProfile(doctor: ArztDashboardDoctor): ProfileForm {
  return {
    name: doctor.name,
    specialty: doctor.specialty,
    district: doctor.district,
    address: doctor.address,
    phone: doctor.phone ?? "",
    email: doctor.email ?? "",
    website: doctor.website ?? "",
    about:
      "Ich begleite Patientinnen und Patienten mit klarem Ablauf, transparenter Kommunikation und individueller Beratung.",
    expertise: "Akutsprechstunde, Vorsorge, Verlaufskontrollen",
    languages: "Deutsch, Englisch",
    insuranceModels: "OEGK, Privat",
    emergencyNote: "Bei akuten Beschwerden bitte vorab telefonisch Kontakt aufnehmen.",
  };
}

function getDefaultAvailability(): AvailabilityForm {
  return {
    monday: "08:30 - 16:00",
    tuesday: "08:30 - 16:00",
    wednesday: "08:30 - 16:00",
    thursday: "08:30 - 16:00",
    friday: "08:30 - 13:00",
    saturday: "Geschlossen",
    sunday: "Geschlossen",
  };
}

function getDefaultAppointmentSettings(): AppointmentForm {
  return {
    slotDurationMinutes: 20,
    bufferMinutes: 5,
    cancellationHours: 12,
    acceptsNewPatients: true,
    onlineAppointments: false,
    appointmentTypes: "Ersttermin, Kontrolle, Befundbesprechung",
    preparationNote: "Bitte relevante Vorbefunde und Medikamentenliste zum Termin mitbringen.",
    calendarConnectionStatus: "Nicht verbunden",
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function getMockRequestsForDoctor(doctor: ArztDashboardDoctor): IncomingRequest[] {
  const seed = hashString(doctor.id);
  const statuses: RequestStatus[] = ["Neu", "In Bearbeitung", "Erledigt"];
  const firstNames = ["Anna", "Lukas", "Mara", "Deniz", "Nora", "Paul", "Elif", "Tobias"];
  const lastNames = ["K.", "S.", "M.", "T.", "R.", "B.", "A.", "W."];

  return Array.from({ length: 5 }).map((_, index) => {
    const firstName = firstNames[(seed + index * 3) % firstNames.length];
    const lastName = lastNames[(seed + index * 5) % lastNames.length];
    const status = statuses[(seed + index) % statuses.length];
    const daysAgo = 1 + ((seed + index * 7) % 9);

    return {
      id: `${doctor.id}-request-${index + 1}`,
      patientName: `${firstName} ${lastName}`,
      patientEmail: `${firstName.toLowerCase()}.${(seed + index) % 99}@mail.at`,
      patientPhone: `+43 6${((seed + index) % 9) + 1} ${100000 + ((seed + index * 37) % 899999)}`,
      note:
        index % 2 === 0
          ? "Bevorzugt Termin am Vormittag. Flexible Tage in dieser Woche."
          : "Bitte um Rueckruf fuer eine kurzfristige Terminabstimmung.",
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      status,
    };
  });
}

function readJsonFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unbekannt";
  }
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ArztDashboard({ doctors }: ArztDashboardProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<DashboardTab>("profil");
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>(getDefaultAvailability());
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>(getDefaultAppointmentSettings());
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedAvailability, setSavedAvailability] = useState(false);
  const [savedAppointments, setSavedAppointments] = useState(false);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) ?? doctors[0],
    [doctors, selectedDoctorId],
  );

  const incomingRequests = useMemo(() => {
    if (!selectedDoctor) {
      return [];
    }
    return getMockRequestsForDoctor(selectedDoctor);
  }, [selectedDoctor]);

  useEffect(() => {
    if (!selectedDoctor) {
      return;
    }

    const profileStorageKey = `terminboerse_arzt_profile_${selectedDoctor.id}`;
    const availabilityStorageKey = `terminboerse_arzt_availability_${selectedDoctor.id}`;
    const appointmentStorageKey = `terminboerse_arzt_appointments_${selectedDoctor.id}`;

    const storedProfile = readJsonFromStorage<ProfileForm>(profileStorageKey);
    const storedAvailability = readJsonFromStorage<AvailabilityForm>(availabilityStorageKey);
    const storedAppointmentSettings = readJsonFromStorage<AppointmentForm>(appointmentStorageKey);

    setProfileForm(storedProfile ?? getDefaultProfile(selectedDoctor));
    setAvailabilityForm(storedAvailability ?? getDefaultAvailability());
    setAppointmentForm(storedAppointmentSettings ?? getDefaultAppointmentSettings());
    setSavedProfile(false);
    setSavedAvailability(false);
    setSavedAppointments(false);
  }, [selectedDoctor]);

  if (!selectedDoctor || !profileForm) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          Kein Arztprofil verfuegbar. Bitte pruefe die Datenquelle.
        </section>
      </main>
    );
  }

  const profileUrl = `/arzt/${encodeURIComponent(getDoctorSeoSlug({
    id: selectedDoctor.id,
    name: profileForm.name,
    specialty: profileForm.specialty,
    district: profileForm.district,
  }))}`;

  function saveProfile() {
    const profileStorageKey = `terminboerse_arzt_profile_${selectedDoctor.id}`;
    localStorage.setItem(profileStorageKey, JSON.stringify(profileForm));
    setSavedProfile(true);
    window.setTimeout(() => setSavedProfile(false), 1800);
  }

  function saveAvailability() {
    const availabilityStorageKey = `terminboerse_arzt_availability_${selectedDoctor.id}`;
    localStorage.setItem(availabilityStorageKey, JSON.stringify(availabilityForm));
    setSavedAvailability(true);
    window.setTimeout(() => setSavedAvailability(false), 1800);
  }

  function saveAppointments() {
    const appointmentStorageKey = `terminboerse_arzt_appointments_${selectedDoctor.id}`;
    localStorage.setItem(appointmentStorageKey, JSON.stringify(appointmentForm));
    setSavedAppointments(true);
    window.setTimeout(() => setSavedAppointments(false), 1800);
  }

  const expertiseList = profileForm.expertise
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const languageList = profileForm.languages
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const appointmentTypeList = appointmentForm.appointmentTypes
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          <UserRound className="h-3.5 w-3.5" />
          Arztbereich (MVP)
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Arztprofil verwalten</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pflege dein Profil, aktualisiere Verfuegbarkeiten und behalte eingehende Anfragen im Blick.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-700">Arztprofil auswaehlen</span>
            <select
              value={selectedDoctorId}
              onChange={(event) => setSelectedDoctorId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialty} ({doctor.district})
                </option>
              ))}
            </select>
          </label>

          <Link
            href={profileUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            <Eye className="h-4 w-4" />
            Oeffentliches Profil ansehen
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profil")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "profil" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Profil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("randevu")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "randevu" ? "bg-sky-700 text-white" : "bg-sky-100 text-sky-800 hover:bg-sky-200"
            }`}
          >
            Randevu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("anfragen")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "anfragen" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            }`}
          >
            Anfragen
          </button>
        </div>
      </section>

      {activeTab === "profil" ? (
        <>
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Profilinformationen</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Name</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) => setProfileForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Fachbereich</span>
                  <input
                    value={profileForm.specialty}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, specialty: event.target.value } : prev))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Bezirk</span>
                  <input
                    value={profileForm.district}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, district: event.target.value } : prev))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Adresse</span>
                  <input
                    value={profileForm.address}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Hakkinda</span>
                  <textarea
                    value={profileForm.about}
                    onChange={(event) => setProfileForm((prev) => (prev ? { ...prev, about: event.target.value } : prev))}
                    className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Uzmanlik alanlari (virgul ile)</span>
                  <input
                    value={profileForm.expertise}
                    onChange={(event) => setProfileForm((prev) => (prev ? { ...prev, expertise: event.target.value } : prev))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Diller (virgul ile)</span>
                  <input
                    value={profileForm.languages}
                    onChange={(event) => setProfileForm((prev) => (prev ? { ...prev, languages: event.target.value } : prev))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Sigorta modelleri</span>
                  <input
                    value={profileForm.insuranceModels}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, insuranceModels: event.target.value } : prev))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Telefon</span>
                  <input
                    value={profileForm.phone}
                    onChange={(event) => setProfileForm((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">E-Mail</span>
                  <input
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Website</span>
                  <input
                    value={profileForm.website}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, website: event.target.value } : prev))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Acil not</span>
                  <textarea
                    value={profileForm.emergencyNote}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, emergencyNote: event.target.value } : prev))
                    }
                    className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  <Save className="h-4 w-4" />
                  Profil speichern
                </button>
                {savedProfile ? (
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Gespeichert
                  </p>
                ) : null}
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
                  <CalendarDays className="h-5 w-5 text-sky-700" />
                  Arbeitszeiten
                </h2>
                <div className="mt-4 space-y-2">
                  {WEEKDAY_CONFIG.map((item) => (
                    <label key={item.key} className="flex items-center gap-3 text-sm">
                      <span className="w-28 shrink-0 font-semibold text-slate-700">{item.label}</span>
                      <input
                        value={availabilityForm[item.key] ?? ""}
                        onChange={(event) =>
                          setAvailabilityForm((prev) => ({
                            ...prev,
                            [item.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={saveAvailability}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                  >
                    <Save className="h-4 w-4" />
                    Arbeitszeiten speichern
                  </button>
                  {savedAvailability ? (
                    <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Gespeichert
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Profilvorschau</h2>
                <p className="mt-2 text-sm text-slate-700">So sehen Patientinnen und Patienten dein aktuelles Profil.</p>
                <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-4 text-sm text-slate-700">
                  <p className="text-base font-bold text-slate-900">{profileForm.name}</p>
                  <p className="mt-1">{profileForm.specialty} - {profileForm.district}</p>
                  <p className="mt-1">{profileForm.address}</p>
                  <p className="mt-1">Telefon: {profileForm.phone || "Nicht angegeben"}</p>
                  <p className="mt-1">E-Mail: {profileForm.email || "Nicht angegeben"}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Uzmanliklar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {expertiseList.map((item) => (
                      <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-600">Diller: {languageList.join(", ") || "Belirtilmedi"}</p>
                </div>
              </article>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "randevu" ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <CalendarPlus2 className="h-5 w-5 text-sky-700" />
              Randevu ayarlari
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Slot suresi (dk)</span>
                <input
                  type="number"
                  min={5}
                  value={appointmentForm.slotDurationMinutes}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      slotDurationMinutes: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Buffer (dk)</span>
                <input
                  type="number"
                  min={0}
                  value={appointmentForm.bufferMinutes}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      bufferMinutes: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Iptal siniri (saat)</span>
                <input
                  type="number"
                  min={0}
                  value={appointmentForm.cancellationHours}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      cancellationHours: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                />
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-slate-600">Randevu tipleri (virgul ile)</span>
                <input
                  value={appointmentForm.appointmentTypes}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      appointmentTypes: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                />
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-slate-600">Termin oncesi not</span>
                <textarea
                  value={appointmentForm.preparationNote}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      preparationNote: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={appointmentForm.acceptsNewPatients}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      acceptsNewPatients: event.target.checked,
                    }))
                  }
                />
                Neue Patientinnen/Patienten akzeptieren
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={appointmentForm.onlineAppointments}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      onlineAppointments: event.target.checked,
                    }))
                  }
                />
                Online-Termine anbieten
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={saveAppointments}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <Save className="h-4 w-4" />
                Randevu-Einstellungen speichern
              </button>
              {savedAppointments ? (
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Gespeichert
                </p>
              ) : null}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
                <Clock3 className="h-5 w-5 text-sky-700" />
                Kalender-Verknuepfung
              </h2>
              <p className="mt-2 text-sm text-slate-600">Google Calendar Integration wird als naechster Schritt angebunden.</p>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Status: {appointmentForm.calendarConnectionStatus}
              </div>

              <button
                type="button"
                disabled
                className="mt-4 w-full rounded-xl bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed"
              >
                Google Calendar verbinden (bald)
              </button>
            </article>

            <article className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Randevu-Vorschau</h2>
              <p className="mt-2 text-sm text-slate-700">Aktive Parameter fuer automatische Slot-Erzeugung.</p>
              <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-4 text-sm text-slate-700">
                <p>Slot: {appointmentForm.slotDurationMinutes} dk</p>
                <p>Buffer: {appointmentForm.bufferMinutes} dk</p>
                <p>Iptal: {appointmentForm.cancellationHours} saat once</p>
                <p>Neue Patienten: {appointmentForm.acceptsNewPatients ? "Ja" : "Nein"}</p>
                <p>Online Termine: {appointmentForm.onlineAppointments ? "Ja" : "Nein"}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Termin tipleri</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {appointmentTypeList.map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "anfragen" ? (
        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <ClipboardList className="h-5 w-5 text-sky-700" />
            Eingehende Anfragen
          </h2>
          <p className="mt-2 text-sm text-slate-600">MVP-Ansicht fuer Termin-Anfragen. Login-basierte Echtzuordnung folgt im naechsten Schritt.</p>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {incomingRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{request.patientName}</p>
                    <p>{request.patientEmail}</p>
                    <p>{request.patientPhone}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      request.status === "Neu"
                        ? "bg-emerald-100 text-emerald-700"
                        : request.status === "In Bearbeitung"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="mt-3">{request.note}</p>
                <p className="mt-3 text-xs text-slate-500">Eingegangen: {formatDateTime(request.createdAt)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
