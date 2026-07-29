import { getRuntimeEnv } from "./runtime";

const COOKIE_NAME = "eccomi_partner_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

type PartnerSessionPayload = {
  email: string;
  partnerId: string;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

async function signingKey() {
  const secret = getRuntimeEnv().CEO_SESSION_SECRET?.trim();
  if (!secret) throw new Error("Chiave sessione non configurata.");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createPartnerSession(email: string, partnerId: string) {
  const payload: PartnerSessionPayload = {
    email: email.trim().toLowerCase(),
    partnerId,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(encoded));
  return `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function readPartnerSession(request: Request): Promise<PartnerSessionPayload | null> {
  const value = (request.headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!value) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await signingKey(), base64UrlToArrayBuffer(signature), encoder.encode(encoded));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToArrayBuffer(encoded))) as PartnerSessionPayload;
    if (!payload.email || !payload.partnerId || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function partnerSessionCookie(value: string) {
  return [`${COOKIE_NAME}=${value}`, "Path=/", `Max-Age=${SESSION_DURATION_SECONDS}`, "HttpOnly", "Secure", "SameSite=Lax"].join("; ");
}
