import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, partners, users } from "../../../../db/schema";
import { isPartnerNoleggioRole, type NoleggioRole } from "../../../lib/permissions";
import { routeError } from "../../../lib/server/authz";
import { authenticatePartnerPassword } from "../../../lib/server/partner-auth-provider";
import { createPartnerSession, partnerSessionCookie } from "../../../lib/server/partner-session";

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
    const body = await request.json().catch(() => ({})) as { email?: unknown; password?: unknown };
    const email = clean(body.email, 160).toLowerCase();
    const password = clean(body.password, 300);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1) {
      return Response.json({ error: "Email o password non corretti." }, { status: 401 });
    }

    const db = getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!existing || !existing.active || !isPartnerNoleggioRole(existing.role as NoleggioRole) || !existing.partnerId) {
      return Response.json({ error: "Account Partner non attivo o non autorizzato." }, { status: 403 });
    }
    const [partner] = await db.select().from(partners).where(eq(partners.id, existing.partnerId)).limit(1);
    if (!partner || partner.status !== "ACTIVE" || partner.id === "eccomi-direct") {
      return Response.json({ error: "Società Partner non attiva." }, { status: 403 });
    }

    const authenticated = await authenticatePartnerPassword(email, password);
    if (authenticated.user.email?.trim().toLowerCase() !== email) {
      return Response.json({ error: "Account Auth non coerente." }, { status: 403 });
    }

    const now = new Date().toISOString();
    await db.update(users).set({ updatedAt: now }).where(eq(users.email, email));
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: email,
      action: "PARTNER_LOGIN",
      entityType: "partner_user",
      entityId: email,
      payloadJson: JSON.stringify({ partnerId: existing.partnerId, role: existing.role }),
      createdAt: now,
    });

    const session = await createPartnerSession(email, existing.partnerId);
    return Response.json({
      ok: true,
      actor: { email, displayName: existing.displayName, role: existing.role, partnerId: existing.partnerId },
    }, {
      headers: { "set-cookie": partnerSessionCookie(session) },
    });
  } catch (error) {
    if (error instanceof Error && /invalid login credentials|email not confirmed|password/i.test(error.message)) {
      return Response.json({ error: "Email o password non corretti." }, { status: 401 });
    }
    return routeError(error);
  }
}
