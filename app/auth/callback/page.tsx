"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Anmeldung wird bestätigt...");
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    async function resolveAuthCallback() {
      if (!supabaseClient) {
        window.location.replace("/login?verified=0&reason=config");
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const error = url.searchParams.get("error");

        if (error) {
          window.location.replace("/login?verified=0&reason=oauth");
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
          window.location.replace("/login?verified=1");
          return;
        }

        if (tokenHash && type) {
          const { error: verifyError } = await supabaseClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "recovery" | "invite" | "magiclink" | "email_change" | "email",
          });
          if (verifyError) {
            throw verifyError;
          }
          window.location.replace("/login?verified=1");
          return;
        }

        const { data } = await supabaseClient.auth.getSession();
        if (data.session) {
          window.location.replace("/login?verified=1");
          return;
        }

        window.location.replace("/login?verified=0&reason=missing");
      } catch {
        setMessage("Bestätigung fehlgeschlagen. Du wirst zum Login weitergeleitet...");
        window.location.replace("/login?verified=0&reason=failed");
      }
    }

    void resolveAuthCallback();
  }, [supabaseClient]);

  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">E-Mail-Bestätigung</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </section>
    </main>
  );
}
