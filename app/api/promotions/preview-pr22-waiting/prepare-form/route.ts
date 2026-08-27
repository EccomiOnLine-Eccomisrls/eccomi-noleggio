import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";

const PREVIEW_RETURN_TO = "/ceo/promotions/preview-pr22-waiting";

export async function POST(request: Request) {
  if (!isRenderPullRequestPreview(request)) {
    return new Response("Not Found", { status: 404 });
  }

  await new Promise((resolve) => setTimeout(resolve, 10_500));

  const target = new URL(PREVIEW_RETURN_TO, request.url);
  target.searchParams.set("prepared", "1");
  return Response.redirect(target, 303);
}
