import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { partners, users } from "../../../../../db/schema";
import { routeError } from "../../../../lib/server/authz";
import { createPartnerSession, partnerSessionCookie } from "../../../../lib/server/partner-session";
import { ensurePracticeSchema } from "../../../../lib/server/practice-schema";
import { getRuntimeEnv } from "../../../../lib/server/runtime";

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (new URL(origin).host !== new URL(request.url).host) {
    throw new Response(JSON.stringify({ error: "Richiesta non autorizzata." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await ensurePracticeSchema();
    const body = await request.json() as { email?: unknown; password?: unknown };
    const email = clean(body.email, 160).toLowerCase();
    const password = clean(body.password, 300);
    const configuredPassword = getRuntimeEnv().PARTNER_ACCESS_PASSWORD?.trim();
    if (!configuredPassword) {
      return Response.json({ error: "Accesso partner non ancora configurato." }, { status: 503 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password !== configuredPassword) {
      return Response.json({ error: "Email o password non corretti." }, { status: 401 });
    }

    const db = getDb();
    const partnerRows = await db.select().from(partners).where(eq(partners.status, "ACTIVE"));
    const partner = partnerRows.find((item) => {
      const additional = JSON.parse(item.additionalEmailsJson || "[]") as string[];
      return item.contactEmail?.trim().toLowerCase() === email || additional.map((value) => value.trim().toLowerCase()).includes(email);
    });
    if (!partner || partner.id === "eccomi-direct") {
      return Response.json({ error: "Email non associata a un partner autorizzato." }, { status: 403 });
    }

    await db.insert(users).values({
      email,
      displayName: partner.contactName || partner.name,
      role: "PARTNER",
      partnerId: partner.id,
      active: true,
      updatedAt: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: partner.contactName || partner.name,
        role: "PARTNER",
        partnerId: partner.id,
        active: true,
        updatedAt: new Date().toISOString(),
      },
    });

    const session = await createPartnerSession(email, partner.id);
    return Response.json({
      ok: true,
      actor: { email, displayName: partner.contactName || partner.name, role: "PARTNER", partnerId: partner.id },
    }, {
      headers: { "set-cookie": partnerSessionCookie(session) },
    });
  } catch (error) {
    return routeError(error);
  }
}
