"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Eye,
  Plus,
  Trash2,
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
  expertise: string[];
  languages: string[];
  insuranceModels: string[];
  emergencyNote: string;
  facebook: string;
  instagram: string;
  tiktok: string;
};

type WeekdayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type DailyHours = {
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
};

type AvailabilityForm = Record<WeekdayKey, DailyHours>;

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

type LegacyProfileForm = Partial<Omit<ProfileForm, "expertise" | "languages" | "insuranceModels">> & {
  expertise?: string[] | string;
  languages?: string[] | string;
  insuranceModels?: string[] | string;
};

type LegacyAvailabilityForm = Record<string, unknown>;

type RequestStatus = "Neu" | "In Bearbeitung" | "Erledigt";
type DashboardTab = "profil" | "leistungen" | "termine" | "anfragen";

type LeistungItem = {
  id: string;
  title: string;
};

type IncomingRequest = {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  note: string;
  createdAt: string;
  status: RequestStatus;
};

const WEEKDAY_CONFIG: Array<{ key: WeekdayKey; label: string }> = [
  { key: "monday", label: "Montag" },
  { key: "tuesday", label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday", label: "Donnerstag" },
  { key: "friday", label: "Freitag" },
  { key: "saturday", label: "Samstag" },
  { key: "sunday", label: "Sonntag" },
];

const LANGUAGE_OPTIONS = [
  "Deutsch",
  "Englisch",
  "Türkisch",
  "Arabisch",
  "Bosnisch/Kroatisch/Serbisch",
  "Französisch",
  "Spanisch",
  "Italienisch",
  "Rumänisch",
  "Ukrainisch",
];

const INSURANCE_OPTIONS = ["OEGK", "Wahlarzt", "Privat", "SVS", "BVAEB", "KFA", "Selbstzahler"];

const EXPERTISE_OPTIONS = [
  "Allgemeinmedizin",
  "Vorsorgeuntersuchung",
  "Akutsprechstunde",
  "Chronische Erkrankungen",
  "Impfberatung",
  "Dermatologie",
  "Orthopädie",
  "Kardiologie",
  "HNO",
  "Gynäkologie",
  "Kinderheilkunde",
  "Urologie",
  "Psychiatrie/Psychotherapie",
  "Innere Medizin",
  "Reisemedizin",
  "Labordiagnostik",
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
    expertise: ["Akutsprechstunde", "Vorsorgeuntersuchung", "Verlaufskontrollen"],
    languages: ["Deutsch", "Englisch"],
    insuranceModels: ["OEGK", "Privat"],
    emergencyNote: "Bei akuten Beschwerden bitte vorab telefonisch Kontakt aufnehmen.",
    facebook: "",
    instagram: "",
    tiktok: "",
  };
}

function getDefaultAvailability(): AvailabilityForm {
  return {
    monday: { isClosed: false, opensAt: "08:30", closesAt: "16:00" },
    tuesday: { isClosed: false, opensAt: "08:30", closesAt: "16:00" },
    wednesday: { isClosed: false, opensAt: "08:30", closesAt: "16:00" },
    thursday: { isClosed: false, opensAt: "08:30", closesAt: "16:00" },
    friday: { isClosed: false, opensAt: "08:30", closesAt: "13:00" },
    saturday: { isClosed: true, opensAt: "09:00", closesAt: "12:00" },
    sunday: { isClosed: true, opensAt: "09:00", closesAt: "12:00" },
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

function normalizeStoredProfile(rawProfile: LegacyProfileForm | null, doctor: ArztDashboardDoctor): ProfileForm {
  const fallback = getDefaultProfile(doctor);
  if (!rawProfile) {
    return fallback;
  }

  const expertise = Array.isArray(rawProfile.expertise)
    ? rawProfile.expertise
    : typeof rawProfile.expertise === "string"
      ? rawProfile.expertise
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : fallback.expertise;

  const languages = Array.isArray(rawProfile.languages)
    ? rawProfile.languages
    : typeof rawProfile.languages === "string"
      ? rawProfile.languages
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : fallback.languages;

  const insuranceModels = Array.isArray(rawProfile.insuranceModels)
    ? rawProfile.insuranceModels
    : typeof rawProfile.insuranceModels === "string"
      ? rawProfile.insuranceModels
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : fallback.insuranceModels;

  return {
    ...fallback,
    ...rawProfile,
    expertise,
    languages,
    insuranceModels,
  };
}

function normalizeTime(value: string, fallback: string) {
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return value;
  }
  return fallback;
}

function normalizeStoredAvailability(rawAvailability: LegacyAvailabilityForm | null): AvailabilityForm {
  const fallback = getDefaultAvailability();

  if (!rawAvailability) {
    return fallback;
  }

  const next = { ...fallback };

  for (const { key } of WEEKDAY_CONFIG) {
    const rawValue = rawAvailability[key];
    const dayFallback = fallback[key];

    if (typeof rawValue === "string") {
      if (rawValue.toLowerCase().includes("geschlossen")) {
        next[key] = { ...dayFallback, isClosed: true };
        continue;
      }

      const match = rawValue.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      if (match) {
        next[key] = {
          isClosed: false,
          opensAt: normalizeTime(match[1].padStart(5, "0"), dayFallback.opensAt),
          closesAt: normalizeTime(match[2].padStart(5, "0"), dayFallback.closesAt),
        };
      }
      continue;
    }

    if (rawValue && typeof rawValue === "object") {
      const day = rawValue as Partial<DailyHours>;
      next[key] = {
        isClosed: Boolean(day.isClosed),
        opensAt: normalizeTime(typeof day.opensAt === "string" ? day.opensAt : dayFallback.opensAt, dayFallback.opensAt),
        closesAt: normalizeTime(typeof day.closesAt === "string" ? day.closesAt : dayFallback.closesAt, dayFallback.closesAt),
      };
    }
  }

  return next;
}

function toggleSelection(current: string[], value: string) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
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
  const [leistungen, setLeistungen] = useState<LeistungItem[]>([]);
  const [newLeistung, setNewLeistung] = useState("");
  const [savedLeistungen, setSavedLeistungen] = useState(false);

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
    const leistungenStorageKey = `terminboerse_arzt_services_${selectedDoctor.id}`;

    const storedProfile = readJsonFromStorage<LegacyProfileForm>(profileStorageKey);
    const storedAvailability = readJsonFromStorage<LegacyAvailabilityForm>(availabilityStorageKey);
    const storedAppointmentSettings = readJsonFromStorage<AppointmentForm>(appointmentStorageKey);
    const storedLeistungen = readJsonFromStorage<LeistungItem[]>(leistungenStorageKey);

    setProfileForm(normalizeStoredProfile(storedProfile, selectedDoctor));
    setAvailabilityForm(normalizeStoredAvailability(storedAvailability));
    setAppointmentForm(storedAppointmentSettings ?? getDefaultAppointmentSettings());
    setLeistungen(Array.isArray(storedLeistungen) ? storedLeistungen : []);
    setNewLeistung("");
    setSavedProfile(false);
    setSavedAvailability(false);
    setSavedAppointments(false);
    setSavedLeistungen(false);
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

  function addLeistung() {
    const title = newLeistung.trim();
    if (!title) {
      return;
    }
    setLeistungen((prev) => [...prev, { id: crypto.randomUUID(), title }]);
    setNewLeistung("");
  }

  function updateLeistung(id: string, title: string) {
    setLeistungen((prev) => prev.map((item) => (item.id === id ? { ...item, title } : item)));
  }

  function removeLeistung(id: string) {
    setLeistungen((prev) => prev.filter((item) => item.id !== id));
  }

  function saveLeistungen() {
    const leistungenStorageKey = `terminboerse_arzt_services_${selectedDoctor.id}`;
    const cleaned = leistungen
      .map((item) => ({ ...item, title: item.title.trim() }))
      .filter((item) => item.title.length > 0);

    localStorage.setItem(leistungenStorageKey, JSON.stringify(cleaned));
    setLeistungen(cleaned);
    setSavedLeistungen(true);
    window.setTimeout(() => setSavedLeistungen(false), 1800);
  }

  const expertiseList = profileForm.expertise;
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
            onClick={() => setActiveTab("leistungen")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "leistungen"
                ? "bg-violet-700 text-white"
                : "bg-violet-100 text-violet-800 hover:bg-violet-200"
            }`}
          >
            Leistungen
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("termine")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "termine" ? "bg-sky-700 text-white" : "bg-sky-100 text-sky-800 hover:bg-sky-200"
            }`}
          >
            Termine
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
                  <span className="mb-1 block text-slate-600">Über mich</span>
                  <textarea
                    value={profileForm.about}
                    onChange={(event) => setProfileForm((prev) => (prev ? { ...prev, about: event.target.value } : prev))}
                    className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Spezialisierungen (Komma-getrennt)</span>
                  <input
                    value={profileForm.expertise}
                    onChange={() => undefined}
                    className="hidden"
                  />
                  <details className="rounded-xl border border-slate-300 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm text-slate-700">
                      <span>Spezialisierungen auswählen</span>
                      <ChevronDown className="h-4 w-4" />
                    </summary>
                    <div className="border-t border-slate-200 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {EXPERTISE_OPTIONS.map((option) => (
                          <label key={option} className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={profileForm.expertise.includes(option)}
                              onChange={() =>
                                setProfileForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        expertise: toggleSelection(prev.expertise, option),
                                      }
                                    : prev,
                                )
                              }
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profileForm.expertise.length > 0 ? (
                      profileForm.expertise.map((item) => (
                        <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Keine Spezialisierung gewählt</span>
                    )}
                  </div>
                </label>

                <div className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Sprachen (Mehrfachauswahl)</span>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((language) => {
                      const isActive = profileForm.languages.includes(language);
                      return (
                        <button
                          key={language}
                          type="button"
                          onClick={() =>
                            setProfileForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    languages: toggleSelection(prev.languages, language),
                                  }
                                : prev,
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            isActive ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {language}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">Versicherungsmodelle (Mehrfachauswahl)</span>
                  <div className="flex flex-wrap gap-2">
                    {INSURANCE_OPTIONS.map((insurance) => {
                      const isActive = profileForm.insuranceModels.includes(insurance);
                      return (
                        <button
                          key={insurance}
                          type="button"
                          onClick={() =>
                            setProfileForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    insuranceModels: toggleSelection(prev.insuranceModels, insurance),
                                  }
                                : prev,
                            )
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            isActive ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          }`}
                        >
                          {insurance}
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                  <span className="mb-1 block text-slate-600">Hinweis für Akutfälle</span>
                  <textarea
                    value={profileForm.emergencyNote}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, emergencyNote: event.target.value } : prev))
                    }
                    className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Facebook</span>
                  <input
                    value={profileForm.facebook}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, facebook: event.target.value } : prev))
                    }
                    placeholder="https://facebook.com/...."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Instagram</span>
                  <input
                    value={profileForm.instagram}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, instagram: event.target.value } : prev))
                    }
                    placeholder="https://instagram.com/...."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-600">TikTok</span>
                  <input
                    value={profileForm.tiktok}
                    onChange={(event) =>
                      setProfileForm((prev) => (prev ? { ...prev, tiktok: event.target.value } : prev))
                    }
                    placeholder="https://tiktok.com/@...."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
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
                    <div key={item.key} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={availabilityForm[item.key].isClosed}
                            onChange={(event) =>
                              setAvailabilityForm((prev) => ({
                                ...prev,
                                [item.key]: {
                                  ...prev[item.key],
                                  isClosed: event.target.checked,
                                },
                              }))
                            }
                          />
                          Geschlossen
                        </label>
                      </div>

                      {!availabilityForm[item.key].isClosed ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="block text-xs text-slate-600">
                            Öffnet
                            <input
                              type="time"
                              step={300}
                              value={availabilityForm[item.key].opensAt}
                              onChange={(event) =>
                                setAvailabilityForm((prev) => ({
                                  ...prev,
                                  [item.key]: {
                                    ...prev[item.key],
                                    opensAt: normalizeTime(event.target.value, prev[item.key].opensAt),
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring"
                            />
                          </label>
                          <label className="block text-xs text-slate-600">
                            Schließt
                            <input
                              type="time"
                              step={300}
                              value={availabilityForm[item.key].closesAt}
                              onChange={(event) =>
                                setAvailabilityForm((prev) => ({
                                  ...prev,
                                  [item.key]: {
                                    ...prev[item.key],
                                    closesAt: normalizeTime(event.target.value, prev[item.key].closesAt),
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring"
                            />
                          </label>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">An diesem Tag ist die Praxis geschlossen.</p>
                      )}
                    </div>
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
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Spezialisierungen</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {expertiseList.map((item) => (
                      <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sprachen</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profileForm.languages.length > 0 ? (
                      profileForm.languages.map((item) => (
                        <span key={item} className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Nicht angegeben</span>
                    )}
                  </div>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Versicherung</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profileForm.insuranceModels.length > 0 ? (
                      profileForm.insuranceModels.map((item) => (
                        <span key={item} className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Nicht angegeben</span>
                    )}
                  </div>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sprechzeiten</p>
                  <div className="mt-2 space-y-1">
                    {WEEKDAY_CONFIG.map((day) => (
                      <p key={day.key} className="text-xs text-slate-600">
                        {day.label}: {availabilityForm[day.key].isClosed ? "Geschlossen" : `${availabilityForm[day.key].opensAt} - ${availabilityForm[day.key].closesAt}`}
                      </p>
                    ))}
                  </div>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Social Media</p>
                  <p className="mt-1 text-xs text-slate-600">Facebook: {profileForm.facebook || "Nicht angegeben"}</p>
                  <p className="mt-1 text-xs text-slate-600">Instagram: {profileForm.instagram || "Nicht angegeben"}</p>
                  <p className="mt-1 text-xs text-slate-600">TikTok: {profileForm.tiktok || "Nicht angegeben"}</p>
                </div>
              </article>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "termine" ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <CalendarPlus2 className="h-5 w-5 text-sky-700" />
              Termin-Einstellungen
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Slot-Dauer (Minuten)</span>
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
                <span className="mb-1 block text-slate-600">Puffer (Minuten)</span>
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
                <span className="mb-1 block text-slate-600">Storno-Frist (Stunden)</span>
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
                <span className="mb-1 block text-slate-600">Terminarten (Komma-getrennt)</span>
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
                <span className="mb-1 block text-slate-600">Hinweis vor dem Termin</span>
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
                Termin-Einstellungen speichern
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
              <h2 className="text-lg font-bold text-slate-900">Termin-Vorschau</h2>
              <p className="mt-2 text-sm text-slate-700">Aktive Parameter für automatische Slot-Erzeugung.</p>
              <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-4 text-sm text-slate-700">
                <p>Slot: {appointmentForm.slotDurationMinutes} Min</p>
                <p>Buffer: {appointmentForm.bufferMinutes} Min</p>
                <p>Storno: {appointmentForm.cancellationHours} Stunden vorher</p>
                <p>Neue Patienten: {appointmentForm.acceptsNewPatients ? "Ja" : "Nein"}</p>
                <p>Online Termine: {appointmentForm.onlineAppointments ? "Ja" : "Nein"}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Terminarten</p>
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

      {activeTab === "leistungen" ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Leistungen verwalten</h2>
            <p className="mt-2 text-sm text-slate-600">
              Erfasse alle angebotenen Leistungen, z. B. Botox, Zahnkronen, Vorsorge oder Spezialbehandlungen.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                value={newLeistung}
                onChange={(event) => setNewLeistung(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLeistung();
                  }
                }}
                placeholder="Neue Leistung eingeben"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring"
              />
              <button
                type="button"
                onClick={addLeistung}
                className="inline-flex items-center gap-1 rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-600"
              >
                <Plus className="h-4 w-4" />
                Hinzufügen
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {leistungen.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Noch keine Leistungen angelegt.
                </p>
              ) : (
                leistungen.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                    <input
                      value={item.title}
                      onChange={(event) => updateLeistung(item.id, event.target.value)}
                      className="w-full text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeLeistung(item.id)}
                      className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50"
                      aria-label="Leistung löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={saveLeistungen}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <Save className="h-4 w-4" />
                Leistungen speichern
              </button>
              {savedLeistungen ? (
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Gespeichert
                </p>
              ) : null}
            </div>
          </article>

          <article className="rounded-[2rem] border border-violet-200 bg-violet-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Leistungs-Vorschau</h2>
            <p className="mt-2 text-sm text-slate-700">So werden die Leistungen später auf dem Profil dargestellt.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {leistungen.length > 0 ? (
                leistungen
                  .filter((item) => item.title.trim().length > 0)
                  .map((item) => (
                    <span key={item.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet-800">
                      {item.title}
                    </span>
                  ))
              ) : (
                <span className="text-sm text-slate-600">Noch keine Leistungen vorhanden.</span>
              )}
            </div>
          </article>
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
