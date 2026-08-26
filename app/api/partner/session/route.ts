import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { partners, users } from "../../../../db/schema";
import { routeError } from "../../../lib/server/authz";
import { requirePartnerActor } from "../../../lib/server/partner-authz";

export async function GET(request: Request) {
  try {
    const actor = await requirePartnerActor(request);
    const db = getDb();
    const [partner] = await db.select().from(partners).where(eq(partners.id, actor.partnerId)).limit(1);
    if (!partner || partner.status !== "ACTIVE") {
      return Response.json({ error: "Partner non attivo." }, { status: 403 });
    }

    const team = actor.role === "PARTNER_ADMIN"
      ? await db
          .select({ email: users.email, displayName: users.displayName, role: users.role, active: users.active })
          .from(users)
          .where(eq(users.partnerId, actor.partnerId))
      : [];

    return Response.json({
      actor,
      partner: {
        id: partner.id,
        name: partner.name,
        legalName: partner.legalName,
        status: partner.status,
        contactName: partner.contactName,
        contactEmail: partner.contactEmail,
      },
      team,
      capabilities: {
        manageTeam: actor.role === "PARTNER_ADMIN",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
