import { requireCeo, routeError } from "../../lib/server/authz";
import { listPromotionsForActor } from "../../lib/server/promotion-service";

export async function GET(request: Request) {
  try {
    const actor = await requireCeo(request);
    const promotions = await listPromotionsForActor(actor, true);
    return Response.json({ promotions });
  } catch (error) {
    return routeError(error);
  }
}
