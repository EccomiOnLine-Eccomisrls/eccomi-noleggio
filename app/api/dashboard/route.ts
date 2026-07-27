import { and, count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissions, hubEvents, leads, partners, promotions } from "../../../db/schema";
import { requireActor, routeError } from "../../lib/server/authz";
import { getAiConnectionStatus } from "../../lib/server/ai";
import { expireStalePromotions, listPromotionsForActor } from "../../lib/server/promotion-service";
import { getShopifyConnectionStatus } from "../../lib/server/shopify";
import { seedSystemData } from "../../lib/server/seed";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    await seedSystemData(actor.email, actor.displayName);
    await expireStalePromotions();
    const promotionRows = await listPromotionsForActor(actor);
    const shopify = await getShopifyConnectionStatus();
    const ai = await getAiConnectionStatus();
    const db = getDb();
    const partnerFilter = actor.role === "PARTNER" && actor.partnerId ? eq(leads.partnerId, actor.partnerId) : undefined;
    const [leadStats] = await db.select({ total: count() }).from(leads).where(partnerFilter);
    const [newLeadStats] = await db.select({ total: count() }).from(leads).where(
      partnerFilter ? and(partnerFilter, eq(leads.status, "NEW")) : eq(leads.status, "NEW"),
    );
    const [commissionStats] = await db.select({ total: sum(commissions.amountCents) }).from(commissions).where(
      actor.role === "PARTNER" && actor.partnerId ? eq(commissions.partnerId, actor.partnerId) : undefined,
    );
    const leadRows = await db
      .select({
        id: leads.id,
        promotionId: leads.promotionId,
        partnerId: leads.partnerId,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        province: leads.province,
        customerType: leads.customerType,
        businessName: leads.businessName,
        status: leads.status,
        documentStatus: leads.documentStatus,
        createdAt: leads.createdAt,
        brand: promotions.brand,
        model: promotions.model,
        offerNumber: promotions.offerNumber,
        partnerName: partners.name,
      })
      .from(leads)
      .innerJoin(promotions, eq(leads.promotionId, promotions.id))
      .innerJoin(partners, eq(leads.partnerId, partners.id))
      .where(partnerFilter)
      .orderBy(desc(leads.createdAt))
      .limit(100);
    const eventRows = actor.role === "CEO"
      ? await db.select().from(hubEvents).orderBy(desc(hubEvents.createdAt)).limit(20)
      : [];

    return Response.json({
      user: actor,
      promotions: promotionRows,
      leads: leadRows.map((lead) => ({
        id: lead.id,
        promotionId: lead.promotionId,
        partnerId: lead.partnerId,
        customerName: `${lead.firstName} ${lead.lastName}`.trim(),
        email: lead.email,
        phone: lead.phone,
        province: lead.province || "—",
        customerType: lead.customerType || "—",
        businessName: lead.businessName,
        status: lead.status,
        documentStatus: lead.documentStatus,
        createdAt: lead.createdAt,
        vehicle: `${lead.brand} ${lead.model}`,
        offerNumber: lead.offerNumber,
        partnerName: lead.partnerName,
      })),
      integrations: { shopify, ai },
      hubEvents: eventRows,
      stats: {
        promotions: promotionRows.length,
        pendingApproval: promotionRows.filter((item) => item.status === "PENDING_APPROVAL").length,
        approved: promotionRows.filter((item) => item.status === "APPROVED").length,
        active: promotionRows.filter((item) => item.status === "ONLINE" || item.status === "ACTIVE" || item.status === "EXPIRING").length,
        expired: promotionRows.filter((item) => item.status === "EXPIRED" || item.status === "ARCHIVED").length,
        leads: leadStats?.total || 0,
        newLeads: newLeadStats?.total || 0,
        commissionCents: Number(commissionStats?.total || 0),
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
