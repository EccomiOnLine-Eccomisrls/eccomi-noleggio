import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { promotions } from "../../../../../../db/schema";
import {
  corsHeaders,
  jsonWithCors,
  publicCorsOrigin,
} from "../../../../../lib/server/public-origin";
import { isRenderPullRequestPreview } from "../../../../../lib/server/preview-mode";

function isAvailable(status: string, validUntil: string) {
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Rome",
  });

  return ["ONLINE", "ACTIVE", "EXPIRING"].includes(status)
    && validUntil >= today;
}

export async function OPTIONS(request: Request) {
  const origin = await publicCorsOrigin(request);

  if (!origin) {
    return jsonWithCors(
      { error: "Origine non autorizzata." },
      403,
      null,
    );
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = await publicCorsOrigin(request);
  const sameOrigin =
    !request.headers.get("origin")
    || origin === new URL(request.url).origin;

  if (!sameOrigin && !origin) {
    return jsonWithCors(
      { error: "Origine non autorizzata." },
      403,
      null,
    );
  }

  const { id } = await context.params;

  if (isRenderPullRequestPreview(request)) {
    const isValidPracticePreview =
      id === "pr38-preview-valid-offer";

    return jsonWithCors(
      {
        promotion: isValidPracticePreview
          ? {
              id,
              offerNumber: "PR38-VALID-001",
              brand: "FIAT",
              model: "500",
              version: "Hybrid Icon",
              monthlyGrossCents: 42900,
              depositGrossCents: 0,
              durationMonths: 36,
              totalKm: 45000,
              validUntil: "2026-11-30",
              status: "ONLINE",
              available: true,
            }
          : {
              id: id || "pr38-preview-offer",
              offerNumber: "4022223739",
              brand: "FIAT",
              model: "Ducato 3",
              version: "L2H2 140CV 2.2",
              monthlyGrossCents: 62477,
              depositGrossCents: 0,
              durationMonths: 48,
              totalKm: 60000,
              validUntil: "2026-09-20",
              status: "EXPIRED",
              available: false,
            },
        preview: true,
      },
      200,
      origin,
    );
  }

  const [promotion] = await getDb()
    .select({
      id: promotions.id,
      offerNumber: promotions.offerNumber,
      brand: promotions.brand,
      model: promotions.model,
      version: promotions.version,
      monthlyGrossCents: promotions.monthlyGrossCents,
      depositGrossCents: promotions.depositGrossCents,
      durationMonths: promotions.durationMonths,
      totalKm: promotions.totalKm,
      validUntil: promotions.validUntil,
      status: promotions.status,
    })
    .from(promotions)
    .where(eq(promotions.id, id))
    .limit(1);

  if (!promotion || promotion.status === "TRASHED") {
    return jsonWithCors(
      { error: "Offerta non riconosciuta." },
      404,
      origin,
    );
  }

  return jsonWithCors(
    {
      promotion: {
        ...promotion,
        available: isAvailable(
          promotion.status,
          promotion.validUntil,
        ),
      },
      preview: false,
    },
    200,
    origin,
  );
}
