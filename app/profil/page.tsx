"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type ProfileState = {
  email: string;
  name: string;
};

function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey);
}

function deriveName(email: string) {
  const local = email.split("@")[0] ?? "";
  if (!local) {
    return "Profil";
  }

  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ProfilPage() {
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!supabaseClient) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabaseClient.auth.getUser();
        const user = data.user;
        const email = user?.email ?? "";

        if (!user || !email) {
          return;
        }

        if (!cancelled) {
          const nameFromMeta =
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : typeof user.user_metadata?.name === "string"
                ? user.user_metadata.name
                : "";

          setProfile({
            email,
            name: nameFromMeta.trim() || deriveName(email),
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [supabaseClient]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Profil wird geladen...</section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Kein aktiver Login</h1>
          <p className="mt-2 text-sm text-slate-600">Bitte melde dich zuerst an.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Zum Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Profil</h1>
        <p className="mt-4 text-sm text-slate-700">
          Name: <span className="font-semibold">{profile.name}</span>
        </p>
        <p className="mt-1 text-sm text-slate-700">
          E-Mail: <span className="font-semibold">{profile.email}</span>
        </p>
      </section>
    </main>
  );
}
