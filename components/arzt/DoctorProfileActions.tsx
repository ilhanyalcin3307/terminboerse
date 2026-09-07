"use client";

import { CalendarCheck, Globe, Mail, PhoneCall, Route } from "lucide-react";

type DoctorProfileActionsProps = {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  phone?: string;
  email?: string;
  website?: string;
  bookingUrl?: string;
  mapsUrl: string;
};

function pushDoctorEvent(eventName: "phone_click" | "website_click" | "route_click" | "booking_click", doctorId: string, doctorName: string, doctorSpecialty: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    doctor_id: doctorId,
    doctor_name: doctorName,
    fachbereich: doctorSpecialty,
  });
}

export function DoctorProfileActions({
  doctorId,
  doctorName,
  doctorSpecialty,
  phone,
  email,
  website,
  bookingUrl,
  mapsUrl,
}: DoctorProfileActionsProps) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {bookingUrl ? (
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pushDoctorEvent("booking_click", doctorId, doctorName, doctorSpecialty)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <CalendarCheck className="h-4 w-4" />
          Online-Termin buchen
        </a>
      ) : null}
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^+\d]/g, "")}`}
          onClick={() => pushDoctorEvent("phone_click", doctorId, doctorName, doctorSpecialty)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <PhoneCall className="h-4 w-4" />
          Telefon
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Mail className="h-4 w-4" />
          E-Mail
        </a>
      ) : null}
      {website ? (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pushDoctorEvent("website_click", doctorId, doctorName, doctorSpecialty)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Globe className="h-4 w-4" />
          Website
        </a>
      ) : null}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => pushDoctorEvent("route_click", doctorId, doctorName, doctorSpecialty)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Route className="h-4 w-4" />
        Route planen
      </a>
    </div>
  );
}
