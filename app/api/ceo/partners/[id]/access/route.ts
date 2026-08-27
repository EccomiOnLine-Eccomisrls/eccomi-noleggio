import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { userPermissionGrants } from "../../../../../../db/access-schema";
import { auditLogs, users } from "../../../../../../db/schema";
import { requireCeo, routeError } from "../../../../../lib/server/authz";
import { isRenderPullRequestPreview } from "../../../../../lib/server/preview-mode";
import { publicUrl } from "../../../../../lib/server/public-url";

function sameOrigin(request: Request) { const origin = request.headers.get("origin"); return !origin || new URL(origin).host === new URL(request.url).host; }
function redirectBack(request: Request, id: string, params: Record<string, string>) {
  const target = publicUrl(request, `/ceo/partners/${encodeURIComponent(id)}/accessi`);
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
  return Response.redirect(target, 303);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const form = await request.formData();
    const email = typeof form.get("email") === "string" ? String(form.get("email")).trim().toLowerCase().slice(0, 160) : "";
    const action = typeof form.get("action") === "string" ? String(form.get("action")).trim().toUpperCase() : "";
    if (!email || !["DISABLE", "DELETE"].includes(action)) return redirectBack(request, id, { accessError: "Azione accesso non valida." });

    if (isRenderPullRequestPreview(request)) {
      return redirectBack(request, id, action === "DELETE"
        ? { accessDeletePreview: "1", accessEmail: email }
        : { accessPreview: "1", accessEmail: email });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.partnerId, id))).limit(1);
    if (!user || !["PARTNER", "PARTNER_ADMIN"].includes(user.role)) return redirectBack(request, id, { accessError: "Account Partner non trovato." });

    const now = new Date().toISOString();

    if (action === "DELETE") {
      if (user.active) return redirectBack(request, id, { accessError: "Disattiva prima l'accesso, poi potrai eliminarlo definitivamente dalla società Partner." });
      await db.delete(userPermissionGrants).where(eq(userPermissionGrants.userEmail, email));
      await db.delete(users).where(and(eq(users.email, email), eq(users.partnerId, id)));
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(), actorEmail: actor.email, action: "PARTNER_ACCESS_DELETED",
        entityType: "partner_user", entityId: email,
        payloadJson: JSON.stringify({ partnerId: id, role: user.role, previousActive: user.active }), createdAt: now,
      });
      return redirectBack(request, id, { accessDeleted: "1", accessEmail: email });
    }

    if (!user.active) return redirectBack(request, id, { accessError: "L'account è già disattivato o in attesa di attivazione." });
    await db.update(users).set({ active: false, updatedAt: now }).where(eq(users.email, email));
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(), actorEmail: actor.email, action: "PARTNER_ACCESS_DISABLED",
      entityType: "partner_user", entityId: email,
      payloadJson: JSON.stringify({ partnerId: id, role: user.role }), createdAt: now,
    });
    return redirectBack(request, id, { accessDisabled: "1", accessEmail: email });
  } catch (error) {
    if (error instanceof Response) return error;
    const { id } = await context.params;
    const response = routeError(error);
    if (response.status >= 500) return redirectBack(request, id, { accessError: "Gestione accesso non riuscita. Controlla i log del server." });
    return response;
  }
}
