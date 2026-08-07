"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Wrench, X } from "lucide-react";
import { TerminboerseLogo } from "@/components/branding/TerminboerseLogo";
import { trackEvent } from "@/lib/analytics";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerContact, setProviderContact] = useState("");
  const [providerType, setProviderType] = useState("Arztpraxis");
  const [providerMessage, setProviderMessage] = useState("");
  const [providerSuccess, setProviderSuccess] = useState(false);

  function openProviderModal() {
    setProviderModalOpen(true);
    setProviderSuccess(false);
    trackEvent("cta_clicked", { source: "navbar-provider", category: "provider", district: "all" });
    trackEvent("modal_opened", { source: "navbar-provider", modal: "provider" });
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

      {children}

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
    </div>
  );
}