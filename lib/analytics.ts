export type TrackEventName =
  | "cta_clicked"
  | "modal_opened"
  | "lead_submitted"
  | "specialty_selected"
  | "district_selected"
  | "doctor_action_clicked";

export type TrackPayload = Record<string, string | number | boolean | undefined>;

type StoredEvent = {
  id: string;
  eventName: TrackEventName;
  payload: TrackPayload;
  createdAt: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function prependLocalStorageItem(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  const previous = readLocalStorageArray<unknown>(key);
  localStorage.setItem(key, JSON.stringify([value, ...previous]));
}

export function readLocalStorageArray<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function trackEvent(eventName: TrackEventName, payload: TrackPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const event: StoredEvent = {
    id: crypto.randomUUID(),
    eventName,
    payload,
    createdAt: new Date().toISOString(),
  };

  prependLocalStorageItem("terminboerse_events", event);

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
  }

  console.log("[tracking]", eventName, payload);
}