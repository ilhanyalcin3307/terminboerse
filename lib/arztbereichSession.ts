import { createHmac, timingSafeEqual } from "node:crypto";

export type ArztbereichRole = "admin" | "doctor";

export type ArztbereichSessionPayload = {
  email: string;
  role: ArztbereichRole;
  doctorIds: string[];
  expiresAt: number;
};

function getSecret() {
  return process.env.ARZTBEREICH_AUTH_SECRET ?? process.env.RESEND_API_KEY ?? "terminboerse-dev-secret";
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createArztbereichSessionToken(payload: ArztbereichSessionPayload) {
  const encodedBody = encode(JSON.stringify(payload));
  const signature = sign(encodedBody);
  return `${encodedBody}.${signature}`;
}

export function verifyArztbereichSessionToken(token: string): ArztbereichSessionPayload | null {
  const [encodedBody, signature] = token.split(".");
  if (!encodedBody || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedBody);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(encodedBody)) as ArztbereichSessionPayload;
    if (
      typeof parsed.email !== "string" ||
      (parsed.role !== "admin" && parsed.role !== "doctor") ||
      !Array.isArray(parsed.doctorIds) ||
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
