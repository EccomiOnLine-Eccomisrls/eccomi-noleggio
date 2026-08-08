import {
  ceoSessionCookie,
  createCeoSession,
} from "../../../lib/server/ceo-session";
import { getRuntimeEnv } from "../../../lib/server/runtime";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type HubHandoff = {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  ecosystems?: string[];
  permissions?: Record<string, boolean>;
  iat?: number;
  exp?: number;
  nonce?: string;
  next?: string;
};

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/ceo";
  if (!value.startsWith("/") || value.startsWith("//")) return "/ceo";
  return value.slice(0, 200);
}

async function verifyHandoff(token: string): Promise<HubHandoff | null> {
  const secret = getRuntimeEnv().HUB_SSO_SECRET?.trim();
  if (!secret) throw new Error("HUB_SSO_SECRET non configurato su ECCOMI NOLEGGIO.");

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      base64UrlToBytes(signaturePart),
      encoder.encode(payloadPart),
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(base64UrlToBytes(payloadPart))) as HubHandoff;
    const now = Math.floor(Date.now() / 1000);

    if (payload.iss !== "eccomi-hub" || payload.aud !== "eccomi-noleggio") return null;
    if (!payload.email || !payload.sub || !payload.exp || !payload.iat) return null;
    if (payload.exp <= now || payload.iat > now + 30) return null;
    if (payload.exp - payload.iat > 120) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token")?.trim() || "";
    const handoff = token ? await verifyHandoff(token) : null;

    if (!handoff) {
      return Response.json({ error: "Accesso HUB non valido o scaduto." }, { status: 401 });
    }

    if (handoff.role !== "ceo") {
      return Response.json(
        { error: "Accesso Responsabile via HUB non ancora abilitato in questa preview." },
        { status: 403 },
      );
    }

    const configuredCeo = getRuntimeEnv().CEO_EMAIL?.trim().toLowerCase();
    const email = handoff.email.trim().toLowerCase();
    if (configuredCeo && email !== configuredCeo) {
      return Response.json({ error: "Identità CEO HUB non riconosciuta da ECCOMI NOLEGGIO." }, { status: 403 });
    }

    const session = await createCeoSession(email);
    const redirectUrl = new URL(safeNext(handoff.next), url.origin);

    return new Response(null, {
      status: 302,
      headers: {
        location: redirectUrl.toString(),
        "set-cookie": ceoSessionCookie(session),
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("HUB_SSO_ERROR", error);
    return Response.json({ error: "Accesso diretto HUB → Noleggio non disponibile." }, { status: 500 });
  }
}
