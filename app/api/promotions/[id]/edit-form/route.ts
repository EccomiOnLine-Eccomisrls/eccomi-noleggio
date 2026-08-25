import { PATCH as editPromotion } from "../edit/route";
import { publicUrl } from "../../../../lib/server/public-url";

function euroToCents(value: FormDataEntryValue | null) {
  const normalized = String(value || "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function integer(value: FormDataEntryValue | null) {
  return Number.parseInt(String(value || ""), 10);
}

function lines(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeReturnTo(value: FormDataEntryValue | null, id: string) {
  const fallback = `/ceo/promotions/${id}`;
  const target = typeof value === "string" ? value : fallback;
  return target === fallback ? target : fallback;
}

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
  const returnTo = safeReturnTo(form.get("returnTo"), id);
  const headers = new Headers();

  headers.set("content-type", "application/json");
  for (const name of ["cookie", "origin", "user-agent", "x-forwarded-host", "x-forwarded-proto"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const editResponse = await editPromotion(
    new Request(new URL(`/api/promotions/${id}/edit`, request.url), {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        brand: String(form.get("brand") || ""),
        model: String(form.get("model") || ""),
        version: String(form.get("version") || ""),
        provider: String(form.get("provider") || ""),
        monthlyGrossCents: euroToCents(form.get("monthly")),
        depositGrossCents: euroToCents(form.get("deposit")),
        durationMonths: integer(form.get("duration")),
        totalKm: integer(form.get("totalKm")),
        validUntil: String(form.get("validUntil") || ""),
        delivery: String(form.get("delivery") || ""),
        fuel: String(form.get("fuel") || ""),
        transmission: String(form.get("transmission") || ""),
        color: String(form.get("color") || ""),
        services: lines(form.get("services")),
        warnings: lines(form.get("warnings")),
        syncShopify: true,
        reactivate: form.getAll("reactivate").some((value) => value === "true" || value === "on"),
      }),
    }),
    { params: Promise.resolve({ id }) },
  );

  const payload = (await editResponse.json().catch(() => ({}))) as {
    error?: string;
  };
  const target = publicUrl(request, returnTo);

  if (!editResponse.ok) {
    target.searchParams.set("error", payload.error || "Salvataggio non riuscito.");
    return Response.redirect(target, 303);
  }

  target.searchParams.set("saved", "1");
  return Response.redirect(target, 303);
}
