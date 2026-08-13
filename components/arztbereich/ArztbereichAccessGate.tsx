"use client";

import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, LogOut, MailCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { ArztDashboardLite as ArztDashboard } from "@/components/arztbereich/ArztDashboardLite";

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

type ArztbereichAccessGateProps = {
  doctors: ArztDashboardDoctor[];
};

type ArztbereichSession = {
  email: string;
  role: "admin" | "doctor";
  expiresAt: number;
};

type StoredAuth = {
  token: string;
};

const SESSION_STORAGE_KEY = "terminboerse_arztbereich_auth_v2";

function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function readStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed || typeof parsed.token !== "string" || parsed.token.trim() === "") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveAuth(auth: StoredAuth) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(auth));
}

function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function ArztbereichAccessGate({ doctors }: ArztbereichAccessGateProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registrationType, setRegistrationType] = useState<"existing" | "new">("existing");
  const [registrationSearchTerm, setRegistrationSearchTerm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [providerType, setProviderType] = useState<"OEGK" | "Wahlarzt" | "Privat">("OEGK");
  const [note, setNote] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [session, setSession] = useState<ArztbereichSession | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [managedDoctors, setManagedDoctors] = useState<ArztDashboardDoctor[]>([]);
  const [registrationSearchResultsRemote, setRegistrationSearchResultsRemote] = useState<ArztDashboardDoctor[]>([]);
  const [isSearchingRegistrationDoctors, setIsSearchingRegistrationDoctors] = useState(false);
  const [registrationSearchError, setRegistrationSearchError] = useState("");
  const [oauthUserId, setOauthUserId] = useState("");
  const [isOAuthBusy, setIsOAuthBusy] = useState(false);

  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);

  const registrationSelectableDoctors = useMemo(() => {
    const map = new Map<string, ArztDashboardDoctor>();
    for (const doctor of doctors) {
      map.set(doctor.id, doctor);
    }
    for (const doctor of registrationSearchResultsRemote) {
      map.set(doctor.id, doctor);
    }
    return Array.from(map.values());
  }, [doctors, registrationSearchResultsRemote]);

  const selectedRegistrationDoctor = useMemo(
    () => registrationSelectableDoctors.find((doctor) => doctor.id === selectedDoctorId) ?? null,
    [registrationSelectableDoctors, selectedDoctorId],
  );

  const normalizedRegistrationTerm = registrationSearchTerm.trim().toLowerCase();
  const isRegistrationSearchReady = normalizedRegistrationTerm.length >= 3;

  const registrationSearchResults = useMemo(() => {
    if (!isRegistrationSearchReady) {
      return [];
    }

    if (doctors.length === 0) {
      return registrationSearchResultsRemote;
    }

    const matches = doctors.filter((doctor) => {
      const searchable = `${doctor.name} ${doctor.specialty} ${doctor.district} ${doctor.address}`.toLowerCase();
      return searchable.includes(normalizedRegistrationTerm);
    });

    return matches
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(normalizedRegistrationTerm) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(normalizedRegistrationTerm) ? 0 : 1;
        if (aStarts !== bStarts) {
          return aStarts - bStarts;
        }
        return a.name.localeCompare(b.name, "de");
      })
      .slice(0, 25);
  }, [doctors, isRegistrationSearchReady, normalizedRegistrationTerm, registrationSearchResultsRemote]);

  useEffect(() => {
    async function runRegistrationSearch() {
      if (registrationType !== "existing") {
        setRegistrationSearchResultsRemote([]);
        setRegistrationSearchError("");
        return;
      }

      if (doctors.length > 0) {
        return;
      }

      if (!isRegistrationSearchReady) {
        setRegistrationSearchResultsRemote([]);
        setRegistrationSearchError("");
        return;
      }

      setIsSearchingRegistrationDoctors(true);
      setRegistrationSearchError("");

      try {
        const response = await fetch("/api/arztbereich/search-doctors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: registrationSearchTerm,
            token: sessionToken || undefined,
            limit: 25,
          }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          doctors?: ArztDashboardDoctor[];
        };

        if (!response.ok || !payload.ok || !Array.isArray(payload.doctors)) {
          throw new Error(payload.error ?? "Suche fehlgeschlagen.");
        }

        setRegistrationSearchResultsRemote(payload.doctors);
      } catch (error) {
        setRegistrationSearchError(error instanceof Error ? error.message : "Suche fehlgeschlagen.");
        setRegistrationSearchResultsRemote([]);
      } finally {
        setIsSearchingRegistrationDoctors(false);
      }
    }

    void runRegistrationSearch();
  }, [registrationType, doctors.length, isRegistrationSearchReady, registrationSearchTerm, sessionToken]);

  useEffect(() => {
    async function bootstrapSession() {
      try {
        const stored = readStoredAuth();
        if (!stored) {
          setIsLoadingSession(false);
          return;
        }

        const ok = await hydrateSessionFromToken(stored.token);
        if (!ok) {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setIsLoadingSession(false);
      }
    }

    bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRegistrationDoctor) {
      return;
    }
    if (registrationSearchTerm.trim() !== "") {
      return;
    }
    setRegistrationSearchTerm(selectedRegistrationDoctor.name);
  }, [selectedRegistrationDoctor, registrationSearchTerm]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const modeFromQuery = params.get("mode");
    const emailFromQuery = params.get("email");
    const doctorIdFromQuery = params.get("doctorId");
    const oauthFlow = params.get("oauth");

    if (modeFromQuery === "register") {
      setMode("register");
    }
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
    if (doctorIdFromQuery) {
      setRegistrationType("existing");
      setSelectedDoctorId(doctorIdFromQuery);
    }

    async function resumeOAuthDoctorFlow() {
      if (oauthFlow !== "doctor" || !supabaseClient) {
        return;
      }

      setIsOAuthBusy(true);
      setErrorMessage("");
      setInfoMessage("");

      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error || !data.session?.access_token || !data.session.user?.id || !data.session.user.email) {
          throw new Error("OAuth Sitzung konnte nicht geladen werden.");
        }

        setEmail(data.session.user.email);
        setOauthUserId(data.session.user.id);

        const response = await fetch("/api/arztbereich/login-oauth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accessToken: data.session.access_token }),
        });

        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          token?: string;
          session?: ArztbereichSession;
        };

        if (response.ok && payload.ok && payload.token && payload.session) {
          const hydrateOk = await hydrateSessionFromToken(payload.token);
          if (!hydrateOk) {
            throw new Error("Sitzung konnte nicht geladen werden.");
          }
          saveAuth({ token: payload.token });
          setInfoMessage("");
          return;
        }

        setMode("register");
        setInfoMessage(
          payload.error === "Konto ist nicht freigeschaltet."
            ? "OAuth erkannt. Bitte Freischaltung absenden, damit dein Konto aktiviert werden kann."
            : payload.error ?? "OAuth erkannt. Bitte Registrierungsdaten vervollständigen.",
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "OAuth konnte nicht fortgesetzt werden.");
      } finally {
        setIsOAuthBusy(false);
      }
    }

    void resumeOAuthDoctorFlow();
  }, []);

  const allowedDoctors = useMemo(() => managedDoctors, [managedDoctors]);

  async function hydrateSessionFromToken(token: string) {
    try {
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

      if (!response.ok || !payload.ok || !payload.session || !Array.isArray(payload.doctors)) {
        return false;
      }

      setSession(payload.session);
      setSessionToken(token);
      setEmail(payload.session.email);
      setManagedDoctors(payload.doctors);
      return true;
    } catch {
      return false;
    }
  }

  async function login() {
    setIsSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const response = await fetch("/api/arztbereich/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        token?: string;
        session?: ArztbereichSession;
      };

      if (!response.ok || !payload.ok || !payload.session || !payload.token) {
        throw new Error(payload.error ?? "Login fehlgeschlagen.");
      }

      const hydrateOk = await hydrateSessionFromToken(payload.token);
      if (!hydrateOk) {
        throw new Error("Sitzung konnte nicht geladen werden.");
      }

      saveAuth({ token: payload.token });
      setPassword("");
      setInfoMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function registerRequest() {
    setIsSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    const hasOAuthIdentity = oauthUserId.trim() !== "";

    if (!hasOAuthIdentity && password.length < 8) {
      setErrorMessage("Passwort muss mindestens 8 Zeichen haben.");
      setIsSubmitting(false);
      return;
    }

    if (!hasOAuthIdentity && password !== passwordRepeat) {
      setErrorMessage("Passwörter stimmen nicht überein.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/arztbereich/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationType,
          selectedDoctorId,
          doctorName,
          doctorEmail: email,
          doctorPhone,
          specialty,
          clinicAddress,
          district,
          providerType,
          note,
          password,
          authUserId: hasOAuthIdentity ? oauthUserId : undefined,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Registrierung fehlgeschlagen.");
      }

      setInfoMessage("Anfrage gesendet. Nach deiner Admin-Freigabe kann der Arzt sich einloggen.");
      setDoctorName("");
      setDoctorPhone("");
      setSpecialty("");
      setClinicAddress("");
      setDistrict("");
      setProviderType("OEGK");
      setNote("");
      setPassword("");
      setPasswordRepeat("");
      setOauthUserId("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Registrierung fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startDoctorOAuth(provider: "google") {
    if (!supabaseClient) {
      setErrorMessage("Supabase ist nicht konfiguriert.");
      return;
    }

    setErrorMessage("");
    setInfoMessage("");

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/arztbereich?oauth=doctor`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session?.role !== "admin") {
      return;
    }

    if (window.location.pathname === "/arztbereich-admin") {
      return;
    }

    window.location.replace("/arztbereich-admin");
  }, [session?.role]);

  if (isLoadingSession) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-4xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm md:p-8">
          Sitzung wird geladen...
        </section>
      </main>
    );
  }

  if (session) {
    if (session.role === "admin") {
      return (
        <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <section className="rounded-4xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm md:p-8">
            Admin-Sitzung erkannt. Weiterleitung zum Admin-Dashboard...
          </section>
        </main>
      );
    }

    return (
      <>
        <div className="mx-auto mt-6 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Angemeldet als {session.email}
          </p>
          <button
            type="button"
            onClick={() => {
              clearAuth();
              setSession(null);
              setSessionToken("");
              setManagedDoctors([]);
              setPassword("");
              setInfoMessage("");
              setErrorMessage("");
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>

        <ArztDashboard doctors={allowedDoctors} role={session.role} authToken={sessionToken} />
      </>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Arztbereich Zugang
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Arztbereich Login und Registrierung</h1>
        <p className="mt-2 text-sm text-slate-600">Login für Admin und freigeschaltete Ärzte. Neue Ärzte können eine Freischaltung anfragen.</p>

        {isOAuthBusy ? (
          <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
            OAuth Sitzung wird verarbeitet...
          </p>
        ) : null}

        <div className="mt-5 inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage("");
              setInfoMessage("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Einloggen
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMessage("");
              setInfoMessage("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Registrierung
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">E-Mail</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
              <MailCheck className="h-4 w-4 text-sky-700" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="kontakt@terminboerse.at"
                className="w-full outline-none"
              />
            </div>
          </label>

          {mode === "login" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Passwort</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
                <LockKeyhole className="h-4 w-4 text-sky-700" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Passwort"
                  className="w-full outline-none"
                />
              </div>
            </label>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Profiltyp</p>
                <div className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setRegistrationType("existing")}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                      registrationType === "existing" ? "bg-slate-900 text-white" : "text-slate-700"
                    }`}
                  >
                    Bestehendes Profil wählen
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegistrationType("new")}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                      registrationType === "new" ? "bg-slate-900 text-white" : "text-slate-700"
                    }`}
                  >
                    Neues Profil beantragen
                  </button>
                </div>
              </div>

              {registrationType === "existing" ? (
                <div className="space-y-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Vorhandenes Profil suchen</span>
                    <input
                      value={registrationSearchTerm}
                      onChange={(event) => {
                        setRegistrationSearchTerm(event.target.value);
                        setSelectedDoctorId("");
                      }}
                      placeholder="Mindestens 3 Zeichen: Name, Fachbereich, Bezirk..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                    />
                  </label>

                  {registrationSearchTerm.trim().length > 0 && !isRegistrationSearchReady ? (
                    <p className="text-xs font-medium text-slate-500">Bitte mindestens 3 Zeichen eingeben.</p>
                  ) : null}

                  {isSearchingRegistrationDoctors ? <p className="text-xs font-medium text-slate-500">Suche läuft...</p> : null}
                  {registrationSearchError ? <p className="text-xs font-semibold text-rose-700">{registrationSearchError}</p> : null}

                  {isRegistrationSearchReady ? (
                    <div className="rounded-xl border border-slate-200 bg-white">
                      {registrationSearchResults.length > 0 ? (
                        <ul className="max-h-64 divide-y divide-slate-100 overflow-auto">
                          {registrationSearchResults.map((doctor) => (
                            <li key={doctor.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDoctorId(doctor.id);
                                  setRegistrationSearchTerm(doctor.name);
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
                        <p className="px-3 py-2 text-xs font-medium text-amber-700">Kein passendes Profil gefunden.</p>
                      )}
                    </div>
                  ) : null}

                  {selectedRegistrationDoctor ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800">
                      Ausgewählt: {selectedRegistrationDoctor.name} ({selectedRegistrationDoctor.specialty})
                    </p>
                  ) : null}
                </div>
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Telefon</span>
                <input
                  value={doctorPhone}
                  onChange={(event) => setDoctorPhone(event.target.value)}
                  placeholder="z.B. +43 ..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                />
              </label>

              {registrationType === "new" ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Name der Ärztin/des Arztes</span>
                    <input
                      value={doctorName}
                      onChange={(event) => setDoctorName(event.target.value)}
                      placeholder="z.B. Dr. Ahmet Kaya"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Fachbereich</span>
                    <input
                      value={specialty}
                      onChange={(event) => setSpecialty(event.target.value)}
                      placeholder="z.B. Allgemeinmedizin"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Bezirk</span>
                    <input
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                      placeholder="z.B. 10. Bezirk"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Versicherungsmodell</span>
                    <select
                      value={providerType}
                      onChange={(event) =>
                        setProviderType(event.target.value === "Wahlarzt" || event.target.value === "Privat" ? event.target.value : "OEGK")
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                    >
                      <option value="OEGK">OEGK</option>
                      <option value="Wahlarzt">Wahlarzt</option>
                      <option value="Privat">Privat</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Ordinationsadresse</span>
                    <input
                      value={clinicAddress}
                      onChange={(event) => setClinicAddress(event.target.value)}
                      placeholder="Straße, Bezirk"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                    />
                  </label>
                </>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Nachricht (optional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Zusätzliche Infos für die Freischaltung"
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                />
              </label>
              {oauthUserId ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  OAuth Konto erkannt. Für die Freischaltung ist kein Passwort mehr erforderlich.
                </p>
              ) : (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Passwort</span>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
                      <LockKeyhole className="h-4 w-4 text-sky-700" />
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Mindestens 8 Zeichen"
                        className="w-full outline-none"
                      />
                    </div>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Passwort wiederholen</span>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
                      <LockKeyhole className="h-4 w-4 text-sky-700" />
                      <input
                        type="password"
                        value={passwordRepeat}
                        onChange={(event) => setPasswordRepeat(event.target.value)}
                        placeholder="Passwort wiederholen"
                        className="w-full outline-none"
                      />
                    </div>
                  </label>
                </>
              )}
            </>
          )}
        </div>

        {infoMessage ? <p className="mt-3 text-sm font-medium text-emerald-700">{infoMessage}</p> : null}
        {errorMessage ? <p className="mt-3 text-sm font-medium text-rose-700">{errorMessage}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {mode === "login" ? (
            <button
              type="button"
              onClick={login}
              disabled={isSubmitting || email.trim() === "" || password.trim() === ""}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Wird geprüft..." : "Einloggen"}
            </button>
          ) : (
            <button
              type="button"
              onClick={registerRequest}
              disabled={
                isSubmitting ||
                email.trim() === "" ||
                (registrationType === "existing" && selectedDoctorId.trim() === "") ||
                (!oauthUserId && password.trim() === "") ||
                (!oauthUserId && passwordRepeat.trim() === "") ||
                doctorPhone.trim() === "" ||
                (registrationType === "new" && doctorName.trim() === "") ||
                (registrationType === "new" && specialty.trim() === "") ||
                (registrationType === "new" && clinicAddress.trim() === "") ||
                (registrationType === "new" && district.trim() === "")
              }
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Wird gesendet..." : "Freischaltung anfragen"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
