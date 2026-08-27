import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { promotions } from "../../../../db/schema";
import { isPartnerNoleggioRole } from "../../../lib/permissions";
import { actorHasPermission, requireActor, routeError } from "../../../lib/server/authz";
import { isRenderPullRequestPreview } from "../../../lib/server/preview-mode";
import { POST as createPromotion } from "../../promotions/route";

function italianDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Rome" }).format(date);
}

export async function POST(request: Request) {
  try {
    if (isRenderPullRequestPreview(request)) {
      return Response.json({ error: "Preview sicura: nessuna quotazione viene creata e Shopify non viene contattato." }, { status: 409 });
    }

    const actor = await requireActor(request);
    if (!isPartnerNoleggioRole(actor.role) || !actor.partnerId) {
      return Response.json({ error: "Azione riservata agli account Partner." }, { status: 403 });
    }
    if (!(await actorHasPermission(actor, "QUOTE_CREATE_OWN"))) {
      return Response.json({ error: "Permesso di inserimento quotazioni non abilitato." }, { status: 403 });
    }

    const response = await createPromotion(request);
    if (response.ok) return response;

    const payload = await response.clone().json().catch(() => ({})) as { promotionId?: string; error?: string };
    if (payload.promotionId) {
      const [promotion] = await getDb()
        .select({ id: promotions.id, partnerId: promotions.partnerId, status: promotions.status, validUntil: promotions.validUntil })
        .from(promotions)
        .where(eq(promotions.id, payload.promotionId))
        .limit(1);

      if (promotion && promotion.partnerId === actor.partnerId && promotion.status === "EXPIRED") {
        return Response.json({
          error: `Quotazione registrata ma scaduta il ${italianDate(promotion.validUntil)}. Apri la scheda Offerte, imposta una nuova scadenza futura e premi “Aggiorna scadenza”. ECCOMI la rimetterà automaticamente in verifica.`,
          promotionId: promotion.id,
          expired: true,
          validUntil: promotion.validUntil,
        }, { status: 409 });
      }
    }

    return response;
  } catch (error) {
    return routeError(error);
  }
}
