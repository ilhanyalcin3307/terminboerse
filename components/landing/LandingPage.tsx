"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BellRing,
  BriefcaseBusiness,
  CircleCheckBig,
  Clock3,
  Hammer,
  HeartPulse,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { DevAnalyticsPanel } from "@/components/analytics/DevAnalyticsPanel";
import { TerminboerseLogo } from "@/components/branding/TerminboerseLogo";
import { prependLocalStorageItem, trackEvent } from "@/lib/analytics";
import type { DoctorTickerItem } from "@/lib/doctors";

type LandingPageProps = {
  initialCategory?: string;
  doctorSpecialties?: string[];
  doctorDistricts?: string[];
  tickerItems?: DoctorTickerItem[];
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

const fallbackDistricts = [
  "All Wien",
  "01. Innere Stadt",
  "03. Landstrasse",
  "10. Favoriten",
  "21. Floridsdorf",
  "22. Donaustadt",
];

const fallbackCategories = [
  "Dermatologie",
  "Zahnmedizin",
  "Augenheilkunde",
  "Elektriker",
  "Installateur",
  "Orthopaedie",
];

const sectorCards = [
  {
    title: "Arzt & Gesundheit",
    href: "/arzt",
    badge: "32 Storno-Termine heute",
    icon: HeartPulse,
    active: true,
    category: "Dermatologie",
  },
  {
    title: "Handwerker & Haus",
    href: "/handwerker",
    badge: "14 Betriebe verfuegbar",
    icon: Hammer,
    active: true,
    category: "Elektriker",
  },
  {
    title: "Recht & Finanzen",
    href: "/",
    badge: "Demnaechst",
    icon: BriefcaseBusiness,
    active: false,
    category: "Recht",
  },
  {
    title: "Beauty & Wellness",
    href: "/",
    badge: "Demnaechst",
    icon: Sparkles,
    active: false,
    category: "Beauty",
  },
];

function isValidContact(contact: string) {
  const trimmed = contact.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9\s()\-]{7,}$/;
  return emailRegex.test(trimmed) || phoneRegex.test(trimmed);
}

export function LandingPage({
  initialCategory,
  doctorSpecialties = [],
  doctorDistricts = [],
  tickerItems: incomingTickerItems = [],
}: LandingPageProps) {
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const availableDoctorSpecialties = useMemo(() => doctorSpecialties, [doctorSpecialties]);
  const availableDoctorDistricts = useMemo(() => doctorDistricts, [doctorDistricts]);
  const availableCategories = useMemo(() => {
    const combined = new Set([...availableDoctorSpecialties, ...fallbackCategories]);
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
        address: "Favoritenstrasse 124, 1100 Wien",
      },
      {
        district: "03. Bezirk",
        title: "Wahlarzt Augenheilkunde",
        time: "Heute 16:15 Uhr",
        category: "Augenheilkunde",
        address: "Landstrasser Hauptstrasse 58, 1030 Wien",
      },
      {
        district: "21. Bezirk",
        title: "OEGK Zahnmedizin",
        time: "Morgen 09:00 Uhr",
        category: "Zahnmedizin",
        address: "Bruenner Strasse 44, 1210 Wien",
      },
    ];
  }, [incomingTickerItems]);

  const [district, setDistrict] = useState("All Wien");
  const [category, setCategory] = useState(initialCategory ?? availableCategories[0] ?? "Dermatologie");
  const [source, setSource] = useState("hero");

  const [nameInput, setNameInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [formCategory, setFormCategory] = useState(initialCategory ?? availableCategories[0] ?? "Dermatologie");
  const [formDistrict, setFormDistrict] = useState("All Wien");
  const [formError, setFormError] = useState("");

  const [waitlistCategory, setWaitlistCategory] = useState("");
  const [waitlistContact, setWaitlistContact] = useState("");
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const [providerName, setProviderName] = useState("");
  const [providerContact, setProviderContact] = useState("");
  const [providerType, setProviderType] = useState("Arztpraxis");
  const [providerMessage, setProviderMessage] = useState("");
  const [providerSuccess, setProviderSuccess] = useState(false);

  const heroSummary = useMemo(() => {
    return `${district} · ${category}`;
  }, [district, category]);

  function openProviderModal() {
    setProviderModalOpen(true);
    setProviderSuccess(false);
    trackEvent("cta_clicked", { source: "navbar-provider", category: "provider", district: "all" });
    trackEvent("modal_opened", { source: "navbar-provider", modal: "provider" });
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

  function openWaitlistModal(triggerSource: string, selectedCategory: string) {
    setWaitlistModalOpen(true);
    setWaitlistSuccess(false);
    setWaitlistError("");
    setWaitlistContact("");
    setWaitlistCategory(selectedCategory);
    trackEvent("cta_clicked", {
      source: triggerSource,
      category: selectedCategory,
      district,
    });
    trackEvent("modal_opened", {
      source: triggerSource,
      modal: "waitlist",
      category: selectedCategory,
      district,
    });
  }

  async function handleLeadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidContact(contactInput)) {
      setFormError("Bitte gib eine gueltige E-Mail-Adresse oder WhatsApp-Nummer ein.");
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

  function handleProviderSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const entry = {
      providerName: providerName.trim(),
      providerContact: providerContact.trim(),
      providerType,
      providerMessage: providerMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    console.log("Termin anbieten Kontakt:", entry);
    setProviderSuccess(true);
    setProviderName("");
    setProviderContact("");
    setProviderType("Arztpraxis");
    setProviderMessage("");
  }

  function handleWaitlistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidContact(waitlistContact)) {
      setWaitlistError("Bitte gib eine gueltige E-Mail-Adresse oder WhatsApp-Nummer ein.");
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      source: "inactive-category",
      category: waitlistCategory,
      district,
      contact: waitlistContact.trim(),
      createdAt: new Date().toISOString(),
    };

    prependLocalStorageItem("terminboerse_waitlist", entry);

    trackEvent("lead_submitted", {
      source: "inactive-category",
      category: waitlistCategory,
      district,
      channel: waitlistContact.includes("@") ? "email" : "whatsapp",
    });

    console.log("Warteliste Lead erfasst:", entry);
    setWaitlistSuccess(true);
    setWaitlistError("");
    setWaitlistContact("");
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.35),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(2,132,199,0.28),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_56%,#f8fafc_100%)]" />

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Zur Startseite">
            <TerminboerseLogo />
          </Link>
          <button
            onClick={openProviderModal}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_25px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-700 sm:px-4 sm:text-sm"
          >
            <Wrench className="h-4 w-4" />
            Termin anbieten
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-28 pt-6 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
        <section className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_15px_45px_rgba(2,132,199,0.14)] backdrop-blur md:p-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <Clock3 className="h-3.5 w-3.5" />
            Lange Wartelisten? Nicht in Wien.
          </p>
          <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Wochenlang warten? Heute noch zum Arzt oder Handwerker!
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
            Die Boerse fuer kurzfristige Storno-Termine in Wien. Schnell, einfach & kostenfrei.
          </p>

          <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_1fr_auto] md:gap-4 md:p-4">
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
                aria-label="Bezirk waehlen"
              >
                  {(availableDoctorDistricts.length > 0 ? availableDoctorDistricts : fallbackDistricts).map((item) => (
                  <option key={item} value={item}>
                    Bezirk waehlen ({item})
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
                aria-label="Fachbereich waehlen"
              >
                {availableCategories.map((item) => (
                  <option key={item} value={item}>
                    Fachbereich ({item})
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => openLeadModal("hero-search", category, district)}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500 active:scale-[0.99]"
            >
              Freie Termine suchen
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Auswahl: <span className="font-semibold text-slate-700">{heroSummary}</span>
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-700">Live Storno-Ticker</p>
            <p className="text-xs text-slate-500">Vor 2 Minuten aktualisiert</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {tickerItems.map((item) => (
              <article key={`${item.district}-${item.title}`} className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">🟢 {item.district} - {item.title}</p>
                <p className="mt-1 text-sm text-slate-600">({item.time})</p>
                <p className="mt-1 text-xs text-slate-500">{item.address}</p>
                <button
                  onClick={() => openLeadModal("ticker", item.category, item.district)}
                  className="mt-3 inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  Termin sichern
                </button>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-slate-900">Bereiche</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {sectorCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  onClick={() => {
                    if (card.active) {
                      openLeadModal("category", card.category, district);
                      return;
                    }
                    openWaitlistModal("inactive-category", card.title);
                  }}
                  className={`group rounded-2xl border p-5 text-left transition ${
                    card.active
                      ? "border-sky-200 bg-white hover:-translate-y-0.5 hover:shadow-lg"
                      : "border-slate-200 bg-slate-100/75"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-6 w-6 ${card.active ? "text-sky-600" : "text-slate-500"}`} />
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        card.active ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {card.badge}
                    </span>
                  </div>
                  <p className="mt-4 text-lg font-bold text-slate-900">{card.title}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {card.active ? "Jetzt passende Storno-Termine entdecken" : "Jetzt Warteliste aktivieren"}
                  </p>
                  {card.active ? (
                    <Link
                      href={card.href}
                      className="mt-4 inline-block text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Bereich ansehen
                    </Link>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <h2 className="text-2xl font-bold text-slate-900">So funktioniert es</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <BellRing className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">1. Benachrichtigung aktivieren</h3>
              <p className="mt-2 text-sm text-slate-600">Waehle Fachbereich und Bezirk.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Mail className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">2. Storno-Alert erhalten</h3>
              <p className="mt-2 text-sm text-slate-600">Sobald ein Termin frei wird, wirst du benachrichtigt.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <CircleCheckBig className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">3. Direkt buchen</h3>
              <p className="mt-2 text-sm text-slate-600">Gehe ohne monatelange Wartezeit zum Termin.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/90">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-sky-700">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-sky-700">Datenschutz</Link>
            <Link href="/kontakt" className="hover:text-sky-700">Kontakt</Link>
          </div>
          <p>© 2026 TerminBoerse.at - Made with ❤️ in Wien.</p>
        </div>
      </footer>

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
                <h3 className="text-xl font-bold text-slate-900">Sofort-Benachrichtigung fuer freie Termine aktivieren</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Aufgrund hoher Nachfrage vergeben wir freie Storno-Termine per WhatsApp/E-Mail in Echtzeit.
                </p>
              </div>
              <button
                onClick={() => setLeadModalOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100"
                aria-label="Modal schliessen"
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
                  Schliessen
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

      {providerModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Termin anbieten</h3>
                <p className="mt-1 text-sm text-slate-600">Fuer Arztpraxen und Handwerksbetriebe: Wir melden uns zeitnah bei dir.</p>
              </div>
              <button
                onClick={() => setProviderModalOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100"
                aria-label="Modal schliessen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {providerSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="font-semibold">Danke! Wir melden uns in Kuerze fuer die Freischaltung.</p>
              </div>
            ) : (
              <form onSubmit={handleProviderSubmit} className="space-y-3">
                <input
                  value={providerName}
                  onChange={(event) => setProviderName(event.target.value)}
                  placeholder="Praxis- oder Betriebsname"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  required
                />
                <input
                  value={providerContact}
                  onChange={(event) => setProviderContact(event.target.value)}
                  placeholder="E-Mail oder Telefonnummer"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                  required
                />
                <select
                  value={providerType}
                  onChange={(event) => setProviderType(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                >
                  <option>Arztpraxis</option>
                  <option>Handwerksbetrieb</option>
                  <option>Sonstiges</option>
                </select>
                <textarea
                  value={providerMessage}
                  onChange={(event) => setProviderMessage(event.target.value)}
                  placeholder="Kurze Nachricht (optional)"
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                />
                <button className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
                  Anfrage senden
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {waitlistModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Warteliste beitreten</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {waitlistCategory}: Wir informieren dich sofort, sobald dieser Bereich verfuegbar ist.
                </p>
              </div>
              <button
                onClick={() => setWaitlistModalOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100"
                aria-label="Modal schliessen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {waitlistSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="font-semibold">Danke! Du stehst jetzt auf der Warteliste fuer {waitlistCategory}.</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">E-Mail oder WhatsApp-Nummer</span>
                  <input
                    required
                    value={waitlistContact}
                    onChange={(event) => setWaitlistContact(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                    placeholder="name@email.at oder +43..."
                  />
                </label>
                {waitlistError ? <p className="text-sm font-medium text-rose-700">{waitlistError}</p> : null}
                <button className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
                  Warteliste beitreten
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
