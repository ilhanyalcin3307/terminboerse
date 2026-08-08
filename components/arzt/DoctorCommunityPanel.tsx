"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, MessageSquareText, Star } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type DoctorComment = {
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
  lastComments: DoctorComment[];
  canRate: boolean;
};

type DoctorCommunityPanelProps = {
  doctorId: string;
  doctorName: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unbekannt";
  }
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-AT").format(value);
}

export function DoctorCommunityPanel({ doctorId, doctorName }: DoctorCommunityPanelProps) {
  const [snapshot, setSnapshot] = useState<DoctorCommunitySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCommunityData() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/doctor-community/${encodeURIComponent(doctorId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "view" }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Community API failed: ${response.status}`);
        }

        const payload = (await response.json()) as { snapshot?: DoctorCommunitySnapshot };
        if (!payload.snapshot) {
          throw new Error("Missing snapshot in response");
        }

        setSnapshot(payload.snapshot);
        trackEvent("cta_clicked", {
          source: "arzt-detail-community",
          action: "community_panel_view",
          doctor_id: doctorId,
        });
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }
        console.error("Community-Daten konnten nicht geladen werden", loadError);
        setError("Bewertungsdaten sind gerade nicht verfügbar.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCommunityData();

    return () => {
      controller.abort();
    };
  }, [doctorId]);

  const activeStars = useMemo(() => {
    if (!snapshot) {
      return 0;
    }
    return Math.round(snapshot.averageRating);
  }, [snapshot]);

  return (
    <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">Bewertungen & Erfahrungen</h3>
      <p className="mt-2 text-sm text-slate-700">Transparente Signale aus der Community rund um dieses Arztprofil.</p>

      {isLoading ? <p className="mt-4 text-sm text-slate-600">Bewertungen werden geladen...</p> : null}
      {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}

      {snapshot ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-amber-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ø Bewertung</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{snapshot.averageRating.toFixed(1)} / 5</p>
              <div className="mt-1 flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className={`h-4 w-4 ${index < activeStars ? "fill-current" : "opacity-40"}`} />
                ))}
              </div>
            </article>
            <article className="rounded-xl border border-amber-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bewertungen</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatNumber(snapshot.ratingsCount)}</p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profilaufrufe</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xl font-bold text-slate-900">
                <Eye className="h-4 w-4 text-amber-600" />
                {formatNumber(snapshot.viewsCount)}
              </p>
            </article>
          </div>

          <div className="mt-5 space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MessageSquareText className="h-4 w-4 text-amber-600" />
              Letzte 3 Kommentare
            </p>
            {snapshot.lastComments.map((comment) => (
              <article key={comment.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <p className="text-sm text-slate-700">{comment.message}</p>
                <p className="mt-2 text-xs text-slate-500">{comment.author} • {formatDate(comment.createdAt)}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">{doctorName} bewerten oder kommentieren</p>
            <p className="mt-1 text-sm text-slate-600">Diese Funktion wird nach Login per E-Mail freigeschaltet.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={!snapshot.canRate}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                Bewertung abgeben
              </button>
              <button
                disabled={!snapshot.canRate}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Kommentar schreiben
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}