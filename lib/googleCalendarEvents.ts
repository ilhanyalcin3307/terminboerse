import { getGoogleCalendarConnection, upsertGoogleCalendarConnection } from "@/lib/googleCalendarConnectionStore";
import { refreshGoogleAccessToken } from "@/lib/googleCalendarOAuth";

const DEFAULT_TIMEZONE = "Europe/Vienna";

type CalendarSyncAppointment = {
  id: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  type: string;
  status: "confirmed" | "pending" | "blocked";
  note?: string;
  googleEventId?: string;
};

type GoogleApiErrorPayload = {
  error?: {
    message?: string;
    status?: string;
  };
};

function buildSummary(appointment: CalendarSyncAppointment) {
  if (appointment.status === "blocked") {
    return `Blockzeit: ${appointment.type || "Praxisblock"}`;
  }
  return `${appointment.type || "Termin"}: ${appointment.patientName}`;
}

function buildDescription(appointment: CalendarSyncAppointment) {
  const notes: string[] = [];
  if (appointment.note?.trim()) {
    notes.push(appointment.note.trim());
  }
  notes.push(`Terminboerse ID: ${appointment.id}`);
  return notes.join("\n");
}

async function resolveDoctorCalendarAccess(doctorId: string) {
  const connection = await getGoogleCalendarConnection(doctorId);
  if (!connection) {
    throw new Error("Google Calendar ist für dieses Profil nicht verbunden.");
  }

  const hasValidCachedToken =
    typeof connection.accessToken === "string" &&
    typeof connection.accessTokenExpiresAt === "number" &&
    connection.accessTokenExpiresAt > Date.now() + 60 * 1000;

  if (hasValidCachedToken) {
    return {
      calendarId: connection.calendarId,
      accessToken: connection.accessToken as string,
    };
  }

  if (!connection.refreshToken) {
    throw new Error("Google Verbindung hat keinen Refresh-Token. Bitte Kalender erneut verbinden.");
  }

  const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
  const refreshedAccessToken = refreshed.access_token;
  const refreshedExpiresAt = Date.now() + refreshed.expires_in * 1000;

  await upsertGoogleCalendarConnection(doctorId, {
    calendarId: connection.calendarId,
    googleEmail: connection.googleEmail,
    refreshToken: connection.refreshToken,
    accessToken: refreshedAccessToken,
    accessTokenExpiresAt: refreshedExpiresAt,
    scope: refreshed.scope ?? connection.scope,
  });

  return {
    calendarId: connection.calendarId,
    accessToken: refreshedAccessToken,
  };
}

async function parseGoogleApiError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as GoogleApiErrorPayload;
  const message = payload.error?.message ?? `Google Calendar API Fehler (${response.status})`;

  if (response.status === 403) {
    return `${message}. Bitte Google Kalender erneut verbinden (Schreibrechte).`;
  }

  return message;
}

export async function createGoogleCalendarEvent(doctorId: string, appointment: CalendarSyncAppointment) {
  const { calendarId, accessToken } = await resolveDoctorCalendarAccess(doctorId);

  const body = {
    summary: buildSummary(appointment),
    description: buildDescription(appointment),
    start: {
      dateTime: appointment.startsAt,
      timeZone: DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: appointment.endsAt,
      timeZone: DEFAULT_TIMEZONE,
    },
    extendedProperties: {
      private: {
        terminboerseAppointmentId: appointment.id,
      },
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await parseGoogleApiError(response));
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("Google Event-ID fehlt nach dem Erstellen.");
  }

  return payload.id;
}

export async function updateGoogleCalendarEvent(doctorId: string, appointment: CalendarSyncAppointment) {
  if (!appointment.googleEventId) {
    throw new Error("Google Event-ID fehlt für Update.");
  }

  const { calendarId, accessToken } = await resolveDoctorCalendarAccess(doctorId);

  const body = {
    summary: buildSummary(appointment),
    description: buildDescription(appointment),
    start: {
      dateTime: appointment.startsAt,
      timeZone: DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: appointment.endsAt,
      timeZone: DEFAULT_TIMEZONE,
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
      appointment.googleEventId,
    )}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await parseGoogleApiError(response));
  }
}

export async function deleteGoogleCalendarEvent(doctorId: string, googleEventId: string) {
  const eventId = googleEventId.trim();
  if (!eventId) {
    return;
  }

  const { calendarId, accessToken } = await resolveDoctorCalendarAccess(doctorId);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(await parseGoogleApiError(response));
  }
}
