import { POST as reassignPromotion } from "../reassign/route";
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
  const partnerId = String(form.get("partnerId") || "").trim();
  const returnTo = `/ceo/promotions/${id}/assignment`;
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of ["cookie", "origin", "user-agent", "x-forwarded-host", "x-forwarded-proto"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const response = await reassignPromotion(
    new Request(new URL(`/api/ceo/promotions/${id}/reassign`, request.url), {
      method: "POST",
      headers,
      body: JSON.stringify({ partnerId }),
    }),
    { params: Promise.resolve({ id }) },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    preview?: boolean;
    fromPartner?: string;
    toPartner?: string;
    previousPartnerIncrementCents?: number;
    existingPractices?: number;
    newlyFrozenPractices?: number;
  };

  const target = publicUrl(request, returnTo);
  if (!response.ok) {
    target.searchParams.set("error", payload.error || "Riassegnazione non riuscita.");
    return Response.redirect(target, 303);
  }

  target.searchParams.set(payload.preview ? "simulated" : "saved", "1");
  if (payload.fromPartner) target.searchParams.set("from", payload.fromPartner);
  if (payload.toPartner) target.searchParams.set("to", payload.toPartner);
  if (typeof payload.previousPartnerIncrementCents === "number") {
    target.searchParams.set("extraResetCents", String(payload.previousPartnerIncrementCents));
  }
  if (typeof payload.existingPractices === "number") {
    target.searchParams.set("existingPractices", String(payload.existingPractices));
  }
  if (typeof payload.newlyFrozenPractices === "number") {
    target.searchParams.set("newlyFrozenPractices", String(payload.newlyFrozenPractices));
  }
  return Response.redirect(target, 303);
}
