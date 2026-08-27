import { requireCeo, routeError } from "../../../../lib/server/authz";
import { preparePromotionDraft } from "../../../../lib/server/promotion-preparation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const result = await preparePromotionDraft({ request, promotionId: id, actorEmail: actor.email });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return routeError(error);
  }
}
