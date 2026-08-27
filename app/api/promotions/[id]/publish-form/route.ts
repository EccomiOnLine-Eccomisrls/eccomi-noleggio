import { POST as publishPromotion } from "../publish/route";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "Pubblicazione Shopify non riuscita.";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const target = publicUrl(request, `/ceo/promotions/${id}/publish`);

  if (!sameOrigin(request)) {
    target.searchParams.set("publishError", "Richiesta non autorizzata.");
    return Response.redirect(target, 303);
  }

  if (isRenderPullRequestPreview(request)) {
    target.searchParams.set("published", "preview");
    return Response.redirect(target, 303);
  }

  try {
    const response = await publishPromotion(request, {
      params: Promise.resolve({ id }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      status?: string;
      url?: string;
    };

    if (!response.ok) {
      target.searchParams.set(
        "publishError",
        payload.error || "Pubblicazione Shopify non riuscita.",
      );
      return Response.redirect(target, 303);
    }

    target.searchParams.set("published", "1");
    if (payload.status) target.searchParams.set("status", payload.status);
    return Response.redirect(target, 303);
  } catch (error) {
    target.searchParams.set("publishError", errorText(error));
    return Response.redirect(target, 303);
  }
}
