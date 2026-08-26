import { isPartnerNoleggioRole } from "../../../lib/permissions";
import { requireActor, routeError } from "../../../lib/server/authz";
import { isRenderPullRequestPreview } from "../../../lib/server/preview-mode";
import { POST as createPromotion } from "../../promotions/route";

export async function POST(request: Request) {
  try {
    if (isRenderPullRequestPreview(request)) {
      return Response.json({ error: "Preview sicura: nessuna quotazione viene creata e Shopify non viene contattato." }, { status: 409 });
    }
    const actor = await requireActor(request);
    if (!isPartnerNoleggioRole(actor.role) || !actor.partnerId) {
      return Response.json({ error: "Azione riservata agli account Partner." }, { status: 403 });
    }
    return createPromotion(request);
  } catch (error) {
    return routeError(error);
  }
}
