"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  CalendarClock,
  CircleCheckBig,
  Clock3,
  HeartPulse,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { DevAnalyticsPanel } from "@/components/analytics/DevAnalyticsPanel";
import { prependLocalStorageItem, trackEvent } from "@/lib/analytics";
import { getDoctorSeoSlug, normalizeDoctorSearchText, type DoctorRecord, type DoctorTickerItem } from "@/lib/doctors";
import apothekenJson from "@/data/APOTHEKEOGD.json";

type LandingPageProps = {
  initialCategory?: string;
  doctorSpecialties?: string[];
  doctorDistricts?: string[];
  tickerItems?: DoctorTickerItem[];
  totalDoctors?: number;
  byCategory?: Record<string, number>;
  byDistrictCategory?: Record<string, number>;
};

type LeadEntry = {
  id: string;
  source: string;
  name: string;
  contact: string;
  category: string;
  district: string;
  createdAt: string;
};

type SeoQuickLink = {
  label: string;
  search: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type DoctorSearchPayload = {
  doctors?: DoctorRecord[];
};

type UpcomingDoctorSlotsItem = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  district: string;
  slots: Array<{ id?: string; start: string; end: string }>;
};

type UpcomingDoctorSlotsPayload = {
  ok?: boolean;
  items?: UpcomingDoctorSlotsItem[];
};

type TopViewedDoctorItem = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  district: string;
  profileViews: number;
};

type TopViewedDoctorsPayload = {
  ok?: boolean;
  items?: TopViewedDoctorItem[];
};

type ApothekeFeatureCollection = {
  type?: string;
  features?: ApothekeFeature[];
};

type ApothekeFeature = {
  id?: string;
  geometry?: {
    coordinates?: number[];
  };
  properties?: {
    BEZEICHNUNG?: string;
    BEZIRK?: number | string;
    ADRESSE?: string;
    TELEFON?: string;
    EMAIL?: string;
    WEBLINK1?: string | null;
  };
};

type ApothekeItem = {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  lat: number | null;
  lng: number | null;
};

const fallbackDistricts = [
  "All Wien",
  "01. Innere Stadt",
  "03. Landstraße",
  "10. Favoriten",
  "21. Floridsdorf",
  "22. Donaustadt",
];

const fallbackCategories = [
  "Hausarzt / Allgemeinmedizin",
  "Dermatologie",
  "Zahnmedizin",
  "Augenheilkunde",
  "Orthopädie",
];

const ALL_SPECIALTIES = "Alle Fachbereiche";

const seoQuickLinks: SeoQuickLink[] = [
  { label: "Hausarzt 1100 Wien", search: "Hausarzt 1100 Wien" },
  { label: "Zahnarzt 1030 Wien", search: "Zahnarzt 1030 Wien" },
  { label: "Orthopädie Wien", search: "Orthopädie Wien" },
  { label: "Augenarzt 1070 Wien", search: "Augenarzt 1070 Wien" },
  { label: "Dermatologie 1060 Wien", search: "Dermatologie 1060 Wien" },
  { label: "Kinderarzt 1220 Wien", search: "Kinderarzt 1220 Wien" },
  { label: "HNO 1180 Wien", search: "HNO 1180 Wien" },
  { label: "Gynäkologie 1090 Wien", search: "Gynäkologie 1090 Wien" },
];

const faqItems: FaqItem[] = [
  {
    question: "Wie finde ich schnell einen freien Arzttermin in Wien?",
    answer:
      "Wähle Bezirk und Fachbereich oder nutze die Suche auf Terminbörse.at. Danach siehst du passende Einträge und kannst direkt Kontakt aufnehmen.",
  },
  {
    question: "Kostet die Nutzung von Terminbörse.at etwas?",
    answer:
      "Nein. Die Suche und Termin-Anfrage für Patientinnen und Patienten ist kostenfrei.",
  },
  {
    question: "Kann ich auf Terminbörse.at auch Apotheken in Wien suchen?",
    answer:
      "Ja. Im Apotheken-Bereich auf der Startseite kannst du nach Name oder Adresse suchen und gezielt nach Bezirken filtern.",
  },
  {
    question: "Ich bin Ärztin/Arzt in Wien. Wie erhalte ich Anfragen?",
    answer:
      "Über den Button Profil kostenlos beanspruchen kannst du Kontakt aufnehmen und dein Profil für direkte Termin-Anfragen aktivieren.",
  },
];

function isValidContact(contact: string) {
  const trimmed = contact.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9\s()\-]{7,}$/;
  return emailRegex.test(trimmed) || phoneRegex.test(trimmed);
}

function formatSlotWindow(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  const day = new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(startDate);
  const startTime = new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(startDate);
  const endTime = new Intl.DateTimeFormat("de-AT", { hour: "2-digit", minute: "2-digit" }).format(endDate);

  return `${day} · ${startTime} - ${endTime}`;
}

function normalizeWebsite(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getMapsUrl(apotheke: ApothekeItem) {
  if (typeof apotheke.lat === "number" && typeof apotheke.lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${apotheke.lat},${apotheke.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${apotheke.address}, Wien`)}`;
}

function normalizeApothekenData(data: unknown): ApothekeItem[] {
  const source = data as ApothekeFeatureCollection;
  const features = Array.isArray(source?.features) ? source.features : [];
  return features
    .map((feature, index) => {
      const properties = feature.properties ?? {};
      const coordinates = feature.geometry?.coordinates;
      const districtRaw = properties.BEZIRK;
      const districtNumber = typeof districtRaw === "number" ? districtRaw : Number.parseInt(String(districtRaw ?? ""), 10);
      const district = Number.isFinite(districtNumber)
        ? `${String(districtNumber).padStart(2, "0")}. Bezirk`
        : "Unbekannter Bezirk";

      return {
        id: feature.id ?? `apotheke-${index}`,
        name: (properties.BEZEICHNUNG ?? "Apotheke").trim(),
        district,
        address: (properties.ADRESSE ?? "Adresse nicht verfügbar").trim(),
        phone: (properties.TELEFON ?? "").trim(),
        email: (properties.EMAIL ?? "").trim(),
        website: normalizeWebsite(properties.WEBLINK1 ?? ""),
        lng: Array.isArray(coordinates) && Number.isFinite(coordinates[0]) ? coordinates[0] : null,
        lat: Array.isArray(coordinates) && Number.isFinite(coordinates[1]) ? coordinates[1] : null,
      };
    })
    .filter((item) => item.name.length > 0);
}

export function LandingPage({
  initialCategory,
  doctorSpecialties = [],
  doctorDistricts = [],
  tickerItems: incomingTickerItems = [],
  totalDoctors = 0,
  byCategory = {},
  byDistrictCategory = {},
}: LandingPageProps) {
  const router = useRouter();
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const availableDoctorSpecialties = useMemo(() => doctorSpecialties, [doctorSpecialties]);
  const availableDoctorDistricts = useMemo(() => doctorDistricts, [doctorDistricts]);
  const availableCategories = useMemo(() => {
    const combined = new Set([ALL_SPECIALTIES, ...availableDoctorSpecialties, ...fallbackCategories]);
    return Array.from(combined);
  }, [availableDoctorSpecialties]);

  const tickerItems = useMemo(() => {
    if (incomingTickerItems.length > 0) {
      return incomingTickerItems;
    }
    return [
      {
        district: "10. Bezirk",
        title: "OEGK Dermatologie",
        time: "Heute 14:30 Uhr",
        category: "Dermatologie",
        address: "Favoritenstraße 124, 1100 Wien",
      },
      {
        district: "03. Bezirk",
        title: "Wahlarzt Augenheilkunde",
        time: "Heute 16:15 Uhr",
        category: "Augenheilkunde",
        address: "Landstraßer Hauptstraße 58, 1030 Wien",
      },
      {
        district: "21. Bezirk",
        title: "OEGK Zahnmedizin",
        time: "Morgen 09:00 Uhr",
        category: "Zahnmedizin",
        address: "Brünner Straße 44, 1210 Wien",
      },
    ];
  }, [incomingTickerItems]);

  const [district, setDistrict] = useState("All Wien");
  const [category, setCategory] = useState(initialCategory ?? ALL_SPECIALTIES);
  const [doctorNameQuery, setDoctorNameQuery] = useState("");
  const [doctorSuggestions, setDoctorSuggestions] = useState<DoctorRecord[]>([]);
  const [isLoadingDoctorSuggestions, setIsLoadingDoctorSuggestions] = useState(false);
  const [isDoctorSuggestionsOpen, setIsDoctorSuggestionsOpen] = useState(false);
  const doctorSearchBoxRef = useRef<HTMLDivElement | null>(null);
  const [source, setSource] = useState("hero");
  const [upcomingDoctorSlots, setUpcomingDoctorSlots] = useState<UpcomingDoctorSlotsItem[]>([]);
  const [topViewedDoctors, setTopViewedDoctors] = useState<TopViewedDoctorItem[]>([]);

  const [nameInput, setNameInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [formCategory, setFormCategory] = useState(initialCategory ?? availableCategories[0] ?? "Dermatologie");
  const [formDistrict, setFormDistrict] = useState("All Wien");
  const [formError, setFormError] = useState("");

  const [apothekeSearch, setApothekeSearch] = useState("");
  const [apothekeDistrict, setApothekeDistrict] = useState("Alle Bezirke");

  const apotheken = useMemo(() => normalizeApothekenData(apothekenJson), []);
  const apothekeDistrictOptions = useMemo(() => {
    const unique = Array.from(new Set(apotheken.map((item) => item.district)));
    const sorted = unique.sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
    return ["Alle Bezirke", ...sorted];
  }, [apotheken]);

  const filteredApotheken = useMemo(() => {
    const query = apothekeSearch.trim().toLowerCase();

    return apotheken
      .filter((item) => {
        if (apothekeDistrict !== "Alle Bezirke" && item.district !== apothekeDistrict) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchable = `${item.name} ${item.address} ${item.district}`.toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 9);
  }, [apothekeDistrict, apothekeSearch, apotheken]);

  const heroSummary = useMemo(() => {
    const parts: string[] = [];
    if (doctorNameQuery.trim()) {
      parts.push(`Dr. Name: ${doctorNameQuery.trim()}`);
    }
    parts.push(district);
    parts.push(category);
    return parts.join(" · ");
  }, [doctorNameQuery, district, category]);

  const heroDoctorCount = useMemo(() => {
    if (district === "All Wien" && category === ALL_SPECIALTIES) {
      return totalDoctors;
    }

    if (district !== "All Wien" && category === ALL_SPECIALTIES) {
      let totalForDistrict = 0;
      for (const [key, count] of Object.entries(byDistrictCategory)) {
        if (key.startsWith(`${district}::`)) {
          totalForDistrict += count;
        }
      }
      return totalForDistrict;
    }

    if (district === "All Wien") {
      return byCategory[category] ?? totalDoctors;
    }

    return byDistrictCategory[`${district}::${category}`] ?? 0;
  }, [byCategory, byDistrictCategory, category, district, totalDoctors]);

  const heroSearchQuery = useMemo(() => {
    const parts: string[] = [];

    if (doctorNameQuery.trim()) {
      parts.push(doctorNameQuery.trim());
    }

    if (category !== ALL_SPECIALTIES) {
      parts.push(category);
    }

    if (district !== "All Wien") {
      parts.push(district);
    }

    return parts.join(" ").trim();
  }, [doctorNameQuery, category, district]);

  useEffect(() => {
    const query = doctorNameQuery.trim();
    if (query.length < 2) {
      setDoctorSuggestions([]);
      setIsLoadingDoctorSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoadingDoctorSuggestions(true);

      try {
        const response = await fetch(`/api/doctors?q=${encodeURIComponent(query)}&page=1&pageSize=8`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Doctors API failed with ${response.status}`);
        }

        const payload = (await response.json()) as DoctorSearchPayload;
        const normalizedQuery = normalizeDoctorSearchText(query);
        const doctors = Array.isArray(payload.doctors) ? payload.doctors : [];

        const sorted = doctors
          .slice()
          .sort((a, b) => {
            const aStarts = normalizeDoctorSearchText(a.name).startsWith(normalizedQuery) ? 0 : 1;
            const bStarts = normalizeDoctorSearchText(b.name).startsWith(normalizedQuery) ? 0 : 1;
            if (aStarts !== bStarts) {
              return aStarts - bStarts;
            }
            return a.name.localeCompare(b.name, "de");
          })
          .slice(0, 6);

        setDoctorSuggestions(sorted);
        setIsDoctorSuggestionsOpen(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setDoctorSuggestions([]);
      } finally {
        setIsLoadingDoctorSuggestions(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [doctorNameQuery]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUpcomingSlots() {
      try {
        const response = await fetch("/api/doctors/upcoming-slots", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as UpcomingDoctorSlotsPayload;
        if (!payload.ok || !Array.isArray(payload.items)) {
          return;
        }

        setUpcomingDoctorSlots(payload.items);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setUpcomingDoctorSlots([]);
      }
    }

    void loadUpcomingSlots();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTopViewedDoctors() {
      try {
        const response = await fetch("/api/doctors/top-viewed", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as TopViewedDoctorsPayload;
        if (!payload.ok || !Array.isArray(payload.items)) {
          return;
        }

        setTopViewedDoctors(payload.items);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setTopViewedDoctors([]);
      }
    }

    void loadTopViewedDoctors();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    function closeWhenClickedOutside(event: MouseEvent) {
      if (!doctorSearchBoxRef.current) {
        return;
      }

      if (doctorSearchBoxRef.current.contains(event.target as Node)) {
        return;
      }

      setIsDoctorSuggestionsOpen(false);
    }

    document.addEventListener("mousedown", closeWhenClickedOutside);
    return () => {
      document.removeEventListener("mousedown", closeWhenClickedOutside);
    };
  }, []);

  function selectDoctorFromSuggestion(doctor: DoctorRecord) {
    setDoctorNameQuery(doctor.name);
    setDoctorSuggestions([]);
    setIsDoctorSuggestionsOpen(false);

    trackEvent("cta_clicked", {
      source: "landing-hero-doctor-suggestion",
      action: "doctor_profile_direct",
      doctor_id: doctor.id,
      category: doctor.specialty,
      district: doctor.district,
    });

    router.push(`/arzt/${encodeURIComponent(getDoctorSeoSlug(doctor))}`);
  }

  function handleHeroSearch() {
    trackEvent("cta_clicked", {
      source: "hero-search-redirect",
      category,
      district,
      search_term: heroSearchQuery,
    });

    const params = new URLSearchParams();

    if (heroSearchQuery) {
      params.set("search", heroSearchQuery);
    }

    if (category !== ALL_SPECIALTIES) {
      params.set("category", category);
    }

    if (district !== "All Wien") {
      params.set("district", district);
    }

    router.push(params.toString() ? `/arzt?${params.toString()}` : "/arzt");
  }

  function openLeadModal(triggerSource: string, preselectedCategory?: string, preselectedDistrict?: string) {
    setSource(triggerSource);
    setLeadModalOpen(true);
    setIsSuccess(false);
    setFormError("");
    setFormCategory(preselectedCategory ?? category);
    setFormDistrict(preselectedDistrict ?? district);
    trackEvent("cta_clicked", {
      source: triggerSource,
      category: preselectedCategory ?? category,
      district: preselectedDistrict ?? district,
    });
    trackEvent("modal_opened", {
      source: triggerSource,
      modal: "lead",
      category: preselectedCategory ?? category,
      district: preselectedDistrict ?? district,
    });
  }

  async function handleLeadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidContact(contactInput)) {
      setFormError("Bitte gib eine gültige E-Mail-Adresse oder WhatsApp-Nummer ein.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    const entry: LeadEntry = {
      id: crypto.randomUUID(),
      source,
      name: nameInput.trim(),
      contact: contactInput.trim(),
      category: formCategory,
      district: formDistrict,
      createdAt: new Date().toISOString(),
    };

    try {
      prependLocalStorageItem("terminboerse_leads", entry);

      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });

      trackEvent("lead_submitted", {
        source,
        category: formCategory,
        district: formDistrict,
        channel: contactInput.includes("@") ? "email" : "whatsapp",
      });

      console.log("Lead erfasst:", entry);
      setIsSuccess(true);
      setNameInput("");
      setContactInput("");
    } catch (error) {
      console.error("Lead konnte nicht gespeichert werden", error);
      setFormError("Es gab ein Problem beim Speichern. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-28 pt-6 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <section className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_15px_45px_rgba(2,132,199,0.14)] backdrop-blur md:p-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <Clock3 className="h-3.5 w-3.5" />
            Lange Wartelisten? Nicht in Wien.
          </p>
          <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Wochenlang warten? Heute noch zum Arzt in Wien!
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
            Die Börse für kurzfristige Arzttermine in Wien. Schnell, einfach & kostenfrei.
          </p>

          <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto] md:gap-4 md:p-4">
            <div ref={doctorSearchBoxRef} className="relative">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <Search className="h-4 w-4 text-sky-600" />
                <input
                  value={doctorNameQuery}
                  onFocus={() => {
                    if (doctorNameQuery.trim().length >= 2) {
                      setIsDoctorSuggestionsOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    setDoctorNameQuery(event.target.value);
                    if (event.target.value.trim().length >= 2) {
                      setIsDoctorSuggestionsOpen(true);
                    }
                  }}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Arztname eingeben (optional)"
                  aria-label="Arztname eingeben"
                />
              </label>

              {isDoctorSuggestionsOpen && doctorNameQuery.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {isLoadingDoctorSuggestions ? (
                    <p className="px-3 py-2 text-xs text-slate-500">Suche läuft...</p>
                  ) : doctorSuggestions.length > 0 ? (
                    <ul className="max-h-64 overflow-auto">
                      {doctorSuggestions.map((doctor) => (
                        <li key={doctor.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectDoctorFromSuggestion(doctor);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left hover:bg-sky-50"
                          >
                            <p className="text-sm font-semibold text-slate-900">{doctor.name}</p>
                            <p className="text-xs text-slate-600">{doctor.specialty} · {doctor.district}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-xs text-slate-500">Keine passenden Ärzte gefunden.</p>
                  )}
                </div>
              ) : null}
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-sky-600" />
              <select
                value={district}
                onChange={(event) => {
                  const nextDistrict = event.target.value;
                  setDistrict(nextDistrict);
                  trackEvent("district_selected", {
                    source: "landing-hero",
                    district: nextDistrict,
                    current_category: category,
                  });
                }}
                className="w-full bg-transparent text-sm outline-none"
                aria-label="Bezirk wählen"
              >
                {(availableDoctorDistricts.length > 0 ? availableDoctorDistricts : fallbackDistricts).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <HeartPulse className="h-4 w-4 text-sky-600" />
              <select
                value={category}
                onChange={(event) => {
                  const nextCategory = event.target.value;
                  setCategory(nextCategory);
                  trackEvent("specialty_selected", {
                    source: "landing-hero",
                    specialty: nextCategory,
                    current_district: district,
                  });
                }}
                className="w-full bg-transparent text-sm outline-none"
                aria-label="Fachbereich wählen"
              >
                {availableCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={handleHeroSearch}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500 active:scale-[0.99]"
            >
              Freie Termine suchen
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Auswahl: <span className="font-semibold text-slate-700">{heroSummary}</span> · {heroDoctorCount} Ärzte
          </p>
        </section>

        {topViewedDoctors.length > 0 ? (
          <section className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50 p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-700">
                <TrendingUp className="h-4 w-4" />
                Meistgesuchte Ärzte
              </p>
              <p className="text-xs text-slate-500">Live-Ranking</p>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {topViewedDoctors.map((item, index) => (
                <Link
                  key={item.doctorId}
                  href={`/arzt/${encodeURIComponent(getDoctorSeoSlug({ id: item.doctorId, name: item.doctorName, specialty: item.specialty, district: item.district }))}`}
                  className="rounded-xl border border-sky-200 bg-white p-3 transition hover:border-sky-400 hover:shadow-sm"
                >
                  <p className="text-xs font-semibold text-sky-600">#{index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{item.doctorName}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.specialty} · {item.district}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-700">Freie Termine in den nächsten 3 Tagen</p>
            <p className="text-xs text-slate-500">Live aus Arztprofilen</p>
          </div>

          {upcomingDoctorSlots.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {upcomingDoctorSlots.map((item) => (
                <article key={item.doctorId} className="rounded-xl border border-emerald-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-800">🟢 {item.district} - {item.specialty}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.doctorName}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatSlotWindow(item.slots[0]?.start ?? "", item.slots[0]?.end ?? "")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.slots.slice(1).map((slot) => (
                      <span key={slot.id ?? `${slot.start}-${slot.end}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {formatSlotWindow(slot.start, slot.end)}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/arzt/${encodeURIComponent(getDoctorSeoSlug({ id: item.doctorId, name: item.doctorName, specialty: item.specialty, district: item.district }))}`}
                    className="mt-3 inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Profil öffnen
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Aktuell wurden noch keine freien 3-Tage-Slots veröffentlicht.</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <h2 className="text-2xl font-bold text-slate-900">Arzttermin in Wien finden: So nutzt du Terminbörse.at</h2>
          </div>
          <p className="mb-4 max-w-3xl text-sm text-slate-600">
            Suche gezielt nach Arzttermin Wien, kurzfristiger Arzttermin oder Facharzt Wien, prüfe freie 3-Tage-Slots und kontaktiere passende Profile direkt.
          </p>
          <div className="grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <BellRing className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">1. Fachbereich und Bezirk wählen</h3>
              <p className="mt-2 text-sm text-slate-600">Starte mit deiner Suche nach Fachrichtung und Bezirk in Wien.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <CalendarClock className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">2. Freie 3-Tage-Slots prüfen</h3>
              <p className="mt-2 text-sm text-slate-600">Sieh dir direkt die veröffentlichten Zeitfenster der nächsten 3 Tage an.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Mail className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">3. Passende Arztprofile vergleichen</h3>
              <p className="mt-2 text-sm text-slate-600">Prüfe Standort, Fachbereich und Kontaktoptionen der angezeigten Profile.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <CircleCheckBig className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">4. Direkt Termin-Anfrage senden</h3>
              <p className="mt-2 text-sm text-slate-600">Nimm direkt Kontakt auf und frage deinen Wunschtermin bei der Ordination an.</p>
            </article>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Hinweis: Freie 3-Tage-Slots zeigen aktuelle Verfügbarkeiten, Terminbörse.at vermittelt jedoch Kontakte und Anfragen und garantiert keinen Soforttermin.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Beliebte Suchen in Wien</h2>
          <p className="mt-2 text-sm text-slate-600">Schnell zu häufig gesuchten Kombinationen für organische Suche und direkte Termin-Anfragen.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {seoQuickLinks.map((item) => (
              <Link
                key={item.search}
                href={`/arzt?search=${encodeURIComponent(item.search)}`}
                className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
                onClick={() => {
                  trackEvent("cta_clicked", {
                    source: "seo-quick-links",
                    action: "quick_search",
                    search_term: item.search,
                  });
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section id="apotheken-wien" className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Apotheken in Wien finden</h2>
          <p className="mt-2 text-sm text-slate-600">Suche nach Name oder Adresse und filtere nach Bezirk, um schnell die passende Apotheke zu finden.</p>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <Search className="h-4 w-4 text-amber-600" />
              <input
                value={apothekeSearch}
                onChange={(event) => setApothekeSearch(event.target.value)}
                placeholder="Apothekenname oder Adresse"
                className="w-full bg-transparent outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-amber-600" />
              <select
                value={apothekeDistrict}
                onChange={(event) => setApothekeDistrict(event.target.value)}
                className="w-full bg-transparent outline-none"
              >
                {apothekeDistrictOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-600">{filteredApotheken.length} Ergebnisse</p>

          {filteredApotheken.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredApotheken.map((apotheke) => (
                <article key={apotheke.id} className="rounded-xl border border-amber-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{apotheke.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{apotheke.district} · {apotheke.address}</p>
                  {apotheke.phone ? <p className="mt-1 text-xs font-semibold text-slate-700">Tel: {apotheke.phone}</p> : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {apotheke.phone ? (
                      <a
                        href={`tel:${apotheke.phone.replace(/[^+\d]/g, "")}`}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Anrufen
                      </a>
                    ) : null}
                    <a
                      href={getMapsUrl(apotheke)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Route
                    </a>
                    {apotheke.website ? (
                      <a
                        href={apotheke.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-400"
                      >
                        Website
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">Keine Apotheke für diese Suche gefunden.</p>
          )}
        </section>

        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Für Ärztinnen & Ärzte in Wien</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Sind Sie Ärztin oder Arzt in Wien?</h2>
          <p className="mt-2 max-w-3xl text-slate-700">
            Profil kostenlos beanspruchen und direkte Termin-Anfragen von Patientinnen und Patienten erhalten.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/arztbereich"
              className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-sky-500"
            >
              Profil kostenlos beanspruchen
            </Link>
            <Link
              href="/arzt"
              className="rounded-xl border border-sky-300 bg-white px-5 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Arztverzeichnis ansehen
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Häufige Fragen zu Arztterminen in Wien</h2>
          <div className="mt-5 space-y-3">
            {faqItems.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 open:bg-white">
                <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-slate-900">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <button
          onClick={() => openLeadModal("mobile-sticky-cta", category, district)}
          className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(2,132,199,0.3)]"
        >
          Jetzt freie Termine suchen
        </button>
      </div>

      {leadModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Sofort-Benachrichtigung für freie Termine aktivieren</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Aufgrund hoher Nachfrage vergeben wir freie Storno-Termine per WhatsApp/E-Mail in Echtzeit.
                </p>
              </div>
              <button
                onClick={() => setLeadModalOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100"
                aria-label="Modal schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="font-semibold">Vielen Dank! Wir informieren dich sofort, sobald ein passender Storno-Termin frei wird.</p>
                <button
                  onClick={() => setLeadModalOpen(false)}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Name (optional)</span>
                  <input
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                    placeholder="Dein Name"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">E-Mail oder WhatsApp-Nummer (erforderlich)</span>
                  <input
                    required
                    value={contactInput}
                    onChange={(event) => setContactInput(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                    placeholder="name@email.at oder +43..."
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Gesuchter Arzt / Fachbereich</span>
                  <select
                    value={formCategory}
                    onChange={(event) => setFormCategory(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  >
                    {availableCategories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Bezirk</span>
                  <select
                    value={formDistrict}
                    onChange={(event) => setFormDistrict(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  >
                    {(availableDoctorDistricts.length > 0 ? availableDoctorDistricts : fallbackDistricts).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <p className="text-xs text-slate-500">
                  Mit dem Absenden stimmst du der Verarbeitung gem. Datenschutz zu.
                </p>

                {formError ? <p className="text-sm font-medium text-rose-700">{formError}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Wird aktiviert..." : "Benachrichtigung aktivieren"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <DevAnalyticsPanel />
    </div>
  );
}
