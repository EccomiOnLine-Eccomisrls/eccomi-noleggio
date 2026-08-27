import { POST as deletePartner } from "../delete/route";
import { publicUrl } from "../../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
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
  const confirm = String(form.get("confirm") || "").trim();
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of ["cookie", "origin", "user-agent", "x-forwarded-host", "x-forwarded-proto"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const response = await deletePartner(
    new Request(new URL(`/api/ceo/partners/${encodeURIComponent(id)}/delete`, request.url), {
      method: "POST",
      headers,
      body: JSON.stringify({ confirm }),
    }),
    { params: Promise.resolve({ id }) },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    preview?: boolean;
    deletedPartner?: string;
  };

  if (!response.ok) {
    const target = publicUrl(request, `/ceo/partners/${encodeURIComponent(id)}/delete`);
    target.searchParams.set("error", payload.error || "Eliminazione non riuscita.");
    return Response.redirect(target, 303);
  }

  if (payload.preview) {
    const target = publicUrl(request, `/ceo/partners/${encodeURIComponent(id)}/delete`);
    target.searchParams.set("simulated", "1");
    if (payload.deletedPartner) target.searchParams.set("deleted", payload.deletedPartner);
    return Response.redirect(target, 303);
  }

  const target = publicUrl(request, "/ceo/partners");
  target.searchParams.set("deleted", payload.deletedPartner || "Partner");
  return Response.redirect(target, 303);
}
