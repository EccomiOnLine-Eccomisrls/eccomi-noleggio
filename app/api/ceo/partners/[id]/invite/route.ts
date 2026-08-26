import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { auditLogs, partners, users } from "../../../../../../db/schema";
import { requireCeo, routeError } from "../../../../../lib/server/authz";
import { isRenderPullRequestPreview } from "../../../../../lib/server/preview-mode";
import { generatePartnerActivationLink, sendPartnerActivationEmail } from "../../../../../lib/server/partner-auth-provider";
import { publicUrl } from "../../../../../lib/server/public-url";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function clean(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function redirectBack(request: Request, id: string, params: Record<string, string>) {
  const target = publicUrl(request, `/ceo/partners/${encodeURIComponent(id)}`);
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
  target.hash = "accessi";
  return Response.redirect(target, 303);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: "Richiesta non autorizzata." }, { status: 403 });
    const actor = await requireCeo(request);
    const { id } = await context.params;
    const form = await request.formData();
    const displayName = clean(form.get("displayName"), 120);
    const email = clean(form.get("email"), 160).toLowerCase();

    if (!displayName || displayName.length < 2) return redirectBack(request, id, { accessError: "Indica nome e cognome del Partner Admin." });
    if (!validEmail(email)) return redirectBack(request, id, { accessError: "Inserisci un indirizzo email valido." });

    if (isRenderPullRequestPreview(request)) {
      return redirectBack(request, id, { invitePreview: "1", inviteEmail: email });
    }

    const db = getDb();
    const [partner] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
    if (!partner) return redirectBack(request, id, { accessError: "Partner non trovato." });
    if (id === "eccomi-direct") return redirectBack(request, id, { accessError: "La struttura interna ECCOMI non richiede un account Partner." });
    if (partner.status !== "ACTIVE") return redirectBack(request, id, { accessError: "Riattiva prima il Partner." });

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing && existing.partnerId && existing.partnerId !== id) {
      return redirectBack(request, id, { accessError: "Questa email è già collegata a un'altra società Partner." });
    }
    if (existing && !["PARTNER", "PARTNER_ADMIN"].includes(existing.role)) {
      return redirectBack(request, id, { accessError: "Questa email appartiene a un account ECCOMI interno e non può essere usata come Partner." });
    }
    if (existing?.active) {
      return redirectBack(request, id, { accessError: "L'account è già attivo. Disattivalo prima di inviare un nuovo link di attivazione." });
    }

    const activationUrl = new URL("/partner/activate", request.url).toString();
    const generated = await generatePartnerActivationLink({
      email,
      redirectTo: activationUrl,
      displayName,
      partnerId: id,
      existingAccount: Boolean(existing),
    });
    const emailResult = await sendPartnerActivationEmail({
      email,
      displayName,
      partnerName: partner.name,
      actionLink: generated.actionLink,
      resend: Boolean(existing),
    });

    const now = new Date().toISOString();
    await db.insert(users).values({
      email,
      displayName,
      role: "PARTNER_ADMIN",
      partnerId: id,
      active: false,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: users.email,
      set: { displayName, role: "PARTNER_ADMIN", partnerId: id, active: false, updatedAt: now },
    });

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: existing ? "PARTNER_ADMIN_INVITE_RESENT" : "PARTNER_ADMIN_INVITED",
      entityType: "partner_user",
      entityId: email,
      payloadJson: JSON.stringify({
        partnerId: id,
        role: "PARTNER_ADMIN",
        resendId: emailResult.id,
        linkType: generated.type,
        active: false,
      }),
      createdAt: now,
    });

    return redirectBack(request, id, { inviteSent: "1", inviteEmail: email });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Invito non riuscito.";
    const { id } = await context.params;
    return redirectBack(request, id, { accessError: message.slice(0, 220) });
  }
}
