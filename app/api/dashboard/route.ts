import { and, count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissions, hubEvents, leads, partners, practiceDocuments, promotions } from "../../../db/schema";
import { requireActor, routeError } from "../../lib/server/authz";
import { getAiConnectionStatus } from "../../lib/server/ai";
import { ensurePracticeSchema } from "../../lib/server/practice-schema";
import { expireStalePromotions, listPromotionsForActor } from "../../lib/server/promotion-service";
import { getShopifyConnectionStatus } from "../../lib/server/shopify";
import { seedSystemData } from "../../lib/server/seed";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    await seedSystemData(actor.email, actor.displayName);
    await ensurePracticeSchema();
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
        ibanLast4: leads.ibanLast4,
        accountHolder: leads.accountHolder,
        completedAt: leads.completedAt,
        sentToPartnerAt: leads.sentToPartnerAt,
        createdAt: leads.createdAt,
        brand: promotions.brand,
        model: promotions.model,
        offerNumber: promotions.offerNumber,
        partnerName: partners.name,
        partnerEmail: partners.contactEmail,
      })
      .from(leads)
      .innerJoin(promotions, eq(leads.promotionId, promotions.id))
      .innerJoin(partners, eq(leads.partnerId, partners.id))
      .where(partnerFilter)
      .orderBy(desc(leads.createdAt))
      .limit(100);
    const documentRows = leadRows.length
      ? await db.select({ leadId: practiceDocuments.leadId }).from(practiceDocuments)
      : [];
    const documentCount = new Map<string, number>();
    documentRows.forEach((row) => documentCount.set(row.leadId, (documentCount.get(row.leadId) || 0) + 1));
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
        documentCount: documentCount.get(lead.id) || 0,
        ibanLast4: lead.ibanLast4,
        accountHolder: lead.accountHolder,
        completedAt: lead.completedAt,
        sentToPartnerAt: lead.sentToPartnerAt,
        createdAt: lead.createdAt,
        vehicle: `${lead.brand} ${lead.model}`,
        offerNumber: lead.offerNumber,
        partnerName: lead.partnerName,
        partnerEmail: lead.partnerEmail,
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
