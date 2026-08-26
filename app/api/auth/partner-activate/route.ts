import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, partners, users } from "../../../../db/schema";
import { isPartnerNoleggioRole, type NoleggioRole } from "../../../lib/permissions";
import { routeError } from "../../../lib/server/authz";
import { verifyPartnerActivationToken, setSupabasePassword } from "../../../lib/server/partner-auth-provider";
import { createPartnerSession, partnerSessionCookie } from "../../../lib/server/partner-session";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { tokenHash?: unknown; type?: unknown; password?: unknown };
    const tokenHash = clean(body.tokenHash, 500);
    const type = clean(body.type, 20) as "invite" | "recovery";
    const password = clean(body.password, 300);
    if (!tokenHash || !["invite", "recovery"].includes(type)) return Response.json({ error: "Link di attivazione mancante o scaduto." }, { status: 401 });
    if (password.length < 12) return Response.json({ error: "La password deve contenere almeno 12 caratteri." }, { status: 422 });

    const verified = await verifyPartnerActivationToken(tokenHash, type);
    const email = verified.user.email?.trim().toLowerCase() || "";
    if (!email) return Response.json({ error: "Account Supabase non valido." }, { status: 403 });

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !isPartnerNoleggioRole(user.role as NoleggioRole) || !user.partnerId) {
      return Response.json({ error: "Questo invito non è associato a un account Partner ECCOMI." }, { status: 403 });
    }
    const [partner] = await db.select().from(partners).where(eq(partners.id, user.partnerId)).limit(1);
    if (!partner || partner.status !== "ACTIVE" || partner.id === "eccomi-direct") {
      return Response.json({ error: "La società Partner non è attiva." }, { status: 403 });
    }

    await setSupabasePassword(verified.accessToken, password);
    const now = new Date().toISOString();
    await db.update(users).set({ active: true, updatedAt: now }).where(eq(users.email, email));
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: email,
      action: type === "recovery" ? "PARTNER_ACCOUNT_REACTIVATED" : "PARTNER_ACCOUNT_ACTIVATED",
      entityType: "partner_user",
      entityId: email,
      payloadJson: JSON.stringify({ partnerId: user.partnerId, role: user.role, authType: type }),
      createdAt: now,
    });

    const session = await createPartnerSession(email, user.partnerId);
    return Response.json({ ok: true, partnerId: user.partnerId, role: user.role }, {
      headers: { "set-cookie": partnerSessionCookie(session) },
    });
  } catch (error) {
    if (error instanceof Error && /expired|invalid|otp|token/i.test(error.message)) {
      return Response.json({ error: "Link di attivazione non valido o scaduto. Chiedi a ECCOMI di reinviare l’invito." }, { status: 401 });
    }
    return routeError(error);
  }
}
