"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

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
  selectedDoctorName?: string;
  approvedDoctorName?: string;
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
};

type AppointmentForm = {
  appointmentTypes: string;
  acceptsNewPatients: boolean;
  hasVideoConsultation: boolean;
  bookingNote: string;
};

type WorkingHourDay = {
  isClosed: boolean;
  start: string;
  end: string;
};

type WorkingHoursForm = {
  monday: WorkingHourDay;
  tuesday: WorkingHourDay;
  wednesday: WorkingHourDay;
  thursday: WorkingHourDay;
  friday: WorkingHourDay;
  saturday: WorkingHourDay;
  sunday: WorkingHourDay;
};

type DoctorSlot = {
  id?: string;
  start: string;
  end: string;
};

type ManualSlotsPayload = {
  ok?: boolean;
  error?: string;
  slots?: DoctorSlot[];
};

type ManagedAppointmentStatus = "confirmed" | "pending" | "blocked";

type ManagedAppointment = {
  id: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  type: string;
  status: ManagedAppointmentStatus;
  note?: string;
  googleEventId?: string;
  syncState?: "synced" | "failed";
  syncError?: string;
};

type QueueRequest = {
  id: string;
  patientName: string;
  preferredStart: string;
  preferredEnd: string;
  reason: string;
};

type LeistungItem = {
  id: string;
  title: string;
  description: string;
  durationMinutes: string;
  priceInfo: string;
};

type CommunityComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

type DoctorCommunitySnapshot = {
  doctorId: string;
  averageRating: number;
  ratingsCount: number;
  viewsCount: number;
  lastComments: CommunityComment[];
  canRate: boolean;
};

type PublicDoctorSchedulingStatus = {
  doctorId: string;
  isOnboarded: boolean;
  profileUpdated: boolean;
  calendarConnected: boolean;
  calendarId?: string;
  schedulingEnabled: boolean;
  canBookOnline: boolean;
  reason: "not_onboarded" | "profile_incomplete" | "calendar_not_connected" | "scheduling_not_enabled" | "active";
};

type CalendarHealth = {
  googleEmail?: string;
  connectedAt?: string;
  updatedAt?: string;
  accessTokenExpiresAt?: number;
  accessTokenState: "missing" | "valid" | "expired" | "unknown";
  slotSummary?: {
    next24h: number;
    next7d: number;
    generatedAt: string;
  };
  slotSummaryReason?: string;
};

type DashboardTab = "freigaben" | "managed" | "profil" | "termine" | "bewertungen" | "leistungen";
type TermineSubTab = "board" | "settings";
type CalendarViewMode = "week" | "day";
type SlotDayFilter = "all" | "today" | "tomorrow" | "day_after_tomorrow";
type ProfileSlotDay = "today" | "tomorrow" | "day_after_tomorrow";

type ArztDashboardLiteProps = {
  doctors: ArztDashboardDoctor[];
  role?: "admin" | "doctor";
  authToken?: string;
};

const SELECTED_DOCTOR_ID_STORAGE_KEY = "terminboerse_arzt_selected_doctor_id";
const SELECTED_DOCTOR_STORAGE_KEY = "terminboerse_arzt_selected_doctor";

function formatDate(value: string) {
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-AT").format(value);
}

function formatProfileLabel(doctorId?: string, doctorName?: string) {
  if (!doctorId) {
    return "-";
  }

  return doctorName ? `${doctorId} - ${doctorName}` : doctorId;
}

function formatCalendarDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAccessTokenStateLabel(state: CalendarHealth["accessTokenState"]) {
  if (state === "valid") {
    return "Gültig";
  }
  if (state === "expired") {
    return "Abgelaufen";
  }
  if (state === "unknown") {
    return "Unbekannt";
  }
  return "Nicht vorhanden";
}

function readJsonFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `leistung-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDefaultProfile(doctor: ArztDashboardDoctor | null): ProfileForm {
  if (!doctor) {
    return {
      name: "",
      specialty: "",
      district: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      about: "",
    };
  }

  return {
    name: doctor.name,
    specialty: doctor.specialty,
    district: doctor.district,
    address: doctor.address,
    phone: doctor.phone ?? "",
    email: doctor.email ?? "",
    website: doctor.website ?? "",
    about: "",
  };
}

function getDefaultAppointments(): AppointmentForm {
  return {
    appointmentTypes: "Erstgespraech, Kontrolltermin",
    acceptsNewPatients: true,
    hasVideoConsultation: false,
    bookingNote: "",
  };
}

const WORKING_HOURS_CONFIG: Array<{ key: keyof WorkingHoursForm; label: string }> = [
  { key: "monday", label: "Montag" },
  { key: "tuesday", label: "Dienstag" },
  { key: "wednesday", label: "Mittwoch" },
  { key: "thursday", label: "Donnerstag" },
  { key: "friday", label: "Freitag" },
  { key: "saturday", label: "Samstag" },
  { key: "sunday", label: "Sonntag" },
];

function getDefaultWorkingHours(): WorkingHoursForm {
  return {
    monday: { isClosed: false, start: "08:00", end: "17:00" },
    tuesday: { isClosed: false, start: "08:00", end: "17:00" },
    wednesday: { isClosed: false, start: "08:00", end: "17:00" },
    thursday: { isClosed: false, start: "08:00", end: "17:00" },
    friday: { isClosed: false, start: "08:00", end: "17:00" },
    saturday: { isClosed: true, start: "09:00", end: "12:00" },
    sunday: { isClosed: true, start: "09:00", end: "12:00" },
  };
}

function getSchedulingReasonLabel(reason: PublicDoctorSchedulingStatus["reason"]) {
  if (reason === "not_onboarded") {
    return "Noch nicht freigeschaltet: Bis zur Aktivierung bleibt das Profil für Online-Slots gesperrt.";
  }
  if (reason === "profile_incomplete") {
    return "Profil-Setup unvollständig: Speichere die Profildaten, um den nächsten Schritt freizuschalten.";
  }
  if (reason === "calendar_not_connected") {
    return "Synchron-Kalender ist derzeit deaktiviert. Freie Slots werden manuell gepflegt.";
  }
  if (reason === "scheduling_not_enabled") {
    return "Online-Buchung ist pausiert. Aktiviere die Terminfreigabe, um Slots zu veröffentlichen.";
  }
  return "Online-Terminbuchung ist aktiv.";
}

function computeProfileCompletion(profileForm: ProfileForm) {
  const checks = [
    { label: "Name", valid: profileForm.name.trim().length >= 3 },
    { label: "Fachbereich", valid: profileForm.specialty.trim().length >= 3 },
    { label: "Bezirk", valid: profileForm.district.trim().length >= 2 },
    { label: "Adresse", valid: profileForm.address.trim().length >= 6 },
    { label: "Telefon", valid: profileForm.phone.trim().length >= 6 },
    { label: "E-Mail", valid: profileForm.email.trim().includes("@") },
    { label: "Website", valid: profileForm.website.trim().length >= 8 },
    { label: "Über mich", valid: profileForm.about.trim().length >= 80 },
  ];

  const completed = checks.filter((item) => item.valid).length;
  const total = checks.length;
  const percent = Math.round((completed / total) * 100);
  const missing = checks.filter((item) => !item.valid).map((item) => item.label);

  return { completed, total, percent, missing };
}

function computeProfileSectionProgress(profileForm: ProfileForm) {
  const basicChecks = [
    profileForm.name.trim().length >= 3,
    profileForm.specialty.trim().length >= 3,
    profileForm.district.trim().length >= 2,
    profileForm.address.trim().length >= 6,
  ];

  const contactChecks = [
    profileForm.phone.trim().length >= 6,
    profileForm.email.trim().includes("@"),
    profileForm.website.trim().length >= 8,
  ];

  const aboutChecks = [profileForm.about.trim().length >= 80];

  const basicDone = basicChecks.filter(Boolean).length;
  const contactDone = contactChecks.filter(Boolean).length;
  const aboutDone = aboutChecks.filter(Boolean).length;

  return {
    basic: { done: basicDone, total: basicChecks.length },
    contact: { done: contactDone, total: contactChecks.length },
    about: { done: aboutDone, total: aboutChecks.length },
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isValidPhone(value: string) {
  const normalized = value.replace(/[\s()./-]/g, "");
  return /^\+?[0-9]{6,15}$/.test(normalized);
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function getDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatWeekdayLabel(value: Date) {
  return new Intl.DateTimeFormat("de-AT", { weekday: "short", day: "2-digit", month: "2-digit" }).format(value);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatRange(start: string, end: string) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function getMinutesSinceStartOfDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return -1;
  }
  return date.getHours() * 60 + date.getMinutes();
}

function getAppointmentTone(status: ManagedAppointmentStatus, type: string) {
  if (status === "blocked") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  const normalized = type.toLowerCase();
  if (normalized.includes("erst")) {
    return "border-violet-200 bg-violet-50 text-violet-900";
  }
  if (normalized.includes("kontroll")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (normalized.includes("video")) {
    return "border-cyan-200 bg-cyan-50 text-cyan-900";
  }
  return status === "pending"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-sky-200 bg-sky-50 text-sky-900";
}

function formatLongDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isSameOrAfterNow(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.getTime() >= Date.now();
}

export function ArztDashboardLite({ doctors, role, authToken }: ArztDashboardLiteProps) {
  const isDoctorRole = role === "doctor";
  const isAdminRole = role === "admin";
  const [activeTab, setActiveTab] = useState<DashboardTab>(isAdminRole ? "freigaben" : "profil");

  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");
  const [editingApprovalId, setEditingApprovalId] = useState("");
  const [editingDoctorId, setEditingDoctorId] = useState("");
  const [isSavingReassign, setIsSavingReassign] = useState(false);

  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
  const [doctorSearchError, setDoctorSearchError] = useState("");
  const [remoteSearchDoctors, setRemoteSearchDoctors] = useState<ArztDashboardDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const [profileForm, setProfileForm] = useState<ProfileForm>(getDefaultProfile(null));
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [workingHoursForm, setWorkingHoursForm] = useState<WorkingHoursForm>(getDefaultWorkingHours());

  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>(getDefaultAppointments());

  const [leistungen, setLeistungen] = useState<LeistungItem[]>([]);
  const [newLeistungTitle, setNewLeistungTitle] = useState("");
  const [savedLeistungen, setSavedLeistungen] = useState(false);

  const [communitySnapshot, setCommunitySnapshot] = useState<DoctorCommunitySnapshot | null>(null);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [communityError, setCommunityError] = useState("");
  const [schedulingStatus, setSchedulingStatus] = useState<PublicDoctorSchedulingStatus | null>(null);
  const [isLoadingSchedulingStatus, setIsLoadingSchedulingStatus] = useState(false);
  const [schedulingStatusError, setSchedulingStatusError] = useState("");
  const [calendarHealth, setCalendarHealth] = useState<CalendarHealth | null>(null);
  const [isSavingSchedulingStatus, setIsSavingSchedulingStatus] = useState(false);
  const [termineSubTab, setTermineSubTab] = useState<TermineSubTab>("board");
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("week");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => startOfWeek(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => getDateKey(new Date()));
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>([]);
  const [slotsStatusReason, setSlotsStatusReason] = useState("");
  const [isLoadingDoctorSlots, setIsLoadingDoctorSlots] = useState(false);
  const [managedAppointments, setManagedAppointments] = useState<ManagedAppointment[]>([]);
  const [requestQueue, setRequestQueue] = useState<QueueRequest[]>([]);
  const [newAppointmentPatient, setNewAppointmentPatient] = useState("");
  const [newAppointmentType, setNewAppointmentType] = useState("Kontrolltermin");
  const [newAppointmentMode, setNewAppointmentMode] = useState<"confirmed" | "blocked">("confirmed");
  const [newAppointmentStart, setNewAppointmentStart] = useState("");
  const [newAppointmentDuration, setNewAppointmentDuration] = useState(30);
  const [newAppointmentNote, setNewAppointmentNote] = useState("");
  const [draggedAppointmentId, setDraggedAppointmentId] = useState("");
  const [boardActionMessage, setBoardActionMessage] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotDuration, setNewSlotDuration] = useState(30);
  const [slotActionError, setSlotActionError] = useState("");
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [slotDayFilter, setSlotDayFilter] = useState<SlotDayFilter>("all");
  const [profileSlotDay, setProfileSlotDay] = useState<ProfileSlotDay>("today");
  const [profileSlotTime, setProfileSlotTime] = useState("15:00");
  const [profileSlotDuration, setProfileSlotDuration] = useState(30);

  useEffect(() => {
    setActiveTab(isAdminRole ? "freigaben" : "profil");
  }, [isAdminRole]);

  useEffect(() => {
    if (activeTab === "termine") {
      setTermineSubTab("board");
      setCalendarViewMode("week");
      setSelectedCalendarDate(getDateKey(new Date()));
    }
  }, [activeTab]);

  const normalizedSearchTerm = doctorSearchTerm.trim().toLowerCase();
  const isSearchReady = normalizedSearchTerm.length >= 3;

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

  const isSchedulingEnabled = Boolean(schedulingStatus?.schedulingEnabled);
  const isTermineEnabled = Boolean(selectedDoctor && isSchedulingEnabled);

  const profileCompletion = useMemo(() => computeProfileCompletion(profileForm), [profileForm]);
  const profileSectionProgress = useMemo(() => computeProfileSectionProgress(profileForm), [profileForm]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(calendarAnchorDate, index));
  }, [calendarAnchorDate]);

  const visibleCalendarDays = useMemo(
    () => (calendarViewMode === "day" ? weekDays.filter((day) => getDateKey(day) === selectedCalendarDate) : weekDays),
    [calendarViewMode, selectedCalendarDate, weekDays],
  );

  const weekStartLabel = useMemo(() => {
    const end = addDays(calendarAnchorDate, 6);
    return `${formatWeekdayLabel(calendarAnchorDate)} - ${formatWeekdayLabel(end)}`;
  }, [calendarAnchorDate]);

  const profileSlotDays = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const today = new Date(now);
    const tomorrow = addDays(now, 1);
    const dayAfterTomorrow = addDays(now, 2);

    return {
      today,
      tomorrow,
      day_after_tomorrow: dayAfterTomorrow,
    };
  }, []);

  const filteredDoctorSlots = useMemo(() => {
    if (slotDayFilter === "all") {
      return doctorSlots;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const offset =
      slotDayFilter === "today" ? 0 : slotDayFilter === "tomorrow" ? 1 : 2;

    const target = addDays(now, offset);
    const targetKey = getDateKey(target);

    return doctorSlots.filter((slot) => {
      const start = new Date(slot.start);
      if (Number.isNaN(start.getTime())) {
        return false;
      }
      return getDateKey(start) === targetKey;
    });
  }, [doctorSlots, slotDayFilter]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, DoctorSlot[]>();

    for (const slot of filteredDoctorSlots) {
      const start = new Date(slot.start);
      if (Number.isNaN(start.getTime())) {
        continue;
      }
      const key = getDateKey(start);
      const current = map.get(key) ?? [];
      current.push(slot);
      map.set(key, current);
    }

    for (const items of map.values()) {
      items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    return map;
  }, [filteredDoctorSlots]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, ManagedAppointment[]>();

    for (const item of managedAppointments) {
      const start = new Date(item.startsAt);
      if (Number.isNaN(start.getTime())) {
        continue;
      }
      const key = getDateKey(start);
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    }

    for (const items of map.values()) {
      items.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }

    return map;
  }, [managedAppointments]);

  const appointmentTypeOptions = useMemo(() => {
    return appointmentForm.appointmentTypes
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }, [appointmentForm.appointmentTypes]);

  const selectedDayAppointments = useMemo(() => {
    const items = appointmentsByDay.get(selectedCalendarDate) ?? [];
    return [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [appointmentsByDay, selectedCalendarDate]);

  const selectedDaySlots = useMemo(() => {
    const items = slotsByDay.get(selectedCalendarDate) ?? [];
    return [...items].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [selectedCalendarDate, slotsByDay]);

  const dayTimelineHours = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => 7 + index);
  }, []);

  const appointmentsByHour = useMemo(() => {
    const map = new Map<number, ManagedAppointment[]>();
    for (const item of selectedDayAppointments) {
      const minutes = getMinutesSinceStartOfDay(item.startsAt);
      if (minutes < 0) {
        continue;
      }
      const hour = Math.floor(minutes / 60);
      if (hour < 7 || hour > 20) {
        continue;
      }
      const current = map.get(hour) ?? [];
      current.push(item);
      map.set(hour, current);
    }

    for (const entries of map.values()) {
      entries.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }

    return map;
  }, [selectedDayAppointments]);

  const slotsByHour = useMemo(() => {
    const map = new Map<number, DoctorSlot[]>();
    for (const slot of selectedDaySlots) {
      const minutes = getMinutesSinceStartOfDay(slot.start);
      if (minutes < 0) {
        continue;
      }
      const hour = Math.floor(minutes / 60);
      if (hour < 7 || hour > 20) {
        continue;
      }
      const current = map.get(hour) ?? [];
      current.push(slot);
      map.set(hour, current);
    }

    for (const entries of map.values()) {
      entries.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    return map;
  }, [selectedDaySlots]);
  const profileFieldErrors = useMemo(() => {
    const email = profileForm.email.trim();
    const phone = profileForm.phone.trim();
    const website = profileForm.website.trim();
    const about = profileForm.about.trim();

    return {
      phone: phone.length > 0 && !isValidPhone(phone) ? "Bitte gültige Telefonnummer eingeben (z. B. +43...)." : "",
      email: email.length > 0 && !isValidEmail(email) ? "Bitte gültige E-Mail-Adresse eingeben." : "",
      website: website.length > 0 && !isValidWebsite(website) ? "Bitte gültige URL mit http:// oder https:// eingeben." : "",
      about: about.length > 0 && about.length < 80 ? "Bitte mindestens 80 Zeichen im Feld Über mich eintragen." : "",
    };
  }, [profileForm]);

  const hasProfileValidationErrors = useMemo(
    () => Object.values(profileFieldErrors).some((error) => error.length > 0),
    [profileFieldErrors],
  );

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

    return matches.slice(0, 25);
  }, [doctors, isSearchReady, normalizedSearchTerm, remoteSearchDoctors, role]);

  useEffect(() => {
    if (role !== "admin" || !authToken || !isSearchReady) {
      if (role !== "admin") {
        setDoctorSearchError("");
      }
      return;
    }

    async function runSearch() {
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
  }, [role, authToken, doctorSearchTerm, isSearchReady]);

  useEffect(() => {
    if (!isDoctorRole) {
      return;
    }

    const assignedDoctor = doctors[0];
    if (!assignedDoctor) {
      setSelectedDoctorId("");
      setDoctorSearchTerm("");
      return;
    }

    if (selectedDoctorId !== assignedDoctor.id) {
      setSelectedDoctorId(assignedDoctor.id);
      setDoctorSearchTerm(assignedDoctor.name);
    }
  }, [isDoctorRole, doctors, selectedDoctorId]);

  useEffect(() => {
    if (typeof window === "undefined" || isDoctorRole) {
      return;
    }

    const storedDoctorId = window.localStorage.getItem(SELECTED_DOCTOR_ID_STORAGE_KEY)?.trim() ?? "";
    const storedDoctor = readJsonFromStorage<ArztDashboardDoctor>(SELECTED_DOCTOR_STORAGE_KEY);

    if (storedDoctor && storedDoctor.id) {
      setRemoteSearchDoctors((prev) => {
        const hasStored = prev.some((item) => item.id === storedDoctor.id);
        return hasStored ? prev : [storedDoctor, ...prev];
      });

      if (!storedDoctorId) {
        setSelectedDoctorId(storedDoctor.id);
      }

      if (!doctorSearchTerm.trim() && storedDoctor.name) {
        setDoctorSearchTerm(storedDoctor.name);
      }
    }

    if (storedDoctorId) {
      setSelectedDoctorId(storedDoctorId);
    }
  }, [isDoctorRole, doctorSearchTerm]);

  useEffect(() => {
    if (typeof window === "undefined" || isDoctorRole) {
      return;
    }

    if (!selectedDoctorId.trim()) {
      window.localStorage.removeItem(SELECTED_DOCTOR_ID_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SELECTED_DOCTOR_ID_STORAGE_KEY, selectedDoctorId);
  }, [isDoctorRole, selectedDoctorId]);

  useEffect(() => {
    if (typeof window === "undefined" || isDoctorRole) {
      return;
    }

    if (!selectedDoctor) {
      return;
    }

    window.localStorage.setItem(SELECTED_DOCTOR_STORAGE_KEY, JSON.stringify(selectedDoctor));
  }, [isDoctorRole, selectedDoctor]);

  useEffect(() => {
    const suffix = selectedDoctor ? selectedDoctor.id : "draft_new";
    const profileKey = `terminboerse_arzt_profile_${suffix}`;
    const workingHoursKey = `terminboerse_arzt_working_hours_${suffix}`;
    const appointmentsKey = `terminboerse_arzt_appointments_${suffix}`;
    const leistungenKey = `terminboerse_arzt_services_${suffix}`;

    const storedProfile = readJsonFromStorage<Partial<ProfileForm>>(profileKey);
    const storedWorkingHours = readJsonFromStorage<Partial<WorkingHoursForm>>(workingHoursKey);
    const storedAppointments = readJsonFromStorage<Partial<AppointmentForm>>(appointmentsKey);
    const storedLeistungen = readJsonFromStorage<LeistungItem[]>(leistungenKey);

    const fallbackProfile = getDefaultProfile(selectedDoctor);

    setProfileForm({
      ...fallbackProfile,
      ...storedProfile,
      name: typeof storedProfile?.name === "string" ? storedProfile.name : fallbackProfile.name,
      specialty: typeof storedProfile?.specialty === "string" ? storedProfile.specialty : fallbackProfile.specialty,
      district: typeof storedProfile?.district === "string" ? storedProfile.district : fallbackProfile.district,
      address: typeof storedProfile?.address === "string" ? storedProfile.address : fallbackProfile.address,
      phone: typeof storedProfile?.phone === "string" ? storedProfile.phone : fallbackProfile.phone,
      email: typeof storedProfile?.email === "string" ? storedProfile.email : fallbackProfile.email,
      website: typeof storedProfile?.website === "string" ? storedProfile.website : fallbackProfile.website,
      about: typeof storedProfile?.about === "string" ? storedProfile.about : fallbackProfile.about,
    });

    const defaultWorkingHours = getDefaultWorkingHours();
    setWorkingHoursForm({
      monday: {
        isClosed: typeof storedWorkingHours?.monday?.isClosed === "boolean" ? storedWorkingHours.monday.isClosed : defaultWorkingHours.monday.isClosed,
        start: typeof storedWorkingHours?.monday?.start === "string" ? storedWorkingHours.monday.start : defaultWorkingHours.monday.start,
        end: typeof storedWorkingHours?.monday?.end === "string" ? storedWorkingHours.monday.end : defaultWorkingHours.monday.end,
      },
      tuesday: {
        isClosed: typeof storedWorkingHours?.tuesday?.isClosed === "boolean" ? storedWorkingHours.tuesday.isClosed : defaultWorkingHours.tuesday.isClosed,
        start: typeof storedWorkingHours?.tuesday?.start === "string" ? storedWorkingHours.tuesday.start : defaultWorkingHours.tuesday.start,
        end: typeof storedWorkingHours?.tuesday?.end === "string" ? storedWorkingHours.tuesday.end : defaultWorkingHours.tuesday.end,
      },
      wednesday: {
        isClosed:
          typeof storedWorkingHours?.wednesday?.isClosed === "boolean"
            ? storedWorkingHours.wednesday.isClosed
            : defaultWorkingHours.wednesday.isClosed,
        start:
          typeof storedWorkingHours?.wednesday?.start === "string"
            ? storedWorkingHours.wednesday.start
            : defaultWorkingHours.wednesday.start,
        end: typeof storedWorkingHours?.wednesday?.end === "string" ? storedWorkingHours.wednesday.end : defaultWorkingHours.wednesday.end,
      },
      thursday: {
        isClosed:
          typeof storedWorkingHours?.thursday?.isClosed === "boolean"
            ? storedWorkingHours.thursday.isClosed
            : defaultWorkingHours.thursday.isClosed,
        start: typeof storedWorkingHours?.thursday?.start === "string" ? storedWorkingHours.thursday.start : defaultWorkingHours.thursday.start,
        end: typeof storedWorkingHours?.thursday?.end === "string" ? storedWorkingHours.thursday.end : defaultWorkingHours.thursday.end,
      },
      friday: {
        isClosed: typeof storedWorkingHours?.friday?.isClosed === "boolean" ? storedWorkingHours.friday.isClosed : defaultWorkingHours.friday.isClosed,
        start: typeof storedWorkingHours?.friday?.start === "string" ? storedWorkingHours.friday.start : defaultWorkingHours.friday.start,
        end: typeof storedWorkingHours?.friday?.end === "string" ? storedWorkingHours.friday.end : defaultWorkingHours.friday.end,
      },
      saturday: {
        isClosed:
          typeof storedWorkingHours?.saturday?.isClosed === "boolean"
            ? storedWorkingHours.saturday.isClosed
            : defaultWorkingHours.saturday.isClosed,
        start: typeof storedWorkingHours?.saturday?.start === "string" ? storedWorkingHours.saturday.start : defaultWorkingHours.saturday.start,
        end: typeof storedWorkingHours?.saturday?.end === "string" ? storedWorkingHours.saturday.end : defaultWorkingHours.saturday.end,
      },
      sunday: {
        isClosed: typeof storedWorkingHours?.sunday?.isClosed === "boolean" ? storedWorkingHours.sunday.isClosed : defaultWorkingHours.sunday.isClosed,
        start: typeof storedWorkingHours?.sunday?.start === "string" ? storedWorkingHours.sunday.start : defaultWorkingHours.sunday.start,
        end: typeof storedWorkingHours?.sunday?.end === "string" ? storedWorkingHours.sunday.end : defaultWorkingHours.sunday.end,
      },
    });

    const defaultAppointments = getDefaultAppointments();
    setAppointmentForm({
      ...defaultAppointments,
      ...storedAppointments,
      appointmentTypes:
        typeof storedAppointments?.appointmentTypes === "string"
          ? storedAppointments.appointmentTypes
          : defaultAppointments.appointmentTypes,
      bookingNote:
        typeof storedAppointments?.bookingNote === "string"
          ? storedAppointments.bookingNote
          : defaultAppointments.bookingNote,
      acceptsNewPatients:
        typeof storedAppointments?.acceptsNewPatients === "boolean"
          ? storedAppointments.acceptsNewPatients
          : defaultAppointments.acceptsNewPatients,
      hasVideoConsultation:
        typeof storedAppointments?.hasVideoConsultation === "boolean"
          ? storedAppointments.hasVideoConsultation
          : defaultAppointments.hasVideoConsultation,
    });

    setLeistungen(
      Array.isArray(storedLeistungen)
        ? storedLeistungen
            .map((item) => ({
              id: typeof item?.id === "string" && item.id ? item.id : createClientId(),
              title: typeof item?.title === "string" ? item.title : "",
              description: typeof item?.description === "string" ? item.description : "",
              durationMinutes: typeof item?.durationMinutes === "string" ? item.durationMinutes : "",
              priceInfo: typeof item?.priceInfo === "string" ? item.priceInfo : "",
            }))
            .filter((item) => item.title.trim().length > 0)
        : [],
    );

    setSavedProfile(false);
    setProfileSaveError("");
    setSavedLeistungen(false);

    const boardKey = `terminboerse_arzt_terminboard_${suffix}`;
    const queueKey = `terminboerse_arzt_terminqueue_${suffix}`;
    const storedAppointmentsBoard = readJsonFromStorage<ManagedAppointment[]>(boardKey);
    const storedQueue = readJsonFromStorage<QueueRequest[]>(queueKey);

    setManagedAppointments(
      Array.isArray(storedAppointmentsBoard)
        ? storedAppointmentsBoard
            .filter((item) => isSameOrAfterNow(item.endsAt ?? item.startsAt))
            .map((item) => ({
              ...item,
              googleEventId: typeof item.googleEventId === "string" ? item.googleEventId : undefined,
              syncState: item.syncState === "synced" || item.syncState === "failed" ? item.syncState : undefined,
              syncError: typeof item.syncError === "string" ? item.syncError : undefined,
            }))
        : [],
    );
    setRequestQueue(Array.isArray(storedQueue) ? storedQueue.filter((item) => isSameOrAfterNow(item.preferredEnd)) : []);
  }, [selectedDoctor]);

  const loadDoctorSlotsForBoard = useCallback(async () => {
    if (!selectedDoctor || !authToken) {
      setDoctorSlots([]);
      return;
    }

    setIsLoadingDoctorSlots(true);
    setSlotsStatusReason("");

    try {
      const params = new URLSearchParams({
        token: authToken,
        doctorId: selectedDoctor.id,
      });

      const response = await fetch(`/api/arztbereich/manual-slots?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as ManualSlotsPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Slots konnten nicht geladen werden.");
      }

      const nextSlots = Array.isArray(payload.slots) ? payload.slots : [];
      nextSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setDoctorSlots(nextSlots);
    } catch (error) {
      setDoctorSlots([]);
      setSlotsStatusReason(error instanceof Error ? error.message : "Slots konnten nicht geladen werden.");
    } finally {
      setIsLoadingDoctorSlots(false);
    }
  }, [authToken, selectedDoctor]);

  useEffect(() => {
    if ((activeTab !== "termine" && activeTab !== "profil") || !selectedDoctor) {
      return;
    }

    void loadDoctorSlotsForBoard();
  }, [activeTab, loadDoctorSlotsForBoard, selectedDoctor]);

  useEffect(() => {
    if (activeTab !== "profil" && activeTab !== "bewertungen") {
      return;
    }

    const currentDoctorId = selectedDoctor?.id;

    if (!currentDoctorId) {
      setCommunitySnapshot(null);
      setCommunityError("");
      setIsLoadingCommunity(false);
      return;
    }

    const doctorId: string = currentDoctorId;

    const controller = new AbortController();

    async function loadCommunitySnapshot() {
      setIsLoadingCommunity(true);
      setCommunityError("");

      try {
        const response = await fetch(`/api/doctor-community/${encodeURIComponent(doctorId)}`, {
          method: "GET",
          signal: controller.signal,
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          snapshot?: DoctorCommunitySnapshot;
        };

        if (!response.ok || !payload.ok || !payload.snapshot) {
          throw new Error(payload.error ?? "Kommentare konnten nicht geladen werden.");
        }

        setCommunitySnapshot(payload.snapshot);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setCommunitySnapshot(null);
        setCommunityError(error instanceof Error ? error.message : "Kommentare konnten nicht geladen werden.");
      } finally {
        setIsLoadingCommunity(false);
      }
    }

    void loadCommunitySnapshot();

    return () => {
      controller.abort();
    };
  }, [activeTab, selectedDoctor?.id]);

  useEffect(() => {
    if (activeTab !== "profil" && activeTab !== "termine") {
      return;
    }

    if (!authToken || !selectedDoctor) {
      setSchedulingStatus(null);
      setCalendarHealth(null);
      setSchedulingStatusError("");
      setIsLoadingSchedulingStatus(false);
      return;
    }

    const doctorId = selectedDoctor.id;

    const controller = new AbortController();

    async function loadSchedulingStatus() {
      setIsLoadingSchedulingStatus(true);
      setSchedulingStatusError("");

      try {
        const response = await fetch("/api/arztbereich/scheduling-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: authToken, doctorId, includeHealth: false }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          status?: PublicDoctorSchedulingStatus;
          health?: CalendarHealth;
          config?: {
            calendarId?: string;
          };
        };

        if (!response.ok || !payload.ok || !payload.status) {
          throw new Error(payload.error ?? "Terminstatus konnte nicht geladen werden.");
        }

        setSchedulingStatus(payload.status);
        setCalendarHealth(payload.health ?? null);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setSchedulingStatus(null);
        setCalendarHealth(null);
        setSchedulingStatusError(error instanceof Error ? error.message : "Terminstatus konnte nicht geladen werden.");
      } finally {
        setIsLoadingSchedulingStatus(false);
      }
    }

    void loadSchedulingStatus();

    return () => {
      controller.abort();
    };
  }, [activeTab, authToken, selectedDoctor]);

  async function updateSchedulingStatus(patch: {
    profileUpdated?: boolean;
    schedulingEnabled?: boolean;
  }) {
    if (!authToken || !selectedDoctor) {
      return;
    }

    const doctorId = selectedDoctor.id;

    setIsSavingSchedulingStatus(true);
    setSchedulingStatusError("");

    try {
      const response = await fetch("/api/arztbereich/scheduling-status/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: authToken,
          doctorId,
          ...patch,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        status?: PublicDoctorSchedulingStatus;
      };

      if (!response.ok || !payload.ok || !payload.status) {
        throw new Error(payload.error ?? "Terminstatus konnte nicht gespeichert werden.");
      }

      setSchedulingStatus(payload.status);
    } catch (error) {
      setSchedulingStatusError(error instanceof Error ? error.message : "Terminstatus konnte nicht gespeichert werden.");
    } finally {
      setIsSavingSchedulingStatus(false);
    }
  }

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

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Aktion fehlgeschlagen.");
      }

      await loadApprovals();
    } catch (error) {
      setApprovalsError(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    }
  }

  async function reassignApproval(requestId: string) {
    if (!authToken || role !== "admin") {
      return;
    }

    const nextDoctorId = editingDoctorId.trim();
    if (!nextDoctorId) {
      setApprovalsError("Bitte eine Profil-ID angeben.");
      return;
    }

    setApprovalsError("");
    setIsSavingReassign(true);

    try {
      const response = await fetch("/api/arztbereich/approvals/reassign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: authToken,
          requestId,
          doctorId: nextDoctorId,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Zuordnung konnte nicht gespeichert werden.");
      }

      await loadApprovals();
      setEditingApprovalId("");
      setEditingDoctorId("");
    } catch (error) {
      setApprovalsError(error instanceof Error ? error.message : "Zuordnung konnte nicht gespeichert werden.");
    } finally {
      setIsSavingReassign(false);
    }
  }

  function saveProfile() {
    if (hasProfileValidationErrors) {
      setSavedProfile(false);
      setProfileSaveError("Bitte korrigiere zuerst die markierten Felder.");
      return;
    }

    setProfileSaveError("");
    const key = selectedDoctor ? `terminboerse_arzt_profile_${selectedDoctor.id}` : "terminboerse_arzt_profile_draft_new";
    const workingHoursKey = selectedDoctor
      ? `terminboerse_arzt_working_hours_${selectedDoctor.id}`
      : "terminboerse_arzt_working_hours_draft_new";
    try {
      localStorage.setItem(key, JSON.stringify(profileForm));
      localStorage.setItem(workingHoursKey, JSON.stringify(workingHoursForm));
      setSavedProfile(true);
      window.setTimeout(() => setSavedProfile(false), 1800);
      if (selectedDoctor && authToken) {
        void updateSchedulingStatus({ profileUpdated: true });
      }
    } catch {
      setSavedProfile(false);
    }
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
    const key = selectedDoctor ? `terminboerse_arzt_services_${selectedDoctor.id}` : "terminboerse_arzt_services_draft_new";
    const cleaned = leistungen
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        description: item.description.trim(),
        durationMinutes: item.durationMinutes.trim(),
        priceInfo: item.priceInfo.trim(),
      }))
      .filter((item) => item.title.length > 0);

    try {
      localStorage.setItem(key, JSON.stringify(cleaned));
      setLeistungen(cleaned);
      setSavedLeistungen(true);
      window.setTimeout(() => setSavedLeistungen(false), 1800);
    } catch {
      setSavedLeistungen(false);
    }
  }

  useEffect(() => {
    if (!selectedDoctor) {
      return;
    }
    const key = `terminboerse_arzt_terminboard_${selectedDoctor.id}`;
    localStorage.setItem(key, JSON.stringify(managedAppointments));
  }, [managedAppointments, selectedDoctor]);

  useEffect(() => {
    if (!selectedDoctor) {
      return;
    }
    const key = `terminboerse_arzt_terminqueue_${selectedDoctor.id}`;
    localStorage.setItem(key, JSON.stringify(requestQueue));
  }, [requestQueue, selectedDoctor]);

  function navigateWeek(direction: "prev" | "next") {
    setCalendarAnchorDate((prev) => addDays(prev, direction === "next" ? 7 : -7));
  }

  function patchManagedAppointment(appointmentId: string, patch: Partial<ManagedAppointment>) {
    setManagedAppointments((prev) => prev.map((item) => (item.id === appointmentId ? { ...item, ...patch } : item)));
  }

  async function syncAppointmentWithGoogle(action: "create" | "update", appointment: ManagedAppointment) {
    if (!authToken || !selectedDoctor || !schedulingStatus?.calendarConnected) {
      return;
    }

    try {
      const response = await fetch("/api/arztbereich/google-calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: authToken,
          doctorId: selectedDoctor.id,
          action,
          appointment,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        googleEventId?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Google Kalender Sync fehlgeschlagen.");
      }

      patchManagedAppointment(appointment.id, {
        googleEventId: payload.googleEventId ?? appointment.googleEventId,
        syncState: "synced",
        syncError: undefined,
      });
    } catch (error) {
      patchManagedAppointment(appointment.id, {
        syncState: "failed",
        syncError: error instanceof Error ? error.message : "Google Kalender Sync fehlgeschlagen.",
      });
      setBoardActionMessage(error instanceof Error ? error.message : "Google Kalender Sync fehlgeschlagen.");
    }
  }

  function approveQueueRequest(request: QueueRequest) {
    const newAppointment: ManagedAppointment = {
      id: `apt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      patientName: request.patientName,
      startsAt: request.preferredStart,
      endsAt: request.preferredEnd,
      type: request.reason,
      status: "confirmed",
      note: "Aus Anfrage bestätigt",
    };

    setManagedAppointments((prev) => [...prev, newAppointment]);
    setRequestQueue((prev) => prev.filter((item) => item.id !== request.id));
    void syncAppointmentWithGoogle("create", newAppointment);
  }

  function rejectQueueRequest(requestId: string) {
    setRequestQueue((prev) => prev.filter((item) => item.id !== requestId));
  }

  function createManualAppointment() {
    if (!newAppointmentPatient.trim() || !newAppointmentStart) {
      return;
    }

    const start = new Date(newAppointmentStart);
    if (Number.isNaN(start.getTime())) {
      return;
    }

    const end = new Date(start.getTime() + Math.max(10, newAppointmentDuration) * 60 * 1000);

    const appointment: ManagedAppointment = {
      id: `apt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      patientName: newAppointmentPatient.trim(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      type: newAppointmentType.trim() || (newAppointmentMode === "blocked" ? "Blockzeit" : "Termin"),
      status: newAppointmentMode,
      note:
        newAppointmentNote.trim() ||
        (newAppointmentMode === "blocked" ? "Zeitfenster intern blockiert" : undefined),
    };

    setManagedAppointments((prev) => [...prev, appointment]);
    void syncAppointmentWithGoogle("create", appointment);
    setNewAppointmentPatient("");
    setNewAppointmentMode("confirmed");
    setNewAppointmentStart("");
    setNewAppointmentDuration(30);
    setNewAppointmentNote("");
  }

  function applySlotToNewAppointment(slot: DoctorSlot) {
    setNewAppointmentStart(toDateTimeLocalValue(slot.start));

    const start = new Date(slot.start);
    const end = new Date(slot.end);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);
      if (duration >= 10 && duration <= 240) {
        setNewAppointmentDuration(duration);
      }
    }
  }

  async function createManualFreeSlot(startsAtOverride?: string, durationOverride?: number) {
    const slotStartValue = startsAtOverride ?? newSlotStart;
    const slotDurationValue = typeof durationOverride === "number" ? durationOverride : newSlotDuration;

    if (!authToken || !selectedDoctor || !slotStartValue) {
      return;
    }

    setIsSavingSlot(true);
    setSlotActionError("");

    try {
      const startsAt = new Date(slotStartValue);
      if (Number.isNaN(startsAt.getTime())) {
        throw new Error("Ungültiges Datum/Zeit-Format.");
      }

      const response = await fetch("/api/arztbereich/manual-slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: authToken,
          doctorId: selectedDoctor.id,
          startsAt: startsAt.toISOString(),
          durationMinutes: slotDurationValue,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        slot?: DoctorSlot;
      };

      if (!response.ok || !payload.ok || !payload.slot) {
        throw new Error(payload.error ?? "Slot konnte nicht gespeichert werden.");
      }

      const nextSlots = [...doctorSlots, payload.slot];
      nextSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setDoctorSlots(nextSlots);
      setBoardActionMessage("Freier Slot gespeichert.");
      setNewSlotStart("");
      setNewSlotDuration(30);

      if (!schedulingStatus?.schedulingEnabled) {
        await updateSchedulingStatus({ schedulingEnabled: true });
      }
    } catch (error) {
      setSlotActionError(error instanceof Error ? error.message : "Slot konnte nicht gespeichert werden.");
    } finally {
      setIsSavingSlot(false);
    }
  }

  async function deleteManualFreeSlot(slotId?: string) {
    if (!authToken || !selectedDoctor || !slotId) {
      return;
    }

    setIsSavingSlot(true);
    setSlotActionError("");

    try {
      const response = await fetch("/api/arztbereich/manual-slots", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: authToken,
          doctorId: selectedDoctor.id,
          slotId,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Slot konnte nicht gelöscht werden.");
      }

      setDoctorSlots((prev) => prev.filter((slot) => slot.id !== slotId));
      setBoardActionMessage("Slot entfernt.");
    } catch (error) {
      setSlotActionError(error instanceof Error ? error.message : "Slot konnte nicht gelöscht werden.");
    } finally {
      setIsSavingSlot(false);
    }
  }

  function hasAppointmentCollision(startMs: number, endMs: number, excludeId?: string) {
    return managedAppointments.some((item) => {
      if (excludeId && item.id === excludeId) {
        return false;
      }

      const existingStart = new Date(item.startsAt).getTime();
      const existingEnd = new Date(item.endsAt).getTime();
      if (Number.isNaN(existingStart) || Number.isNaN(existingEnd)) {
        return false;
      }

      return startMs < existingEnd && endMs > existingStart;
    });
  }

  function moveAppointmentToHour(appointmentId: string, targetHour: number) {
    const appointment = managedAppointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      setBoardActionMessage("Termin konnte nicht verschoben werden.");
      return;
    }

    const originalStart = new Date(appointment.startsAt);
    const originalEnd = new Date(appointment.endsAt);
    if (Number.isNaN(originalStart.getTime()) || Number.isNaN(originalEnd.getTime())) {
      setBoardActionMessage("Ungültige Terminzeit.");
      return;
    }

    const minute = originalStart.getMinutes();
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const targetStart = new Date(`${selectedCalendarDate}T${String(targetHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
    const targetEnd = new Date(targetStart.getTime() + durationMs);

    if (Number.isNaN(targetStart.getTime()) || Number.isNaN(targetEnd.getTime())) {
      setBoardActionMessage("Zielzeit ist ungültig.");
      return;
    }

    if (getDateKey(targetStart) !== selectedCalendarDate || getDateKey(targetEnd) !== selectedCalendarDate) {
      setBoardActionMessage("Verschieben über Tagesgrenze ist nicht erlaubt.");
      return;
    }

    if (hasAppointmentCollision(targetStart.getTime(), targetEnd.getTime(), appointmentId)) {
      setBoardActionMessage("Kollision erkannt: Zielzeit ist bereits belegt.");
      return;
    }

    setManagedAppointments((prev) =>
      prev.map((item) =>
        item.id === appointmentId
          ? {
              ...item,
              startsAt: targetStart.toISOString(),
              endsAt: targetEnd.toISOString(),
            }
          : item,
      ),
    );
    setBoardActionMessage("Termin verschoben.");

    if (appointment.googleEventId) {
      const updatedAppointment: ManagedAppointment = {
        ...appointment,
        startsAt: targetStart.toISOString(),
        endsAt: targetEnd.toISOString(),
      };
      void syncAppointmentWithGoogle("update", updatedAppointment);
    }
  }

  function adjustAppointmentDuration(appointmentId: string, deltaMinutes: number) {
    const appointment = managedAppointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      return;
    }

    const start = new Date(appointment.startsAt);
    const end = new Date(appointment.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }

    const currentDuration = Math.max(10, Math.round((end.getTime() - start.getTime()) / 60000));
    const nextDuration = Math.min(240, Math.max(10, currentDuration + deltaMinutes));
    const nextEnd = new Date(start.getTime() + nextDuration * 60 * 1000);

    if (getDateKey(start) !== selectedCalendarDate || getDateKey(nextEnd) !== selectedCalendarDate) {
      setBoardActionMessage("Daueränderung über Tagesgrenze ist nicht erlaubt.");
      return;
    }

    if (hasAppointmentCollision(start.getTime(), nextEnd.getTime(), appointmentId)) {
      setBoardActionMessage("Kollision erkannt: Dauer konnte nicht geändert werden.");
      return;
    }

    setManagedAppointments((prev) =>
      prev.map((item) => (item.id === appointmentId ? { ...item, endsAt: nextEnd.toISOString() } : item)),
    );
    setBoardActionMessage(`Dauer aktualisiert (${nextDuration} Min.).`);

    if (appointment.googleEventId) {
      const updatedAppointment: ManagedAppointment = {
        ...appointment,
        endsAt: nextEnd.toISOString(),
      };
      void syncAppointmentWithGoogle("update", updatedAppointment);
    }
  }

  useEffect(() => {
    if (isAdminRole && activeTab === "freigaben") {
      void loadApprovals();
    }
  }, [isAdminRole, activeTab]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          <UserRound className="h-3.5 w-3.5" />
          Arztbereich (Stabilmodus)
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Arztbereich Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Stabile Version mit Profil, Leistungen und Termine-Sektionen.</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Manual Slot Modus aktiv (3-Tage-System)
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {isAdminRole ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("freigaben")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "freigaben" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Freischaltungen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("managed")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "managed" ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                }`}
              >
                Verwaltete Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("profil")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "profil" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                }`}
              >
                Profil
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
                onClick={() => setActiveTab("bewertungen")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "bewertungen" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                }`}
              >
                Bewertungen
              </button>
            </>
          ) : (
            <>
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
                  activeTab === "leistungen" ? "bg-violet-700 text-white" : "bg-violet-100 text-violet-800 hover:bg-violet-200"
                }`}
              >
                Leistungen
              </button>
            </>
          )}
        </div>

        {isAdminRole && activeTab === "freigaben" ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
                <ShieldCheck className="h-4 w-4" />
                Wartende Freischaltungen
              </p>
              <button
                type="button"
                onClick={() => void loadApprovals()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
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
                    <p className="font-bold text-slate-900">{item.doctorName || item.doctorEmail}</p>
                    <p className="text-slate-700">{item.doctorEmail}</p>
                    <p className="text-xs text-slate-600">
                      {item.registrationType === "existing" ? "Bestehendes Profil" : "Neues Profil"}
                    </p>
                    {item.registrationType === "existing" && item.selectedDoctorId ? (
                      <p className="mt-1 inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                        Angefragtes Profil: {formatProfileLabel(item.selectedDoctorId, item.selectedDoctorName)}
                      </p>
                    ) : (
                      <p className="mt-1 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
                        Angefragtes Profil: Wird bei Freigabe erstellt
                      </p>
                    )}

                    {item.approvedDoctorId ? (
                      <p className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Zugeordnetes Profil: {formatProfileLabel(item.approvedDoctorId, item.approvedDoctorName)}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>

                    {item.status === "pending" ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void reviewApproval(item.id, "approve")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Freigeben
                        </button>
                        <button
                          type="button"
                          onClick={() => void reviewApproval(item.id, "reject")}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Ablehnen
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-semibold text-slate-600">
                          Status: {item.status === "approved" ? "Genehmigt" : "Abgelehnt"}
                        </p>

                        {item.status === "approved" ? (
                          editingApprovalId === item.id ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <label className="block text-xs font-semibold text-slate-700">Zugeordnetes Profil (ID)</label>
                              <input
                                value={editingDoctorId}
                                onChange={(event) => setEditingDoctorId(event.target.value)}
                                placeholder="z.B. ARZTOGD.20467136"
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                              />
                              <p className="mt-1 text-[11px] text-slate-500">Hinweis: Änderung wird spätestens nach erneutem Arzt-Login aktiv.</p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void reassignApproval(item.id)}
                                  disabled={isSavingReassign}
                                  className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {isSavingReassign ? "Speichert..." : "Speichern"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingApprovalId("");
                                    setEditingDoctorId("");
                                  }}
                                  disabled={isSavingReassign}
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingApprovalId(item.id);
                                setEditingDoctorId(item.approvedDoctorId ?? item.selectedDoctorId ?? "");
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                            >
                              Zuordnung bearbeiten
                            </button>
                          )
                        ) : null}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                !isLoadingApprovals ? <p className="text-sm text-slate-600">Aktuell keine Registrierungsanfragen.</p> : null
              )}
            </div>
          </section>
        ) : null}

        {isAdminRole && activeTab === "managed" ? (
          <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <h2 className="text-lg font-bold text-indigo-900">Verwaltete Profile</h2>
            <p className="mt-1 text-sm text-indigo-800">Profile suchen, auswählen und direkt in die Bearbeitung übernehmen.</p>

            <div className="mt-4">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-indigo-900">Profil suchen</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-indigo-400" />
                  <input
                    value={doctorSearchTerm}
                    onChange={(event) => setDoctorSearchTerm(event.target.value)}
                    placeholder="Name, Fachbereich, Bezirk..."
                    className="w-full rounded-xl border border-indigo-300 bg-white py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </label>

              {doctorSearchTerm.trim().length > 0 && !isSearchReady ? (
                <p className="mt-2 text-xs font-medium text-indigo-700">Mindestens 3 Zeichen eingeben.</p>
              ) : null}
              {isSearchingDoctors ? <p className="mt-2 text-xs text-indigo-700">Suche läuft...</p> : null}
              {doctorSearchError ? <p className="mt-2 text-xs font-semibold text-rose-700">{doctorSearchError}</p> : null}

              {isSearchReady ? (
                <div className="mt-2 rounded-xl border border-indigo-200 bg-white">
                  {filteredDoctors.length > 0 ? (
                    <ul className="max-h-72 divide-y divide-indigo-100 overflow-auto">
                      {filteredDoctors.map((doctor) => (
                        <li key={doctor.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctorId(doctor.id);
                              setDoctorSearchTerm(doctor.name);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition hover:bg-indigo-50 ${
                              selectedDoctorId === doctor.id ? "bg-indigo-50" : ""
                            }`}
                          >
                            <p className="font-semibold text-slate-900">{doctor.name}</p>
                            <p className="text-xs text-slate-600">
                              {doctor.id} - {doctor.specialty}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-xs font-medium text-indigo-700">Keine Treffer gefunden.</p>
                  )}
                </div>
              ) : null}
            </div>

            {selectedDoctor ? (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Ausgewählt: {selectedDoctor.name}</p>
                <p className="mt-1 text-xs">{selectedDoctor.id}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("profil")}
                  className="mt-3 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Profil bearbeiten
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "profil" ? (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-lg font-bold text-slate-900">Profil bearbeiten</h2>

              <div className="mt-3">
                {isDoctorRole ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                    Profil durch Admin-Zuordnung gesperrt. Du kannst nur dein freigeschaltetes Profil bearbeiten.
                  </p>
                ) : (
                  <>
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Arzt suchen</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          value={doctorSearchTerm}
                          onChange={(event) => setDoctorSearchTerm(event.target.value)}
                          placeholder="Name, Fachbereich, Bezirk..."
                          className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                        />
                      </div>
                    </label>

                    {doctorSearchTerm.trim().length > 0 && !isSearchReady ? (
                      <p className="mt-2 text-xs font-medium text-slate-500">Mindestens 3 Zeichen eingeben.</p>
                    ) : null}
                    {isSearchingDoctors ? <p className="mt-2 text-xs text-slate-500">Suche läuft...</p> : null}
                    {doctorSearchError ? <p className="mt-2 text-xs font-semibold text-rose-700">{doctorSearchError}</p> : null}

                    {isSearchReady ? (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white">
                        {filteredDoctors.length > 0 ? (
                          <ul className="max-h-64 divide-y divide-slate-100 overflow-auto">
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
                  </>
                )}

                {selectedDoctor ? (
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    Ausgewählt: {selectedDoctor.name} ({selectedDoctor.specialty})
                  </p>
                ) : null}
              </div>

              <div className="mt-4 space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Grunddaten ({profileSectionProgress.basic.done}/{profileSectionProgress.basic.total})
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1 block text-slate-600">Name</span>
                      <input
                        value={profileForm.name}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Fachbereich</span>
                      <input
                        value={profileForm.specialty}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, specialty: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Bezirk</span>
                      <input
                        value={profileForm.district}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, district: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1 block text-slate-600">Adresse</span>
                      <input
                        value={profileForm.address}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Kontakt ({profileSectionProgress.contact.done}/{profileSectionProgress.contact.total})
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Telefon</span>
                      <input
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className={`w-full rounded-xl border px-3 py-2 ${profileFieldErrors.phone ? "border-rose-400 bg-rose-50" : "border-slate-300"}`}
                      />
                      {profileFieldErrors.phone ? <p className="mt-1 text-xs font-medium text-rose-700">{profileFieldErrors.phone}</p> : null}
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">E-Mail</span>
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                        className={`w-full rounded-xl border px-3 py-2 ${profileFieldErrors.email ? "border-rose-400 bg-rose-50" : "border-slate-300"}`}
                      />
                      {profileFieldErrors.email ? <p className="mt-1 text-xs font-medium text-rose-700">{profileFieldErrors.email}</p> : null}
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      <span className="mb-1 block text-slate-600">Website</span>
                      <input
                        value={profileForm.website}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, website: event.target.value }))}
                        className={`w-full rounded-xl border px-3 py-2 ${profileFieldErrors.website ? "border-rose-400 bg-rose-50" : "border-slate-300"}`}
                      />
                      {profileFieldErrors.website ? <p className="mt-1 text-xs font-medium text-rose-700">{profileFieldErrors.website}</p> : null}
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Über mich ({profileSectionProgress.about.done}/{profileSectionProgress.about.total})
                  </p>
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block text-slate-600">Über mich</span>
                    <textarea
                      value={profileForm.about}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, about: event.target.value }))}
                      className={`min-h-32 w-full rounded-xl border px-3 py-2 ${profileFieldErrors.about ? "border-rose-400 bg-rose-50" : "border-slate-300"}`}
                    />
                    <p className="mt-1 text-xs text-slate-500">Mindestens 80 Zeichen für vollständiges Profil.</p>
                    <p className="mt-1 text-xs text-slate-500">Aktuell: {profileForm.about.trim().length} Zeichen</p>
                    {profileFieldErrors.about ? <p className="mt-1 text-xs font-medium text-rose-700">{profileFieldErrors.about}</p> : null}
                  </label>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Arbeitszeiten (Standard)</p>
                  <p className="mt-1 text-xs text-slate-500">Standardwerte sind bereits gesetzt und können pro Tag angepasst werden.</p>
                  <div className="mt-3 space-y-2">
                    {WORKING_HOURS_CONFIG.map((day) => {
                      const row = workingHoursForm[day.key];
                      return (
                        <article key={day.key} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">{day.label}</p>
                            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={row.isClosed}
                                onChange={(event) =>
                                  setWorkingHoursForm((prev) => ({
                                    ...prev,
                                    [day.key]: {
                                      ...prev[day.key],
                                      isClosed: event.target.checked,
                                    },
                                  }))
                                }
                              />
                              Geschlossen
                            </label>
                          </div>
                          {!row.isClosed ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <label className="block text-xs text-slate-600">
                                Von
                                <input
                                  type="time"
                                  step={300}
                                  value={row.start}
                                  onChange={(event) =>
                                    setWorkingHoursForm((prev) => ({
                                      ...prev,
                                      [day.key]: {
                                        ...prev[day.key],
                                        start: event.target.value,
                                      },
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                                />
                              </label>
                              <label className="block text-xs text-slate-600">
                                Bis
                                <input
                                  type="time"
                                  step={300}
                                  value={row.end}
                                  onChange={(event) =>
                                    setWorkingHoursForm((prev) => ({
                                      ...prev,
                                      [day.key]: {
                                        ...prev[day.key],
                                        end: event.target.value,
                                      },
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                                />
                              </label>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-slate-500">Praxis an diesem Tag geschlossen.</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={hasProfileValidationErrors}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Profil speichern
                </button>
                {profileSaveError ? <p className="text-sm font-semibold text-rose-700">{profileSaveError}</p> : null}
                {savedProfile ? (
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Gespeichert
                  </p>
                ) : null}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-900">
                  <ShieldCheck className="h-4 w-4" />
                  Profil-Fortschritt
                </h3>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span>Vollständigkeit</span>
                    <span>{profileCompletion.percent}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-emerald-100">
                    <div
                      className="h-2 rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${profileCompletion.percent}%` }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs text-emerald-900">
                  Erfüllt: {profileCompletion.completed}/{profileCompletion.total} Pflichtfelder
                </p>

                {profileCompletion.missing.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fehlende Felder</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {profileCompletion.missing.map((item) => (
                        <span key={item} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800">
                    Profil ist vollständig. Nächster Schritt: rechts freie Slots für Heute, Morgen oder Übermorgen eintragen.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Profilübersicht</h3>
                {selectedDoctor ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">Name:</span> {profileForm.name || selectedDoctor.name}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Fachbereich:</span> {profileForm.specialty || selectedDoctor.specialty}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Bezirk:</span> {profileForm.district || selectedDoctor.district}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Adresse:</span> {profileForm.address || selectedDoctor.address}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">E-Mail:</span> {profileForm.email || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Telefon:</span> {profileForm.phone || "-"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">Bitte links zuerst ein Arztprofil auswählen.</p>
                )}
              </section>

              <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-sky-900">Freie Slots (Heute bis Übermorgen)</h3>
                <p className="mt-1 text-xs text-sky-900">Diese Einträge erscheinen auf der Startseite und im Arztprofil.</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    { key: "today", label: "Heute", date: profileSlotDays.today },
                    { key: "tomorrow", label: "Morgen", date: profileSlotDays.tomorrow },
                    { key: "day_after_tomorrow", label: "Übermorgen", date: profileSlotDays.day_after_tomorrow },
                  ] as Array<{ key: ProfileSlotDay; label: string; date: Date }>).map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => setProfileSlotDay(entry.key)}
                      className={`rounded-xl border px-2 py-2 text-left text-xs ${
                        profileSlotDay === entry.key ? "border-sky-300 bg-white text-sky-900" : "border-sky-200 bg-sky-100 text-sky-800"
                      }`}
                    >
                      <p className="font-semibold">{entry.label}</p>
                      <p>{formatWeekdayLabel(entry.date)}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                  <label className="block text-xs text-slate-700">
                    Uhrzeit
                    <input
                      type="time"
                      step={300}
                      value={profileSlotTime}
                      onChange={(event) => setProfileSlotTime(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs text-slate-700">
                    Dauer (Min)
                    <input
                      type="number"
                      min={10}
                      max={240}
                      step={5}
                      value={profileSlotDuration}
                      onChange={(event) => setProfileSlotDuration(Number(event.target.value) || 30)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const day = profileSlotDays[profileSlotDay];
                      const dayKey = getDateKey(day);
                      if (!profileSlotTime) {
                        return;
                      }
                      void createManualFreeSlot(`${dayKey}T${profileSlotTime}`, profileSlotDuration);
                    }}
                    disabled={!selectedDoctor || !authToken || isSavingSlot || !profileSlotTime}
                    className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hinzufügen
                  </button>
                </div>

                {slotActionError ? <p className="mt-2 text-xs font-semibold text-rose-700">{slotActionError}</p> : null}

                <div className="mt-3 space-y-1.5">
                  {doctorSlots.slice(0, 9).map((slot) => (
                    <div key={slot.id ?? `${slot.start}-${slot.end}`} className="flex items-center justify-between rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-xs">
                      <span className="font-semibold text-slate-700">{formatCalendarDateTime(slot.start)} · {formatRange(slot.start, slot.end)}</span>
                      <button
                        type="button"
                        onClick={() => void deleteManualFreeSlot(slot.id)}
                        disabled={!slot.id || isSavingSlot}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 disabled:opacity-60"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                  {doctorSlots.length === 0 ? <p className="text-xs text-slate-600">Noch keine freien Slots eingetragen.</p> : null}
                </div>
              </section>

              {!isAdminRole ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-900">
                    <MessageSquareText className="h-4 w-4" />
                    Bewertungen & Kommentare (kommt bald)
                  </h3>

                  <p className="mt-3 text-sm text-amber-900">
                    Verifizierte Nutzerprofile für öffentliche Bewertungen und Kommentare sind in Arbeit.
                  </p>

                  {!selectedDoctor ? <p className="mt-2 text-sm text-amber-900">Nach Auswahl eines Profils werden hier Live-Metriken angezeigt.</p> : null}
                  {isLoadingCommunity ? <p className="mt-3 text-sm text-slate-600">Metriken werden geladen...</p> : null}
                  {communityError ? <p className="mt-3 text-sm font-semibold text-rose-700">{communityError}</p> : null}

                  {selectedDoctor && communitySnapshot ? (
                    <article className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Live Profilaufrufe</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-xl font-bold text-slate-900">
                        <Eye className="h-4 w-4 text-amber-600" />
                        {formatNumber(communitySnapshot.viewsCount)}
                      </p>
                      <p className="mt-2 text-xs text-slate-600">Bewertungen und Kommentare werden nach dem Start der Nutzerprofile freigeschaltet.</p>
                    </article>
                  ) : null}
                </section>
              ) : null}

              {false ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <ShieldCheck className="h-4 w-4" />
                      Wartende Freischaltungen
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadApprovals()}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
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
                          <p className="font-bold text-slate-900">{item.doctorName || item.doctorEmail}</p>
                          <p className="text-slate-700">{item.doctorEmail}</p>
                          <p className="text-xs text-slate-600">
                            {item.registrationType === "existing" ? "Bestehendes Profil" : "Neues Profil"}
                          </p>
                          {item.registrationType === "existing" && item.selectedDoctorId ? (
                            <p className="mt-1 inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                              Angefragtes Profil: {formatProfileLabel(item.selectedDoctorId, item.selectedDoctorName)}
                            </p>
                          ) : (
                            <p className="mt-1 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
                              Angefragtes Profil: Wird bei Freigabe erstellt
                            </p>
                          )}

                          {item.approvedDoctorId ? (
                            <p className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              Zugeordnetes Profil: {formatProfileLabel(item.approvedDoctorId, item.approvedDoctorName)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>

                          {item.status === "pending" ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void reviewApproval(item.id, "approve")}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Freigeben
                              </button>
                              <button
                                type="button"
                                onClick={() => void reviewApproval(item.id, "reject")}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Ablehnen
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              <p className="text-xs font-semibold text-slate-600">
                                Status: {item.status === "approved" ? "Genehmigt" : "Abgelehnt"}
                              </p>

                              {item.status === "approved" ? (
                                editingApprovalId === item.id ? (
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                                    <label className="block text-xs font-semibold text-slate-700">Zugeordnetes Profil (ID)</label>
                                    <input
                                      value={editingDoctorId}
                                      onChange={(event) => setEditingDoctorId(event.target.value)}
                                      placeholder="z.B. ARZTOGD.20467136"
                                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                    />
                                    <p className="mt-1 text-[11px] text-slate-500">Hinweis: Änderung wird spätestens nach erneutem Arzt-Login aktiv.</p>
                                    <div className="mt-2 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => void reassignApproval(item.id)}
                                        disabled={isSavingReassign}
                                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                      >
                                        {isSavingReassign ? "Speichert..." : "Speichern"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingApprovalId("");
                                          setEditingDoctorId("");
                                        }}
                                        disabled={isSavingReassign}
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                      >
                                        Abbrechen
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingApprovalId(item.id);
                                      setEditingDoctorId(item.approvedDoctorId ?? item.selectedDoctorId ?? "");
                                    }}
                                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    Zuordnung bearbeiten
                                  </button>
                                )
                              ) : null}
                            </div>
                          )}
                        </article>
                      ))
                    ) : (
                      !isLoadingApprovals ? <p className="text-sm text-slate-600">Aktuell keine Registrierungsanfragen.</p> : null
                    )}
                  </div>
                </section>
              ) : null}
            </aside>
            </div>
          </>
        ) : null}

        {activeTab === "leistungen" ? (
          <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <h2 className="text-lg font-bold text-violet-900">Leistungen</h2>
            <p className="mt-1 text-sm text-violet-800">Leistungen hinzufügen, bearbeiten und lokal speichern.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <input
                value={newLeistungTitle}
                onChange={(event) => setNewLeistungTitle(event.target.value)}
                placeholder="Neue Leistung (z.B. Erstgespräch)"
                className="min-w-55 flex-1 rounded-xl border border-violet-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addLeistung}
                className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Hinzufügen
              </button>
              <button
                type="button"
                onClick={saveLeistungen}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900"
              >
                <Save className="h-4 w-4" />
                Speichern
              </button>
              {savedLeistungen ? (
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Gespeichert
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              {leistungen.length > 0 ? (
                leistungen.map((item) => (
                  <article key={item.id} className="rounded-xl border border-violet-200 bg-white p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm sm:col-span-2">
                        <span className="mb-1 block text-slate-600">Titel</span>
                        <input
                          value={item.title}
                          onChange={(event) => updateLeistung(item.id, { title: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-600">Dauer (Min.)</span>
                        <input
                          value={item.durationMinutes}
                          onChange={(event) => updateLeistung(item.id, { durationMinutes: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-slate-600">Preisinfo</span>
                        <input
                          value={item.priceInfo}
                          onChange={(event) => updateLeistung(item.id, { priceInfo: event.target.value })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="mb-1 block text-slate-600">Beschreibung</span>
                        <textarea
                          value={item.description}
                          onChange={(event) => updateLeistung(item.id, { description: event.target.value })}
                          className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLeistung(item.id)}
                      className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                    >
                      Entfernen
                    </button>
                  </article>
                ))
              ) : (
                <p className="text-sm text-violet-900">Noch keine Leistungen hinzugefügt.</p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "termine" ? (
          <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <h2 className="text-lg font-bold text-sky-900">Termine</h2>
            <p className="mt-1 text-sm text-sky-800">Freie Slots manuell für die nächsten 3 Tage pflegen.</p>
            <p className="mt-1 text-xs font-semibold text-sky-900">
              Hinweis: Sync-Kalender bleibt sichtbar, ist aber bewusst deaktiviert.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTermineSubTab("board")}
                disabled={!isTermineEnabled}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  termineSubTab === "board"
                    ? "bg-sky-700 text-white"
                    : isTermineEnabled
                      ? "bg-white text-sky-800 hover:bg-sky-100"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                Terminboard
              </button>
              <button
                type="button"
                onClick={() => setTermineSubTab("settings")}
                disabled
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  termineSubTab === "settings" ? "bg-slate-300 text-slate-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                Sync-Kalender (deaktiviert)
              </button>
            </div>

            {termineSubTab === "settings" ? (
              <>
            <div className="mt-4 rounded-xl border border-sky-300 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">Synchronisierter Kalender</p>
              <p className="mt-1 text-xs text-slate-600">Diese Funktion ist aktuell deaktiviert und bleibt für später vorbereitet.</p>

              {schedulingStatus?.calendarConnected ? (
                <p className="mt-3 text-xs font-semibold text-emerald-700">Gespeicherte Verbindung: {schedulingStatus.calendarId ?? "-"}</p>
              ) : (
                <p className="mt-3 text-xs font-semibold text-amber-700">Aktuell keine aktive Kalender-Verbindung.</p>
              )}
            </div>
              </>
            ) : null}

            {termineSubTab === "board" ? (
              <>
            {!isTermineEnabled ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Terminbereich ist deaktiviert.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Aktiviere den Terminbereich im Profil, um freie Slots für die nächsten 3 Tage zu verwalten.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("profil")}
                  className="mt-3 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Zum Profil
                </button>
              </div>
            ) : null}

            {isTermineEnabled ? (

            <div className="mt-4 rounded-xl border border-sky-300 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terminboard</p>
                  <p className="text-sm font-semibold text-slate-800">{weekStartLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg border border-slate-300 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode("week")}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                        calendarViewMode === "week" ? "bg-slate-900 text-white" : "text-slate-600"
                      }`}
                    >
                      Woche
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode("day")}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                        calendarViewMode === "day" ? "bg-slate-900 text-white" : "text-slate-600"
                      }`}
                    >
                      Tag
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateWeek("prev")}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700"
                    aria-label="Vorherige Woche"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarAnchorDate(startOfWeek(new Date()))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Heute
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateWeek("next")}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700"
                    aria-label="Nächste Woche"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarAnchorDate(startOfWeek(calendarAnchorDate))}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Aktualisieren
                  </button>
                </div>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {weekDays.map((day) => {
                  const dayKey = getDateKey(day);
                  const dayAppointments = appointmentsByDay.get(dayKey) ?? [];
                  const daySlots = slotsByDay.get(dayKey) ?? [];
                  const isSelected = dayKey === selectedCalendarDate;

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => setSelectedCalendarDate(dayKey)}
                      className={`min-w-40 rounded-lg border px-3 py-2 text-left transition ${
                        isSelected ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-800">{formatWeekdayLabel(day)}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{dayAppointments.length} Termine · {daySlots.length} Slots</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[0.95fr_1.5fr_1fr]">
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    Anfrage-Queue
                  </p>
                  <div className="mt-2 space-y-2">
                    {requestQueue.length > 0 ? (
                      requestQueue.map((request) => (
                        <article key={request.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
                          <p className="font-semibold text-slate-900">{request.patientName}</p>
                          <p className="mt-1">{request.reason}</p>
                          <p className="mt-1 text-slate-500">{formatRange(request.preferredStart, request.preferredEnd)}</p>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => approveQueueRequest(request)}
                              className="rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white"
                            >
                              Bestätigen
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectQueueRequest(request.id)}
                              className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 font-semibold text-rose-700"
                            >
                              Ablehnen
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Keine offenen Anfragen.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {calendarViewMode === "week" ? "Wochenkalender" : "Tagesagenda"}
                  </p>
                  {boardActionMessage ? <p className="mt-2 text-xs font-semibold text-slate-700">{boardActionMessage}</p> : null}

                  {isLoadingDoctorSlots ? <p className="mt-2 text-xs text-slate-500">Freie Slots werden geladen...</p> : null}
                  {!isLoadingDoctorSlots && slotsStatusReason ? <p className="mt-2 text-xs font-semibold text-amber-700">{slotsStatusReason}</p> : null}
                  {slotActionError ? <p className="mt-2 text-xs font-semibold text-rose-700">{slotActionError}</p> : null}

                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Freien Slot eintragen (nächste 3 Tage)</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSlotDayFilter("all")}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          slotDayFilter === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        Alle
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlotDayFilter("today")}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          slotDayFilter === "today" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        Heute
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlotDayFilter("tomorrow")}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          slotDayFilter === "tomorrow" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        Morgen
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlotDayFilter("day_after_tomorrow")}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          slotDayFilter === "day_after_tomorrow" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        Übermorgen
                      </button>
                    </div>

                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                      <label className="block text-xs text-slate-600">
                        Start
                        <input
                          type="datetime-local"
                          value={newSlotStart}
                          onChange={(event) => setNewSlotStart(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-slate-600">
                        Dauer (Min.)
                        <input
                          type="number"
                          min={10}
                          max={240}
                          step={5}
                          value={newSlotDuration}
                          onChange={(event) => setNewSlotDuration(Number(event.target.value) || 30)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void createManualFreeSlot()}
                        disabled={!newSlotStart || isSavingSlot}
                        className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Slot speichern
                      </button>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {filteredDoctorSlots.length > 0 ? (
                        filteredDoctorSlots.slice(0, 12).map((slot) => (
                          <div key={slot.id ?? `${slot.start}-${slot.end}`} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
                            <span className="font-semibold text-slate-700">{formatLongDate(getDateKey(new Date(slot.start)))} · {formatRange(slot.start, slot.end)}</span>
                            <button
                              type="button"
                              onClick={() => void deleteManualFreeSlot(slot.id)}
                              disabled={!slot.id || isSavingSlot}
                              className="rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 disabled:opacity-60"
                            >
                              Entfernen
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">Noch keine freien Slots eingetragen.</p>
                      )}
                    </div>
                  </div>

                  {calendarViewMode === "week" ? (
                    <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {visibleCalendarDays.map((day) => {
                        const dayKey = getDateKey(day);
                        const daySlots = (slotsByDay.get(dayKey) ?? []).slice(0, 6);
                        const dayAppointments = appointmentsByDay.get(dayKey) ?? [];

                        return (
                          <article key={dayKey} className="rounded-lg border border-slate-200 bg-white p-2.5">
                            <p className="text-xs font-semibold text-slate-800">{formatWeekdayLabel(day)}</p>

                            <div className="mt-2 space-y-1.5">
                              {dayAppointments.length > 0 ? (
                                dayAppointments.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                                      item.status === "confirmed"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : item.status === "pending"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-slate-200 text-slate-700"
                                    }`}
                                  >
                                    <p>{item.patientName}</p>
                                    <p>{formatRange(item.startsAt, item.endsAt)}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-slate-400">Keine bestätigten Termine.</p>
                              )}
                            </div>

                            <div className="mt-2 border-t border-slate-100 pt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Freie Slots</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {daySlots.length > 0 ? (
                                  daySlots.map((slot) => (
                                    <button
                                      key={slot.start}
                                      type="button"
                                      onClick={() => {
                                        setBoardActionMessage("");
                                        setSelectedCalendarDate(dayKey);
                                        applySlotToNewAppointment(slot);
                                      }}
                                      className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700"
                                    >
                                      {formatTime(slot.start)}
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400">Keine freien Slots</span>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold capitalize text-slate-800">{formatLongDate(selectedCalendarDate)}</p>
                      <div className="mt-3 space-y-1">
                        {dayTimelineHours.map((hour) => {
                          const items = appointmentsByHour.get(hour) ?? [];
                          const hourSlots = slotsByHour.get(hour) ?? [];
                          const hasData = items.length > 0 || hourSlots.length > 0;

                          return (
                            <div key={hour} className="grid grid-cols-[56px_1fr] gap-2">
                              <p className="pt-2 text-[11px] font-semibold text-slate-500">{String(hour).padStart(2, "0")}:00</p>
                                <div
                                  className={`rounded-lg border p-2 ${
                                    draggedAppointmentId ? "border-sky-300 bg-sky-50/40" : "border-slate-200 bg-slate-50"
                                  }`}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                  }}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    const droppedId = event.dataTransfer.getData("text/appointment-id") || draggedAppointmentId;
                                    if (!droppedId) {
                                      return;
                                    }
                                    setBoardActionMessage("");
                                    moveAppointmentToHour(droppedId, hour);
                                    setDraggedAppointmentId("");
                                  }}
                                >
                                {hasData ? (
                                  <div className="space-y-1.5">
                                    {items.map((item) => (
                                      <article
                                        key={item.id}
                                        className={`rounded-md border px-2 py-1.5 text-[11px] ${getAppointmentTone(item.status, item.type)}`}
                                          draggable
                                          onDragStart={(event) => {
                                            event.dataTransfer.setData("text/appointment-id", item.id);
                                            setDraggedAppointmentId(item.id);
                                            setBoardActionMessage("Termin wird verschoben ... Zielstunde wählen.");
                                          }}
                                          onDragEnd={() => {
                                            setDraggedAppointmentId("");
                                          }}
                                      >
                                          <p className="font-semibold">{formatRange(item.startsAt, item.endsAt)} · {item.patientName}</p>
                                          <p className="mt-0.5">{item.type}</p>
                                          <div className="mt-1.5 flex gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setBoardActionMessage("");
                                                adjustAppointmentDuration(item.id, -15);
                                              }}
                                              className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                                            >
                                              -15m
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setBoardActionMessage("");
                                                adjustAppointmentDuration(item.id, 15);
                                              }}
                                              className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                                            >
                                              +15m
                                            </button>
                                          </div>
                                      </article>
                                    ))}
                                    {hourSlots.map((slot) => (
                                      <button
                                        key={slot.start}
                                        type="button"
                                          onClick={() => {
                                            setBoardActionMessage("");
                                            applySlotToNewAppointment(slot);
                                          }}
                                        className="flex w-full items-center justify-between rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] font-semibold text-sky-900"
                                      >
                                        <span>Freier Slot</span>
                                        <span>{formatRange(slot.start, slot.end)}</span>
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBoardActionMessage("");
                                      const dateValue = `${selectedCalendarDate}T${String(hour).padStart(2, "0")}:00`;
                                      setNewAppointmentStart(dateValue);
                                      setNewAppointmentMode("blocked");
                                      setNewAppointmentType("Blockzeit");
                                      setNewAppointmentPatient("Praxisblock");
                                    }}
                                    className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-left text-[11px] text-slate-500 hover:border-slate-400 hover:text-slate-700"
                                  >
                                    Zeitfenster blocken
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Plus className="h-3.5 w-3.5" />
                    Neuer Termin (Composer)
                  </p>

                  <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                    Tipp: Klicke im Kalender auf einen freien Slot, um Startzeit und Dauer automatisch zu übernehmen.
                  </div>

                  <div className="mt-2 space-y-2">
                    <label className="block text-xs text-slate-600">
                      Patient
                      <input
                        value={newAppointmentPatient}
                        onChange={(event) => setNewAppointmentPatient(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                        placeholder="z. B. Maria K."
                      />
                    </label>

                    <label className="block text-xs text-slate-600">
                      Terminart
                      <input
                        value={newAppointmentType}
                        onChange={(event) => setNewAppointmentType(event.target.value)}
                        list="appointment-type-options"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                      />
                      <datalist id="appointment-type-options">
                        {appointmentTypeOptions.map((type) => (
                          <option key={type} value={type} />
                        ))}
                      </datalist>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAppointmentMode("confirmed")}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                          newAppointmentMode === "confirmed"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        Patienten-Termin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewAppointmentMode("blocked");
                          if (!newAppointmentType.trim()) {
                            setNewAppointmentType("Blockzeit");
                          }
                        }}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                          newAppointmentMode === "blocked"
                            ? "border-slate-400 bg-slate-200 text-slate-800"
                            : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        Blockzeit
                      </button>
                    </div>

                    <label className="block text-xs text-slate-600">
                      Start
                      <input
                        type="datetime-local"
                        value={newAppointmentStart}
                        onChange={(event) => setNewAppointmentStart(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                      />
                    </label>

                    <label className="block text-xs text-slate-600">
                      Dauer (Min.)
                      <input
                        type="number"
                        min={10}
                        step={5}
                        value={newAppointmentDuration}
                        onChange={(event) => setNewAppointmentDuration(Number(event.target.value) || 30)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                      />
                    </label>

                    <label className="block text-xs text-slate-600">
                      Notiz
                      <textarea
                        value={newAppointmentNote}
                        onChange={(event) => setNewAppointmentNote(event.target.value)}
                        className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={createManualAppointment}
                      disabled={!newAppointmentPatient.trim() || !newAppointmentStart}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Termin hinzufügen
                    </button>
                  </div>
                </section>
              </div>
            </div>
            ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        {isAdminRole && activeTab === "bewertungen" ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-amber-900">
              <MessageSquareText className="h-4 w-4" />
              Bewertungen & Kommentare (kommt bald)
            </h2>
            <p className="mt-1 text-sm text-amber-800">Bis zum Nutzerprofil-Launch zeigen wir hier nur verlässliche Live-Signale.</p>

            {!selectedDoctor ? <p className="mt-3 text-sm text-amber-900">Bitte zuerst ein Profil im Tab "Verwaltete Profile" auswählen.</p> : null}
            {isLoadingCommunity ? <p className="mt-3 text-sm text-slate-600">Kommentare werden geladen...</p> : null}
            {communityError ? <p className="mt-3 text-sm font-semibold text-rose-700">{communityError}</p> : null}

            {selectedDoctor && communitySnapshot ? (
              <>
                <article className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Live Profilaufrufe</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xl font-bold text-slate-900">
                    <Eye className="h-4 w-4 text-amber-600" />
                    {formatNumber(communitySnapshot.viewsCount)}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">Bewertungen und Kommentarverläufe werden aktiviert, sobald Nutzerprofile live sind.</p>
                </article>
              </>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
