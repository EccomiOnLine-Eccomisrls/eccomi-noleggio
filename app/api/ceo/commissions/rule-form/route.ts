import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, hubEvents, leads, partners, promotions } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";
import {
  clearCommissionRule,
  type CommissionRuleScope,
  setCommissionRule,
} from "../../../../lib/server/commission-service";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function euroToCents(value: FormDataEntryValue | null) {
  const raw = text(value, 30).replace(",", ".");
  if (!raw) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return Number.NaN;
  return Math.round(amount * 100);
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const target = text(value, 500);
  return target.startsWith("/ceo/") ? target : "/ceo/partners";
}

function cleanScope(value: FormDataEntryValue | null): CommissionRuleScope | null {
  const scope = text(value, 20).toUpperCase();
  return scope === "PARTNER" || scope === "PROMOTION" || scope === "LEAD" ? scope : null;
}

async function entityExists(scope: CommissionRuleScope, entityId: string) {
  const db = getDb();
  if (scope === "PARTNER") {
    const [row] = await db.select({ id: partners.id }).from(partners).where(eq(partners.id, entityId)).limit(1);
    return Boolean(row);
  }
  if (scope === "PROMOTION") {
    const [row] = await db.select({ id: promotions.id }).from(promotions).where(eq(promotions.id, entityId)).limit(1);
    return Boolean(row);
  }
  const [row] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, entityId)).limit(1);
  return Boolean(row);
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
    }
    if (isRenderPullRequestPreview(request)) {
      return Response.json({ error: "Preview sicura: nessuna regola commissionale reale può essere modificata." }, { status: 409 });
    }

    const actor = await requireCeo(request);
    const form = await request.formData();
    const scope = cleanScope(form.get("scope"));
    const entityId = text(form.get("entityId"), 200);
    const returnTo = safeReturnTo(form.get("returnTo"));
    const clear = form.get("clear") === "true";
    const amountCents = euroToCents(form.get("amount"));

    if (!scope || !entityId) {
      return Response.json({ error: "Regola commissionale non valida." }, { status: 422 });
    }
    if (!(await entityExists(scope, entityId))) {
      return Response.json({ error: "Entità commissionale non trovata." }, { status: 404 });
    }
    if (!clear && (amountCents === null || Number.isNaN(amountCents) || amountCents > 10_000_000)) {
      return Response.json({ error: "Importo commissione non valido." }, { status: 422 });
    }

    const now = new Date().toISOString();
    if (clear) {
      await clearCommissionRule(scope, entityId);
    } else {
      await setCommissionRule(scope, entityId, amountCents as number, actor.email);
    }

    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: clear ? `COMMISSION_RULE_${scope}_CLEARED` : `COMMISSION_RULE_${scope}_UPDATED`,
      entityType: scope.toLowerCase(),
      entityId,
      payloadJson: JSON.stringify({ scope, amountCents: clear ? null : amountCents }),
      createdAt: now,
    });
    await getDb().insert(hubEvents).values({
      id: crypto.randomUUID(),
      eventType: clear ? "NOLEGGIO_COMMISSION_RULE_CLEARED" : "NOLEGGIO_COMMISSION_RULE_UPDATED",
      ecosystem: "ECCOMI_NOLEGGIO",
      entityType: scope.toLowerCase(),
      entityId,
      title: clear ? `${scope} · regola commissione rimossa` : `${scope} · regola commissione aggiornata`,
      payloadJson: JSON.stringify({ scope, amountCents: clear ? null : amountCents }),
      actorEmail: actor.email,
      createdAt: now,
    });

    const target = publicUrl(request, returnTo);
    target.searchParams.set("commissionRule", clear ? "cleared" : "saved");
    return Response.redirect(target, 303);
  } catch (error) {
    return routeError(error);
  }
}
