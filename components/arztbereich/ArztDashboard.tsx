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
  role?: "admin" | "doctor";
  authToken?: string;
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

type ApprovalItem = {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  registrationType: "existing" | "new";
  selectedDoctorId?: string;
  doctorName?: string;
  doctorEmail: string;
  doctorPhone: string;
  specialty?: string;
  clinicAddress?: string;
  district?: string;
  providerType: "OEGK" | "Wahlarzt" | "Privat";
  note?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedDoctorId?: string;
};

type LeistungItem = {
  id: string;
  title: string;
  description: string;
  durationMinutes: string;
  priceInfo: string;
};

type LegacyLeistungItem =
  | string
  | {
      id?: string;
      title?: string;
      description?: string;
      durationMinutes?: string | number;
      priceInfo?: string;
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

function getEmptyProfile(): ProfileForm {
  return {
    name: "",
    specialty: "",
    district: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    about: "",
    expertise: [],
    languages: ["Deutsch"],
    insuranceModels: ["OEGK"],
    emergencyNote: "",
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

function createClientId() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function normalizeStoredLeistungen(rawLeistungen: LegacyLeistungItem[] | null): LeistungItem[] {
  if (!Array.isArray(rawLeistungen)) {
    return [];
  }

  return rawLeistungen
    .map((entry) => {
      if (typeof entry === "string") {
        const title = entry.trim();
        if (!title) {
          return null;
        }
        return {
          id: createClientId(),
          title,
          description: "",
          durationMinutes: "",
          priceInfo: "",
        } satisfies LeistungItem;
      }

      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      if (!title) {
        return null;
      }

      return {
        id: typeof entry.id === "string" && entry.id.length > 0 ? entry.id : createClientId(),
        title,
        description: typeof entry.description === "string" ? entry.description : "",
        durationMinutes:
          typeof entry.durationMinutes === "number"
            ? String(entry.durationMinutes)
            : typeof entry.durationMinutes === "string"
              ? entry.durationMinutes
              : "",
        priceInfo: typeof entry.priceInfo === "string" ? entry.priceInfo : "",
      } satisfies LeistungItem;
    })
    .filter((item): item is LeistungItem => item !== null);
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

export function ArztDashboard({ doctors, role, authToken }: ArztDashboardProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [remoteSearchDoctors, setRemoteSearchDoctors] = useState<ArztDashboardDoctor[]>([]);
  const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
  const [doctorSearchError, setDoctorSearchError] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("profil");
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>(getDefaultAvailability());
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>(getDefaultAppointmentSettings());
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedAvailability, setSavedAvailability] = useState(false);
  const [savedAppointments, setSavedAppointments] = useState(false);
  const [leistungen, setLeistungen] = useState<LeistungItem[]>([]);
  const [newLeistungTitle, setNewLeistungTitle] = useState("");
  const [savedLeistungen, setSavedLeistungen] = useState(false);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");

  const selectableDoctors = useMemo(() => {
    const map = new Map<string, ArztDashboardDoctor>();
    for (const doctor of doctors) {
      map.set(doctor.id, doctor);
    }
    for (const doctor of remoteSearchDoctors) {
      map.set(doctor.id, doctor);
    }
    return Array.from(map.values());
  }, [doctors, remoteSearchDoctors]);

  const selectedDoctor = useMemo(
    () => selectableDoctors.find((doctor) => doctor.id === selectedDoctorId) ?? null,
    [selectableDoctors, selectedDoctorId],
  );

  const normalizedSearchTerm = doctorSearchTerm.trim().toLowerCase();
  const isSearchReady = normalizedSearchTerm.length >= 3;

  const filteredDoctors = useMemo(() => {
    if (!isSearchReady) {
      return [];
    }

    if (role === "admin") {
      return remoteSearchDoctors;
    }

    const matches = doctors.filter((doctor) => {
      const searchable = `${doctor.name} ${doctor.specialty} ${doctor.district} ${doctor.address}`.toLowerCase();
      return searchable.includes(normalizedSearchTerm);
    });

    return matches
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(normalizedSearchTerm) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(normalizedSearchTerm) ? 0 : 1;
        if (aStarts !== bStarts) {
          return aStarts - bStarts;
        }
        return a.name.localeCompare(b.name, "de");
      })
      .slice(0, 25);
  }, [doctors, isSearchReady, normalizedSearchTerm, remoteSearchDoctors, role]);

  useEffect(() => {
    async function runSearch() {
      if (role !== "admin") {
        setDoctorSearchError("");
        setRemoteSearchDoctors([]);
        return;
      }

      if (!isSearchReady || !authToken) {
        setDoctorSearchError("");
        setRemoteSearchDoctors([]);
        return;
      }

      setIsSearchingDoctors(true);
      setDoctorSearchError("");

      try {
        const response = await fetch("/api/arztbereich/search-doctors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: authToken, query: doctorSearchTerm, limit: 25 }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          doctors?: ArztDashboardDoctor[];
        };

        if (!response.ok || !payload.ok || !Array.isArray(payload.doctors)) {
          throw new Error(payload.error ?? "Suche fehlgeschlagen.");
        }

        setRemoteSearchDoctors(payload.doctors);
      } catch (error) {
        setDoctorSearchError(error instanceof Error ? error.message : "Suche fehlgeschlagen.");
        setRemoteSearchDoctors([]);
      } finally {
        setIsSearchingDoctors(false);
      }
    }

    void runSearch();
  }, [role, isSearchReady, authToken, doctorSearchTerm]);

  const incomingRequests = useMemo(() => {
    if (!selectedDoctor) {
      return [];
    }
    return getMockRequestsForDoctor(selectedDoctor);
  }, [selectedDoctor]);

  useEffect(() => {
    const profileStorageKey = selectedDoctor
      ? `terminboerse_arzt_profile_${selectedDoctor.id}`
      : "terminboerse_arzt_profile_draft_new";
    const availabilityStorageKey = selectedDoctor
      ? `terminboerse_arzt_availability_${selectedDoctor.id}`
      : "terminboerse_arzt_availability_draft_new";
    const appointmentStorageKey = selectedDoctor
      ? `terminboerse_arzt_appointments_${selectedDoctor.id}`
      : "terminboerse_arzt_appointments_draft_new";
    const leistungenStorageKey = selectedDoctor
      ? `terminboerse_arzt_services_${selectedDoctor.id}`
      : "terminboerse_arzt_services_draft_new";

    const storedProfile = readJsonFromStorage<LegacyProfileForm>(profileStorageKey);
    const storedAvailability = readJsonFromStorage<LegacyAvailabilityForm>(availabilityStorageKey);
    const storedAppointmentSettings = readJsonFromStorage<AppointmentForm>(appointmentStorageKey);
    const storedLeistungen = readJsonFromStorage<LegacyLeistungItem[]>(leistungenStorageKey);

    const fallbackDoctor: ArztDashboardDoctor = selectedDoctor ?? {
      id: "draft-new",
      name: "",
      specialty: "",
      district: "",
      address: "",
      providerType: "OEGK",
    };

    const nextProfile = selectedDoctor
      ? normalizeStoredProfile(storedProfile, selectedDoctor)
      : {
          ...getEmptyProfile(),
          ...normalizeStoredProfile(storedProfile, fallbackDoctor),
          name: storedProfile?.name?.trim() ?? "",
          specialty: storedProfile?.specialty?.trim() ?? "",
          district: storedProfile?.district?.trim() ?? "",
          address: storedProfile?.address?.trim() ?? "",
          about: storedProfile?.about?.trim() ?? "",
        };

    setProfileForm(nextProfile);
    setAvailabilityForm(normalizeStoredAvailability(storedAvailability));
    setAppointmentForm(storedAppointmentSettings ?? getDefaultAppointmentSettings());
    setLeistungen(normalizeStoredLeistungen(storedLeistungen));
    setNewLeistungTitle("");
    setSavedProfile(false);
    setSavedAvailability(false);
    setSavedAppointments(false);
    setSavedLeistungen(false);
  }, [selectedDoctor]);

  if (!profileForm) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          Kein Arztprofil verfuegbar. Bitte pruefe die Datenquelle.
        </section>
      </main>
    );
  }

  const profileUrl = selectedDoctor
    ? `/arzt/${encodeURIComponent(
        getDoctorSeoSlug({
          id: selectedDoctor.id,
          name: profileForm.name,
          specialty: profileForm.specialty,
          district: profileForm.district,
        }),
      )}`
    : null;

  function saveProfile() {
    const profileStorageKey = selectedDoctor
      ? `terminboerse_arzt_profile_${selectedDoctor.id}`
      : "terminboerse_arzt_profile_draft_new";
    localStorage.setItem(profileStorageKey, JSON.stringify(profileForm));
    setSavedProfile(true);
    window.setTimeout(() => setSavedProfile(false), 1800);
  }

  function saveAvailability() {
    const availabilityStorageKey = selectedDoctor
      ? `terminboerse_arzt_availability_${selectedDoctor.id}`
      : "terminboerse_arzt_availability_draft_new";
    localStorage.setItem(availabilityStorageKey, JSON.stringify(availabilityForm));
    setSavedAvailability(true);
    window.setTimeout(() => setSavedAvailability(false), 1800);
  }

  function saveAppointments() {
    const appointmentStorageKey = selectedDoctor
      ? `terminboerse_arzt_appointments_${selectedDoctor.id}`
      : "terminboerse_arzt_appointments_draft_new";
    localStorage.setItem(appointmentStorageKey, JSON.stringify(appointmentForm));
    setSavedAppointments(true);
    window.setTimeout(() => setSavedAppointments(false), 1800);
  }

  function addLeistung() {
    const title = newLeistungTitle.trim();
    if (!title) {
      return;
    }
    setLeistungen((prev) => [
      ...prev,
      {
        id: createClientId(),
        title,
        description: "",
        durationMinutes: "",
        priceInfo: "",
      },
    ]);
    setNewLeistungTitle("");
  }

  function updateLeistung(id: string, patch: Partial<LeistungItem>) {
    setLeistungen((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeLeistung(id: string) {
    setLeistungen((prev) => prev.filter((item) => item.id !== id));
  }

  function saveLeistungen() {
    const leistungenStorageKey = selectedDoctor
      ? `terminboerse_arzt_services_${selectedDoctor.id}`
      : "terminboerse_arzt_services_draft_new";
    const cleaned = leistungen
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        description: item.description.trim(),
        durationMinutes: item.durationMinutes.trim(),
        priceInfo: item.priceInfo.trim(),
      }))
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

  async function loadApprovals() {
    if (!authToken || role !== "admin") {
      return;
    }

    setIsLoadingApprovals(true);
    setApprovalsError("");

    try {
      const response = await fetch("/api/arztbereich/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: authToken }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        requests?: ApprovalItem[];
      };

      if (!response.ok || !payload.ok || !Array.isArray(payload.requests)) {
        throw new Error(payload.error ?? "Freigaben konnten nicht geladen werden.");
      }

      setApprovalItems(payload.requests);
    } catch (error) {
      setApprovalsError(error instanceof Error ? error.message : "Freigaben konnten nicht geladen werden.");
    } finally {
      setIsLoadingApprovals(false);
    }
  }

  async function reviewApproval(requestId: string, decision: "approve" | "reject") {
    if (!authToken || role !== "admin") {
      return;
    }

    setApprovalsError("");

    try {
      const response = await fetch("/api/arztbereich/approvals/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: authToken, requestId, decision }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Aktion fehlgeschlagen.");
      }

      await loadApprovals();
    } catch (error) {
      setApprovalsError(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    }
  }

  useEffect(() => {
    if (role === "admin" && activeTab === "profil") {
      void loadApprovals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, role]);

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

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="grid gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-700">Profil suchen</span>
              <input
                value={doctorSearchTerm}
                onChange={(event) => setDoctorSearchTerm(event.target.value)}
                placeholder="Name, Fachbereich, Bezirk..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            {doctorSearchTerm.trim().length > 0 && !isSearchReady ? (
              <p className="text-xs font-medium text-slate-500">Mindestens 3 Zeichen eingeben, dann erscheinen Treffer.</p>
            ) : null}

            {isSearchingDoctors ? <p className="text-xs font-medium text-slate-500">Suche läuft...</p> : null}
            {doctorSearchError ? <p className="text-xs font-semibold text-rose-700">{doctorSearchError}</p> : null}

            {isSearchReady ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                {filteredDoctors.length > 0 ? (
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
                    {filteredDoctors.map((doctor) => (
                      <li key={doctor.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doctor.id);
                            setDoctorSearchTerm(doctor.name);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm transition hover:bg-sky-50 ${
                            selectedDoctorId === doctor.id ? "bg-sky-50" : ""
                          }`}
                        >
                          <p className="font-semibold text-slate-900">{doctor.name}</p>
                          <p className="text-xs text-slate-600">
                            {doctor.specialty} - {doctor.district}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs font-medium text-amber-700">Keine Treffer gefunden.</p>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctorId("");
                  setDoctorSearchTerm("");
                }}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Leeres Profil (neu)
              </button>
              {selectedDoctor ? (
                <span className="text-xs font-medium text-slate-600">
                  Ausgewählt: {selectedDoctor.name} ({selectedDoctor.specialty})
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700">Aktiv: Leeres Profil</span>
              )}
            </div>
          </div>

          {profileUrl ? (
            <Link
              href={profileUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              <Eye className="h-4 w-4" />
              Oeffentliches Profil ansehen
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedDoctorId("");
                setDoctorSearchTerm("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Neues Profil bearbeiten
            </button>
          )}
        </div>

        {!selectedDoctor ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Du bearbeitest gerade ein leeres Profil. Über die Suche kannst du ein vorhandenes Profil auswählen.
          </p>
        ) : null}

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

              {role === "admin" ? (
                <article className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Wartende Freischaltungen</h2>
                    <button
                      type="button"
                      onClick={() => void loadApprovals()}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Aktualisieren
                    </button>
                  </div>

                  {approvalsError ? <p className="mt-3 text-sm font-semibold text-rose-700">{approvalsError}</p> : null}
                  {isLoadingApprovals ? <p className="mt-3 text-sm text-slate-600">Lädt...</p> : null}

                  <div className="mt-4 grid gap-3">
                    {approvalItems.length > 0 ? (
                      approvalItems.map((item) => (
                        <article key={item.id} className="rounded-xl border border-amber-200 bg-white p-3 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-900">{item.doctorName || item.doctorEmail}</p>
                              <p className="text-slate-700">{item.doctorEmail}</p>
                              <p className="text-slate-600">
                                Typ: {item.registrationType === "existing" ? "Bestehendes Profil" : "Neues Profil"}
                              </p>
                              {item.selectedDoctorId ? <p className="text-slate-600">Profil-ID: {item.selectedDoctorId}</p> : null}
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                item.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : item.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {item.status === "pending" ? "Ausstehend" : item.status === "approved" ? "Genehmigt" : "Abgelehnt"}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>

                          {item.status === "pending" ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void reviewApproval(item.id, "approve")}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                              >
                                Freigeben
                              </button>
                              <button
                                type="button"
                                onClick={() => void reviewApproval(item.id, "reject")}
                                className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                              >
                                Ablehnen
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      !isLoadingApprovals ? <p className="text-sm text-slate-600">Aktuell keine Registrierungsanfragen.</p> : null
                    )}
                  </div>
                </article>
              ) : null}

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
                value={newLeistungTitle}
                onChange={(event) => setNewLeistungTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLeistung();
                  }
                }}
                placeholder="Leistungstitel eingeben (z. B. Botox)"
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
                  <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <input
                        value={item.title}
                        onChange={(event) => updateLeistung(item.id, { title: event.target.value })}
                        placeholder="Leistungstitel"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring"
                      />
                      <button
                        type="button"
                        onClick={() => removeLeistung(item.id)}
                        className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                        aria-label="Leistung löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <label className="mt-2 block text-xs text-slate-600">
                      Beschreibung
                      <textarea
                        value={item.description}
                        onChange={(event) => updateLeistung(item.id, { description: event.target.value })}
                        placeholder="Details zur Leistung, Ablauf, Zielgruppe, Hinweise"
                        className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring"
                      />
                    </label>

                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="block text-xs text-slate-600">
                        Dauer (Minuten, optional)
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={item.durationMinutes}
                          onChange={(event) => updateLeistung(item.id, { durationMinutes: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring"
                        />
                      </label>
                      <label className="block text-xs text-slate-600">
                        Preisinfo (optional)
                        <input
                          value={item.priceInfo}
                          onChange={(event) => updateLeistung(item.id, { priceInfo: event.target.value })}
                          placeholder="z. B. ab 180 EUR"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-300 focus:ring"
                        />
                      </label>
                    </div>
                  </article>
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
            <div className="mt-4 space-y-3">
              {leistungen.length > 0 ? (
                leistungen
                  .filter((item) => item.title.trim().length > 0)
                  .map((item) => (
                    <article key={item.id} className="rounded-xl border border-violet-200 bg-white p-3 text-sm text-slate-700">
                      <span className="inline-flex rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800">
                        {item.title}
                      </span>
                      {item.description ? <p className="mt-2">{item.description}</p> : null}
                      {item.durationMinutes || item.priceInfo ? (
                        <p className="mt-2 text-xs text-slate-600">
                          {item.durationMinutes ? `Dauer: ${item.durationMinutes} Min` : ""}
                          {item.durationMinutes && item.priceInfo ? " • " : ""}
                          {item.priceInfo ? `Preis: ${item.priceInfo}` : ""}
                        </p>
                      ) : null}
                    </article>
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
