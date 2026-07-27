import { count, desc, eq, inArray, sum } from "drizzle-orm";
import { getDb } from "../../../../db";
import { commissions, hubEvents, leads, promotions } from "../../../../db/schema";
import { getRuntimeEnv } from "../../../lib/server/runtime";

const ACTIVE_PROMOTION_STATES = ["ONLINE", "ACTIVE", "EXPIRING"];
const CLOSED_PROMOTION_STATES = ["EXPIRED", "ARCHIVED"];
const WORKING_LEAD_STATES = ["ECCOMI_REVIEW", "NEEDS_INFO", "SENT_TO_PARTNER", "QUOTE"];
const CONTRACT_LEAD_STATES = ["CONTRACT", "DELIVERED"];

function json(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function authorize(request: Request) {
  const configuredSecret = getRuntimeEnv().HUB_READ_SECRET?.trim() || "";
  if (!configuredSecret) {
    return json({ error: "Collegamento ECCOMI HUB non configurato." }, 503);
  }

  const authorization = request.headers.get("authorization") || "";
  const suppliedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!suppliedSecret || suppliedSecret.length !== configuredSecret.length || suppliedSecret !== configuredSecret) {
    return json({ error: "Accesso non autorizzato." }, 401);
  }

  return null;
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  try {
    const db = getDb();
    const [
      [promotionTotal],
      [pendingApproval],
      [approved],
      [active],
      [expiring],
      [expired],
      [leadTotal],
      [newLeads],
      [workingLeads],
      [contracts],
      [commissionTotal],
      recentEvents,
    ] = await Promise.all([
      db.select({ total: count() }).from(promotions),
      db.select({ total: count() }).from(promotions).where(eq(promotions.status, "PENDING_APPROVAL")),
      db.select({ total: count() }).from(promotions).where(eq(promotions.status, "APPROVED")),
      db.select({ total: count() }).from(promotions).where(inArray(promotions.status, ACTIVE_PROMOTION_STATES)),
      db.select({ total: count() }).from(promotions).where(eq(promotions.status, "EXPIRING")),
      db.select({ total: count() }).from(promotions).where(inArray(promotions.status, CLOSED_PROMOTION_STATES)),
      db.select({ total: count() }).from(leads),
      db.select({ total: count() }).from(leads).where(eq(leads.status, "NEW")),
      db.select({ total: count() }).from(leads).where(inArray(leads.status, WORKING_LEAD_STATES)),
      db.select({ total: count() }).from(leads).where(inArray(leads.status, CONTRACT_LEAD_STATES)),
      db.select({ total: sum(commissions.amountCents) }).from(commissions),
      db
        .select({
          id: hubEvents.id,
          eventType: hubEvents.eventType,
          title: hubEvents.title,
          createdAt: hubEvents.createdAt,
        })
        .from(hubEvents)
        .orderBy(desc(hubEvents.createdAt))
        .limit(8),
    ]);

    return json({
      source: "eccomi-noleggio-d1",
      safe_read_only: true,
      generated_at: new Date().toISOString(),
      summary: {
        promotions_total: Number(promotionTotal?.total || 0),
        pending_approval: Number(pendingApproval?.total || 0),
        approved: Number(approved?.total || 0),
        active: Number(active?.total || 0),
        expiring: Number(expiring?.total || 0),
        expired: Number(expired?.total || 0),
        leads_total: Number(leadTotal?.total || 0),
        new_leads: Number(newLeads?.total || 0),
        working_leads: Number(workingLeads?.total || 0),
        contracts: Number(contracts?.total || 0),
        commission_cents: Number(commissionTotal?.total || 0),
      },
      recent: recentEvents.map((event) => ({
        id: event.id,
        event_type: event.eventType,
        title: event.title,
        created_at: event.createdAt,
      })),
    });
  } catch {
    return json({ error: "I KPI di Eccomi Noleggio non sono momentaneamente disponibili." }, 502);
  }
}
