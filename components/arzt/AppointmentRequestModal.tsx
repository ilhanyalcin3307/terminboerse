"use client";

import { useState } from "react";
import { CalendarClock, Mail, PhoneCall, Send, UserRound, X } from "lucide-react";
import { prependLocalStorageItem, trackEvent } from "@/lib/analytics";
import type { DoctorRecord } from "@/lib/doctors";

type AppointmentRequestModalProps = {
  doctor: DoctorRecord;
  source: "arzt-card" | "arzt-detail";
  triggerLabel?: string;
  triggerClassName?: string;
};

export function AppointmentRequestModal({
  doctor,
  source,
  triggerLabel = "Termin anfragen",
  triggerClassName,
}: AppointmentRequestModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [note, setNote] = useState("");

  function openModal() {
    setIsOpen(true);
    setIsSuccess(false);
    setError("");
    trackEvent("cta_clicked", {
      source,
      doctor_id: doctor.id,
      category: doctor.specialty,
      district: doctor.district,
      action: "appointment_request_open",
    });
    trackEvent("modal_opened", {
      source,
      doctor_id: doctor.id,
      category: doctor.specialty,
      district: doctor.district,
      modal: "appointment_request",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = {
      doctorId: doctor.id,
      source,
      patientName: patientName.trim(),
      patientEmail: patientEmail.trim(),
      patientPhone: patientPhone.trim(),
      note: note.trim(),
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Lead request failed");
      }

      prependLocalStorageItem("terminboerse_patient_requests", {
        id: crypto.randomUUID(),
        ...payload,
        createdAt: new Date().toISOString(),
      });

      trackEvent("lead_submitted", {
        source,
        category: doctor.specialty,
        district: doctor.district,
        doctor_id: doctor.id,
        channel: "appointment_request",
      });

      setIsSuccess(true);
      setPatientName("");
      setPatientEmail("");
      setPatientPhone("");
      setNote("");
    } catch (submitError) {
      console.error("Termin-Anfrage konnte nicht gesendet werden", submitError);
      setError("Die Anfrage konnte gerade nicht gesendet werden. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className={
          triggerClassName ??
          "inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
        }
      >
        <CalendarClock className="h-4 w-4" />
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Termin anfragen bei {doctor.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Sende eine konkrete Anfrage. Wir leiten sie an die Ordination oder an unser Team weiter.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-100"
                aria-label="Modal schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="font-semibold">Vielen Dank! Deine Termin-Anfrage wurde erfolgreich übermittelt.</p>
                <p className="mt-2 text-sm">Wir melden uns, sobald eine Rückmeldung zur Verfügbarkeit vorliegt.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Name</span>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
                    <UserRound className="h-4 w-4 text-sky-600" />
                    <input
                      required
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      className="w-full outline-none"
                      placeholder="Vor- und Nachname"
                    />
                  </div>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">E-Mail</span>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
                      <Mail className="h-4 w-4 text-sky-600" />
                      <input
                        required
                        type="email"
                        value={patientEmail}
                        onChange={(event) => setPatientEmail(event.target.value)}
                        className="w-full outline-none"
                        placeholder="name@email.at"
                      />
                    </div>
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Telefon</span>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
                      <PhoneCall className="h-4 w-4 text-sky-600" />
                      <input
                        required
                        value={patientPhone}
                        onChange={(event) => setPatientPhone(event.target.value)}
                        className="w-full outline-none"
                        placeholder="+43 ..."
                      />
                    </div>
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Notiz</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
                    placeholder="Beschreibe kurz dein Anliegen oder bevorzugte Zeiten"
                  />
                </label>

                {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}

                <button
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Wird gesendet..." : "Anfrage absenden"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}