import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs, partners } from "../../../../../db/schema";
import { requireCeo, routeError } from "../../../../lib/server/authz";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}
function text(form: FormData, key: string, max: number) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function redirectNew(request: Request, error: string) {
  const target = publicUrl(request, "/ceo/partners/new");
  target.searchParams.set("error", error);
  return Response.redirect(target, 303);
}
function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42) || "partner";
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
    const actor = await requireCeo(request);
    const form = await request.formData();
    const name = text(form, "name", 80);
    const legalName = text(form, "legalName", 120);
    const contactName = text(form, "contactName", 100);
    const contactEmail = text(form, "contactEmail", 160).toLowerCase();
    const requestedStatus = text(form, "status", 20).toUpperCase();
    const status = requestedStatus === "PAUSED" ? "PAUSED" : "ACTIVE";

    if (name.length < 2 || legalName.length < 2) return redirectNew(request, "Inserisci nome Partner e ragione sociale.");
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return redirectNew(request, "Email referente non valida.");

    if (isRenderPullRequestPreview(request)) {
      const target = publicUrl(request, "/pr15-new-partner-demo");
      target.searchParams.set("created", "1");
      target.searchParams.set("name", name);
      return Response.redirect(target, 303);
    }

    const db = getDb();
    const [duplicate] = await db.select({ id: partners.id }).from(partners).where(eq(partners.legalName, legalName)).limit(1);
    if (duplicate) return redirectNew(request, "Esiste già un Partner con questa ragione sociale.");

    const now = new Date().toISOString();
    const id = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(partners).values({
      id,
      name,
      legalName,
      status,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      additionalEmailsJson: "[]",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "PARTNER_CREATED",
      entityType: "partner",
      entityId: id,
      payloadJson: JSON.stringify({ name, legalName, contactName: contactName || null, contactEmail: contactEmail || null, status }),
      createdAt: now,
    });

    return Response.redirect(publicUrl(request, `/ceo/partners/${encodeURIComponent(id)}?created=1`), 303);
  } catch (error) {
    if (error instanceof Response) return error;
    const response = routeError(error);
    if (response.status >= 500) return redirectNew(request, "Creazione Partner non riuscita. Controlla i log del server.");
    return response;
  }
}
