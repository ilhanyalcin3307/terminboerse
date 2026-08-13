import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type OAuthStatePayload = {
  doctorId: string;
  email: string;
  calendarIdHint?: string;
  nonce: string;
  expiresAt: number;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type CalendarListItem = {
  id?: string;
  primary?: boolean;
  accessRole?: string;
};

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars missing");
  }

  return { clientId, clientSecret, redirectUri };
}

function getStateSecret() {
  return process.env.GOOGLE_OAUTH_STATE_SECRET ?? process.env.ARZTBEREICH_AUTH_SECRET ?? "terminboerse-google-state";
}

function sign(value: string) {
  return createHmac("sha256", getStateSecret()).update(value).digest("base64url");
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function buildGoogleCalendarOAuthUrl(input: { doctorId: string; email: string; calendarIdHint?: string }) {
  const { clientId, redirectUri } = getOAuthConfig();

  const payload: OAuthStatePayload = {
    doctorId: input.doctorId,
    email: input.email,
    calendarIdHint: input.calendarIdHint?.trim() || undefined,
    nonce: randomUUID(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  const encodedPayload = encode(JSON.stringify(payload));
  const state = `${encodedPayload}.${sign(encodedPayload)}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email openid",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function verifyGoogleOAuthState(rawState: string): OAuthStatePayload | null {
  const [encodedPayload, signature] = rawState.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(encodedPayload)) as OAuthStatePayload;
    if (
      typeof parsed.doctorId !== "string" ||
      typeof parsed.email !== "string" ||
      (typeof parsed.calendarIdHint !== "undefined" && typeof parsed.calendarIdHint !== "string") ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function exchangeGoogleCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error_description?: string; error?: string };
    throw new Error(payload.error_description ?? payload.error ?? `Token exchange failed (${response.status})`);
  }

  const token = (await response.json()) as TokenResponse;
  if (!token.access_token) {
    throw new Error("Google access token missing");
  }

  return token;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getOAuthConfig();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error_description?: string; error?: string };
    throw new Error(payload.error_description ?? payload.error ?? `Token refresh failed (${response.status})`);
  }

  const token = (await response.json()) as TokenResponse;
  if (!token.access_token) {
    throw new Error("Refreshed access token missing");
  }

  return token;
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | undefined> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as { email?: string };
  return typeof payload.email === "string" ? payload.email : undefined;
}

export async function fetchPrimaryCalendarId(accessToken: string): Promise<string> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Calendar list fetch failed (${response.status})`);
  }

  const payload = (await response.json()) as { items?: CalendarListItem[] };
  const items = Array.isArray(payload.items) ? payload.items : [];

  const primary = items.find((item) => item.primary && typeof item.id === "string" && item.id.trim());
  if (primary?.id) {
    return primary.id;
  }

  const firstReadable = items.find(
    (item) =>
      typeof item.id === "string" &&
      item.id.trim() &&
      (item.accessRole === "owner" || item.accessRole === "writer" || item.accessRole === "reader"),
  );

  if (!firstReadable?.id) {
    throw new Error("No readable Google calendar found");
  }

  return firstReadable.id;
}

export async function ensureGoogleCalendarReadable(accessToken: string, calendarId: string): Promise<string> {
  const normalizedCalendarId = calendarId.trim();
  if (!normalizedCalendarId) {
    throw new Error("Kalender-ID fehlt.");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(normalizedCalendarId)}?fields=id`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Kalender nicht lesbar (${response.status}). Bitte Kalender-ID prüfen.`);
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("Kalender konnte nicht verifiziert werden.");
  }

  return payload.id;
}
