"use client";

import { useMemo, useState } from "react";
import { BarChart3, Database, Eye, Trash2, X } from "lucide-react";

type StoredEvent = {
  id: string;
  eventName: string;
  payload: Record<string, string>;
  createdAt: string;
};

type StoredLead = {
  id: string;
  source: string;
  category: string;
  district: string;
  contact?: string;
  createdAt: string;
};

function getJsonArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function DevAnalyticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const data = useMemo(() => {
    void version;
    if (typeof window === "undefined") {
      return { events: [] as StoredEvent[], leads: [] as StoredLead[], waitlist: [] as StoredLead[] };
    }

    return {
      events: getJsonArray<StoredEvent>("terminboerse_events"),
      leads: getJsonArray<StoredLead>("terminboerse_leads"),
      waitlist: getJsonArray<StoredLead>("terminboerse_waitlist"),
    };
  }, [version]);

  const eventStats = useMemo(() => {
    const counts = { cta_clicked: 0, modal_opened: 0, lead_submitted: 0 };
    for (const item of data.events) {
      if (item.eventName in counts) {
        counts[item.eventName as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [data.events]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      <button
        onClick={() => {
          setVersion((prev) => prev + 1);
          setIsOpen(true);
        }}
        className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl"
      >
        <BarChart3 className="h-4 w-4" />
        Dev Analytics
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/55 p-4">
          <div className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Dev Analytics Panel</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">cta_clicked</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{eventStats.cta_clicked}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">modal_opened</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{eventStats.modal_opened}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">lead_submitted</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{eventStats.lead_submitted}</p>
              </article>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p className="text-xs text-sky-700">Leads</p>
                <p className="text-lg font-bold text-sky-900">{data.leads.length}</p>
              </article>
              <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Warteliste</p>
                <p className="text-lg font-bold text-emerald-900">{data.waitlist.length}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Events gesamt</p>
                <p className="text-lg font-bold text-slate-900">{data.events.length}</p>
              </article>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setVersion((prev) => prev + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Eye className="h-3.5 w-3.5" />
                Aktualisieren
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("terminboerse_events");
                  localStorage.removeItem("terminboerse_leads");
                  localStorage.removeItem("terminboerse_waitlist");
                  setVersion((prev) => prev + 1);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Daten loeschen
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 p-3">
              <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                <Database className="h-4 w-4" />
                Letzte Events
              </p>
              <ul className="max-h-56 space-y-2 overflow-auto pr-1 text-xs text-slate-600">
                {data.events.slice(0, 12).map((event) => (
                  <li key={event.id} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <p className="font-semibold text-slate-800">{event.eventName}</p>
                    <p>{new Date(event.createdAt).toLocaleString("de-AT")}</p>
                    <p>Quelle: {event.payload.source ?? "-"}</p>
                    <p>Kategorie: {event.payload.category ?? "-"}</p>
                  </li>
                ))}
                {data.events.length === 0 ? <li>Noch keine Events vorhanden.</li> : null}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
