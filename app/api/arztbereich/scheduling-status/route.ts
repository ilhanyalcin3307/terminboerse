import { NextResponse } from "next/server";
import { getSchedulingStatusEntry } from "@/lib/arztbereichSchedulingStore";
import { getPublicDoctorSchedulingStatus } from "@/lib/doctorSchedulingStatus";
import { getGoogleCalendarConnection } from "@/lib/googleCalendarConnectionStore";
import { getDoctorAvailableSlots } from "@/lib/googleCalendarAvailability";
import { verifyArztbereichSessionToken } from "@/lib/arztbereichSession";

type SchedulingStatusBody = {
  token?: string;
  doctorId?: string;
  includeHealth?: boolean;
};

type AccessTokenState = "missing" | "valid" | "expired" | "unknown";

function resolveAccessTokenState(accessToken?: string, accessTokenExpiresAt?: number): AccessTokenState {
  if (!accessToken) {
    return "missing";
  }
  if (typeof accessTokenExpiresAt !== "number") {
    return "unknown";
  }
  return accessTokenExpiresAt > Date.now() ? "valid" : "expired";
}

function resolveDoctorId(session: { role: "admin" | "doctor"; doctorIds: string[] }, bodyDoctorId: string) {
  if (session.role === "doctor") {
    return session.doctorIds[0] ?? "";
  }
  return bodyDoctorId;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SchedulingStatusBody;
    const token = typeof body.token === "string" ? body.token : "";
    const bodyDoctorId = typeof body.doctorId === "string" ? body.doctorId.trim() : "";
    const includeHealth = body.includeHealth === true;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token fehlt." }, { status: 400 });
    }

    const session = verifyArztbereichSessionToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Ungültige oder abgelaufene Sitzung." }, { status: 401 });
    }

    const doctorId = resolveDoctorId(session, bodyDoctorId);
    if (!doctorId) {
      return NextResponse.json({ ok: false, error: "doctorId fehlt." }, { status: 400 });
    }

    const status = await getPublicDoctorSchedulingStatus(doctorId);
    const config = await getSchedulingStatusEntry(doctorId);

    let health:
      | {
          googleEmail?: string;
          connectedAt?: string;
          updatedAt?: string;
          accessTokenExpiresAt?: number;
          accessTokenState: AccessTokenState;
          slotSummary?: {
            next24h: number;
            next7d: number;
            generatedAt: string;
          };
          slotSummaryReason?: string;
        }
      | undefined;

    if (includeHealth) {
      const connection = await getGoogleCalendarConnection(doctorId);

      health = {
        googleEmail: connection?.googleEmail,
        connectedAt: connection?.connectedAt,
        updatedAt: connection?.updatedAt,
        accessTokenExpiresAt: connection?.accessTokenExpiresAt,
        accessTokenState: resolveAccessTokenState(connection?.accessToken, connection?.accessTokenExpiresAt),
      };

      if (status.canBookOnline) {
        const slotsResult = await getDoctorAvailableSlots(doctorId);
        if (slotsResult.status === "ready") {
          const now = Date.now();
          const next24hMs = now + 24 * 60 * 60 * 1000;
          const next7dMs = now + 7 * 24 * 60 * 60 * 1000;

          const next24h = slotsResult.slots.filter((slot) => {
            const startMs = new Date(slot.start).getTime();
            return Number.isFinite(startMs) && startMs >= now && startMs <= next24hMs;
          }).length;

          const next7d = slotsResult.slots.filter((slot) => {
            const startMs = new Date(slot.start).getTime();
            return Number.isFinite(startMs) && startMs >= now && startMs <= next7dMs;
          }).length;

          health.slotSummary = {
            next24h,
            next7d,
            generatedAt: new Date().toISOString(),
          };
        } else {
          health.slotSummaryReason = slotsResult.reason;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status,
      config: {
        calendarId: typeof config?.calendarId === "string" ? config.calendarId : "",
      },
      health,
      session: {
        role: session.role,
        email: session.email,
      },
    });
  } catch (error) {
    console.error("/api/arztbereich/scheduling-status failed", error);
    return NextResponse.json({ ok: false, error: "Interner Fehler beim Laden des Terminstatus." }, { status: 500 });
  }
}
