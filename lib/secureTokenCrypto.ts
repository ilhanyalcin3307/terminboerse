import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function readSecretRaw() {
  return (
    process.env.GOOGLE_TOKEN_ENCRYPTION_SECRET ??
    process.env.ARZTBEREICH_AUTH_SECRET ??
    process.env.RESEND_API_KEY ??
    "terminboerse-dev-crypto-secret"
  );
}

function getSecretCandidates() {
  const raw = readSecretRaw();
  const trimmed = raw.trim();

  if (trimmed && trimmed !== raw) {
    return [trimmed, raw];
  }

  return [raw];
}

function getKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptText(plainText: string) {
  const iv = randomBytes(12);
  const [preferredSecret] = getSecretCandidates();
  const cipher = createCipheriv(ALGORITHM, getKey(preferredSecret), iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptText(serialized: string) {
  const [ivB64, authTagB64, encryptedB64] = serialized.split(".");
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error("Encrypted payload format invalid");
  }

  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(authTagB64, "base64url");
  const encrypted = Buffer.from(encryptedB64, "base64url");

  const candidates = getSecretCandidates();

  for (const secret of candidates) {
    try {
      const decipher = createDecipheriv(ALGORITHM, getKey(secret), iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString("utf8");
    } catch {
      // Try next secret candidate for backward compatibility.
    }
  }

  throw new Error("Unable to decrypt token payload");
}
