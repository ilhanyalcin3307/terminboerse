"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArztDashboardLite as ArztDashboard } from "@/components/arztbereich/ArztDashboardLite";

type ArztbereichSession = {
  email: string;
  role: "admin" | "doctor";
  expiresAt: number;
};

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

const SESSION_STORAGE_KEY = "terminboerse_arztbereich_auth_v2";

export function AdminDashboardGate() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [session, setSession] = useState<ArztbereichSession | null>(null);

  useEffect(() => {
    async function bootstrapAdminSession() {
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) {
          setErrorMessage("Keine aktive Admin-Sitzung gefunden.");
          return;
        }

        const parsed = JSON.parse(raw) as { token?: string };
        const token = typeof parsed?.token === "string" ? parsed.token.trim() : "";
        if (!token) {
          setErrorMessage("Admin-Sitzung ist ungültig.");
          return;
        }

        const response = await fetch("/api/arztbereich/my-doctors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          session?: ArztbereichSession;
          doctors?: ArztDashboardDoctor[];
        };

        if (!response.ok || !payload.ok || !payload.session) {
          throw new Error(payload.error ?? "Admin-Sitzung konnte nicht geladen werden.");
        }

        if (payload.session.role !== "admin") {
          setErrorMessage("Diese Seite ist nur für Admin-Zugänge verfügbar.");
          return;
        }

        setSessionToken(token);
        setSession(payload.session);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Admin-Sitzung konnte nicht geladen werden.");
      } finally {
        setIsLoading(false);
      }
    }

    void bootstrapAdminSession();
  }, []);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-4xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm md:p-8">
          Admin-Dashboard wird geladen...
        </section>
      </main>
    );
  }

  if (!session || !sessionToken) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-4xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm md:p-8">
          <p className="font-semibold">{errorMessage || "Nicht autorisiert."}</p>
          <Link
            href="/arztbereich"
            className="mt-4 inline-flex rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
          >
            Zurück zum Arztbereich-Login
          </Link>
        </section>
      </main>
    );
  }

  return <ArztDashboard doctors={[]} role="admin" authToken={sessionToken} />;
}
