"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Clock3, LogIn } from "lucide-react";
import { TerminboerseLogo } from "@/components/branding/TerminboerseLogo";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@supabase/supabase-js";

type SiteShellProps = {
  children: ReactNode;
};

type HeaderAuthState = {
  kind: "guest" | "user" | "doctor";
  displayName: string;
  profileHref: string;
};

const ARZTBEREICH_STORAGE_KEY = "terminboerse_arztbereich_auth_v2";

function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey);
}

function getDisplayNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  if (!localPart) {
    return "Profil";
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function SiteShell({ children }: SiteShellProps) {
  const [viennaDateTime, setViennaDateTime] = useState("");
  const [authState, setAuthState] = useState<HeaderAuthState>({
    kind: "guest",
    displayName: "Login",
    profileHref: "/login",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("de-AT", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/Vienna",
    });

    const updateClock = () => {
      setViennaDateTime(formatter.format(new Date()));
    };

    updateClock();
    const intervalId = window.setInterval(updateClock, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateHeaderAuth() {
      if (typeof window === "undefined") {
        return;
      }

      try {
        const rawArztToken = localStorage.getItem(ARZTBEREICH_STORAGE_KEY);
        if (rawArztToken) {
          const parsed = JSON.parse(rawArztToken) as { token?: string };
          if (typeof parsed?.token === "string" && parsed.token.trim() !== "") {
            const response = await fetch("/api/arztbereich/my-doctors", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token: parsed.token }),
            });

            const payload = (await response.json()) as {
              ok?: boolean;
              session?: { email?: string; role?: "admin" | "doctor" };
            };
            if (!cancelled && response.ok && payload.ok && payload.session?.email) {
              const email = payload.session.email;
              setAuthState({
                kind: "doctor",
                displayName: getDisplayNameFromEmail(email),
                profileHref: payload.session.role === "admin" ? "/arztbereich-admin" : "/arztbereich",
              });
              return;
            }
          }
        }
      } catch {
        // Fall through to user auth lookup.
      }

      if (!supabaseClient) {
        return;
      }

      try {
        const { data } = await supabaseClient.auth.getUser();
        const email = data.user?.email ?? "";
        if (!cancelled && email) {
          const metaName =
            typeof data.user?.user_metadata?.full_name === "string"
              ? data.user.user_metadata.full_name
              : typeof data.user?.user_metadata?.name === "string"
                ? data.user.user_metadata.name
                : "";

          setAuthState({
            kind: "user",
            displayName: metaName.trim() || getDisplayNameFromEmail(email),
            profileHref: "/profil",
          });
        }
      } catch {
        // Keep guest state.
      }
    }

    void hydrateHeaderAuth();

    return () => {
      cancelled = true;
    };
  }, [supabaseClient]);

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setAuthState({ kind: "guest", displayName: "Login", profileHref: "/login" });
        return;
      }

      const email = session?.user?.email;
      if (!email) {
        return;
      }

      const metaName =
        typeof session.user.user_metadata?.full_name === "string"
          ? session.user.user_metadata.full_name
          : typeof session.user.user_metadata?.name === "string"
            ? session.user.user_metadata.name
            : "";

      setAuthState({
        kind: "user",
        displayName: metaName.trim() || getDisplayNameFromEmail(email),
        profileHref: "/profil",
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }

      if (menuRef.current.contains(event.target as Node)) {
        return;
      }

      setMenuOpen(false);
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);

    if (typeof window !== "undefined") {
      localStorage.removeItem(ARZTBEREICH_STORAGE_KEY);
    }

    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch {
        // no-op
      }
    }

    setAuthState({ kind: "guest", displayName: "Login", profileHref: "/login" });
    window.location.href = "/";
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.35),transparent_38%),radial-gradient(circle_at_85%_0%,rgba(2,132,199,0.28),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_56%,#f8fafc_100%)]" />

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Zur Startseite">
            <TerminboerseLogo />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 md:inline-flex">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{viennaDateTime || "Wien lädt..."}</span>
            </div>

            {authState.kind === "guest" ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:text-sm"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:text-sm"
                >
                  <span>{authState.displayName}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    <Link
                      href={authState.profileHref}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Profil
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                    >
                      Abmelden
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white/90">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-4">
            <Link href="/impressum" className="hover:text-sky-700">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-sky-700">Datenschutz</Link>
            <Link href="/kontakt" className="hover:text-sky-700">Kontakt</Link>
            <Link href="/arzt" className="hover:text-sky-700">Arzttermine Wien</Link>
            <Link href="/#apotheken-wien" className="hover:text-sky-700">Apotheken Wien</Link>
            <Link href="/arztbereich" className="hover:text-sky-700">Arztbereich</Link>
          </div>
          <p>© 2026 Terminbörse.at - Made with ❤️ in Wien.</p>
        </div>
      </footer>

    </div>
  );
}