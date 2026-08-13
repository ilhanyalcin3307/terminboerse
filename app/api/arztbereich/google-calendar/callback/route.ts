import { NextResponse } from "next/server";
import {
  ensureGoogleCalendarReadable,
  exchangeGoogleCode,
  fetchGoogleUserEmail,
  fetchPrimaryCalendarId,
  verifyGoogleOAuthState,
} from "@/lib/googleCalendarOAuth";
import { getGoogleCalendarConnection, upsertGoogleCalendarConnection } from "@/lib/googleCalendarConnectionStore";
import { upsertSchedulingStatusEntry } from "@/lib/arztbereichSchedulingStore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim() ?? "";
    const stateRaw = searchParams.get("state")?.trim() ?? "";

    if (!code || !stateRaw) {
      return NextResponse.redirect(new URL("/arztbereich?calendar=error", request.url));
    }

    const state = verifyGoogleOAuthState(stateRaw);
    if (!state) {
      return NextResponse.redirect(new URL("/arztbereich?calendar=state_invalid", request.url));
    }

    const token = await exchangeGoogleCode(code);
    const googleEmail = await fetchGoogleUserEmail(token.access_token);
    let calendarId = "";
    if (state.calendarIdHint) {
      try {
        calendarId = await ensureGoogleCalendarReadable(token.access_token, state.calendarIdHint);
      } catch {
        // Fallback to primary calendar to keep the connect flow reliable for end users.
        calendarId = await fetchPrimaryCalendarId(token.access_token);
      }
    } else {
      calendarId = await fetchPrimaryCalendarId(token.access_token);
    }

    const existingConnection = await getGoogleCalendarConnection(state.doctorId);
    const refreshToken = token.refresh_token?.trim() || existingConnection?.refreshToken;

    await upsertGoogleCalendarConnection(state.doctorId, {
      calendarId,
      googleEmail,
      refreshToken,
      accessToken: token.access_token,
      accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
    });

    await upsertSchedulingStatusEntry(state.doctorId, {
      calendarConnected: true,
      calendarId,
      schedulingEnabled: true,
    });

    const calendarState = refreshToken ? "connected" : "connected_no_refresh";

    return NextResponse.redirect(new URL(`/arztbereich?calendar=${calendarState}&doctorId=${encodeURIComponent(state.doctorId)}`, request.url));
  } catch (error) {
    console.error("/api/arztbereich/google-calendar/callback failed", error);
    return NextResponse.redirect(new URL("/arztbereich?calendar=error", request.url));
  }
}
