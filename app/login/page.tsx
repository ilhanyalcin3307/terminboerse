"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { LogIn, ShieldCheck, UserRound } from "lucide-react";

type AuthMode = "login" | "register";
const ARZTBEREICH_STORAGE_KEY = "terminboerse_arztbereich_auth_v2";

function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

export default function LoginPage() {
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    if (verified === "1") {
      setInfoMessage("E-Mail erfolgreich bestätigt. Du kannst dich jetzt einloggen.");
    }
    if (verified === "0") {
      setErrorMessage("E-Mail-Bestätigung konnte nicht abgeschlossen werden. Bitte versuche den Link erneut.");
    }
  }, []);

  async function submitEmailAuth() {
    if (!supabaseClient) {
      setErrorMessage("Supabase ist nicht konfiguriert.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        try {
          const arztResponse = await fetch("/api/arztbereich/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              password,
            }),
          });

          const arztPayload = (await arztResponse.json()) as {
            ok?: boolean;
            token?: string;
            session?: { role?: "admin" | "doctor" };
          };

          if (arztResponse.ok && arztPayload.ok && typeof arztPayload.token === "string" && arztPayload.session?.role) {
            localStorage.setItem(ARZTBEREICH_STORAGE_KEY, JSON.stringify({ token: arztPayload.token }));
            window.location.href = arztPayload.session.role === "admin" ? "/arztbereich-admin" : "/arztbereich";
            return;
          }
        } catch {
          // If Arztbereich login isn't available for this account, continue as regular user.
        }

        window.location.href = "/profil";
        return;
      }

      if (password.length < 8) {
        throw new Error("Passwort muss mindestens 8 Zeichen lang sein.");
      }

      if (password !== passwordRepeat) {
        throw new Error("Passwörter stimmen nicht überein.");
      }

      const { error } = await supabaseClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role_hint: "user",
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setInfoMessage("Registrierung erfolgreich. Bitte bestätige ggf. deine E-Mail und melde dich dann an.");
      setMode("login");
      setPassword("");
      setPasswordRepeat("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[1fr_1.15fr]">
        <aside className="relative hidden overflow-hidden border-r border-slate-200 bg-[linear-gradient(140deg,#f0f9ff_0%,#e0f2fe_45%,#f8fafc_100%)] p-8 lg:block">
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-sky-200/40 blur-2xl" />
          <div className="absolute -bottom-12 right-0 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />

          <p className="relative inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-semibold text-sky-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Sicheres Konto
          </p>
          <h2 className="relative mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Willkommen zurück</h2>
          <p className="relative mt-3 text-sm leading-6 text-slate-700">
            Verwalte dein Profil, verfolge deine Anfragen und melde dich in wenigen Sekunden an.
          </p>

          <div className="relative mt-8 space-y-3">
            <div className="rounded-2xl border border-sky-200 bg-white/80 p-3 text-sm text-slate-700">
              <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                <UserRound className="h-4 w-4 text-sky-700" />
                Ein Konto für alle Nutzer-Funktionen
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white/80 p-3 text-sm text-slate-700">
              <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                <UserRound className="h-4 w-4 text-sky-700" />
                Login mit E-Mail
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Für Ärztinnen und Ärzte in Wien</p>
              <p className="mt-2 font-semibold text-slate-900">Sie sind Ärztin oder Arzt und möchten Ihr Profil verwalten?</p>
              <p className="mt-2 leading-6 text-slate-700">
                Veröffentlichen Sie freie Termine der nächsten 3 Tage, erhöhen Sie Ihre Sichtbarkeit für
                Arzttermin Wien Suchen und verbinden Sie offene Zeitfenster direkt mit passenden Patientinnen und Patienten.
              </p>
              <Link
                href="/arztbereich"
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Zum Arztbereich
              </Link>
            </div>
          </div>
        </aside>

        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Login</h1>
          <p className="mt-2 text-sm text-slate-600">Melde dich an, um dein Profil und deine Anfragen zu verwalten.</p>

          <div className="mt-5 inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Einloggen
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Registrieren
          </button>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">E-Mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Passwort</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
              />
            </label>

            {mode === "register" ? (
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Passwort wiederholen</span>
                <input
                  type="password"
                  value={passwordRepeat}
                  onChange={(event) => setPasswordRepeat(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-sky-300 focus:ring"
                />
              </label>
            ) : null}

            {infoMessage ? <p className="text-sm font-medium text-emerald-700">{infoMessage}</p> : null}
            {errorMessage ? <p className="text-sm font-medium text-rose-700">{errorMessage}</p> : null}

            <button
              type="button"
              onClick={() => void submitEmailAuth()}
              disabled={isLoading || !email.trim() || !password.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(15,23,42,0.2)] transition hover:bg-slate-700 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {isLoading ? "Bitte warten..." : mode === "login" ? "Einloggen" : "Konto erstellen"}
            </button>

            <p className="pt-1 text-sm text-slate-600">
              {mode === "login" ? "Noch kein Konto? " : "Schon ein Konto? "}
              <button
                type="button"
                onClick={() => setMode((prev) => (prev === "login" ? "register" : "login"))}
                className="font-semibold text-sky-700 hover:underline"
              >
                {mode === "login" ? "Jetzt registrieren" : "Jetzt einloggen"}
              </button>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <p>
              Du bist Ärztin oder Arzt?{" "}
              <Link href="/arztbereich" className="font-semibold text-sky-700 hover:underline">
                Zum Arztbereich
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
