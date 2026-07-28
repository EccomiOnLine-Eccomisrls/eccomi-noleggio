import { getRuntimeEnv } from "./runtime";

const COOKIE_NAME = "eccomi_ceo_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

type SessionPayload = {
  email: string;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer.slice(0);
}

async function signingKey(): Promise<CryptoKey> {
  const secret = getRuntimeEnv().CEO_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error("Chiave sessione CEO non configurata.");
  }

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  );
}

export async function createCeoSession(email: string): Promise<string> {
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };

  const encodedPayload = bytesToBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(encodedPayload),
  );

  return `${encodedPayload}.${bytesToBase64Url(
    new Uint8Array(signature),
  )}`;
}

export async function readCeoSession(
  request: Request,
): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);

  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, encodedSignature] = cookieValue.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      base64UrlToArrayBuffer(encodedSignature),
      encoder.encode(encodedPayload),
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToArrayBuffer(encodedPayload)),
    ) as SessionPayload;

    if (
      !payload.email ||
      !payload.expiresAt ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload.email.trim().toLowerCase();
  } catch {
    return null;
  }
}

export function ceoSessionCookie(value: string): string {
  return [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function clearCeoSessionCookie(): string {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}