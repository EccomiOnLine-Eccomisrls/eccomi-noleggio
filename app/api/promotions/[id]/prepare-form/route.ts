import { requireCeo } from "../../../../lib/server/authz";
import { preparePromotionDraft } from "../../../../lib/server/promotion-preparation";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../lib/server/public-url";

function safeReturnTo(value: FormDataEntryValue | null, id: string) {
  const fallback = `/ceo/promotions/${id}`;
  const target = typeof value === "string" ? value : fallback;
  return target === fallback ? target : fallback;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Preparazione Shopify non riuscita.";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!sameOrigin(request)) {
    return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
  }

  const form = await request.formData();
  const returnTo = safeReturnTo(form.get("returnTo"), id);
  const target = publicUrl(request, returnTo);

  if (isRenderPullRequestPreview(request)) {
    target.searchParams.set("prepared", "preview");
    return Response.redirect(target, 303);
  }

  try {
    const actor = await requireCeo(request);
    await preparePromotionDraft({
      request,
      promotionId: id,
      actorEmail: actor.email,
    });
    target.searchParams.set("prepared", "1");
    return Response.redirect(target, 303);
  } catch (error) {
    target.searchParams.set("prepareError", errorText(error));
    return Response.redirect(target, 303);
  }
}
