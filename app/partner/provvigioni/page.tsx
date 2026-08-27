/* eslint-disable @next/next/no-html-link-for-pages -- Partner workspace uses native navigation/forms for iPad stability. */
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissionRules } from "../../../db/commission-rules";
import { promotions } from "../../../db/schema";
import { isPartnerNoleggioRole } from "../../lib/permissions";
import { getActor } from "../../lib/server/authz";
import { currentRequest } from "../../lib/server/current-request";
import { ensurePracticeSchema } from "../../lib/server/practice-schema";
import { isRenderPullRequestPreview } from "../../lib/server/preview-mode";
import ExtraGaraOffers from "./extra-gara-offers";
import "../../ceo/ceo-server.css";
import "../../ceo/partners/partners.css";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type OfferRow = { id: string; offerNumber: string; brand: string; model: string; status: string };
type RuleRow = { scope: string; entityId: string; amountCents: number };

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function previewData() {
  return {
    actorRole: "PARTNER_ADMIN",
    offers: [
      { id: "preview-ducato", offerNumber: "4022223739", brand: "FIAT", model: "Ducato 3", status: "ONLINE" },
      { id: "preview-q2", offerNumber: "4022223493", brand: "AUDI", model: "Q2", status: "ONLINE" },
    ] as OfferRow[],
    rules: [
      { scope: "PROMOTION", entityId: "preview-ducato", amountCents: 50000 },
      { scope: "PARTNER_INCREMENT", entityId: "preview-ducato", amountCents: 15000 },
      { scope: "PROMOTION", entityId: "preview-q2", amountCents: 50000 },
    ] as RuleRow[],
  };
}

export default async function PartnerProvvigioniPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const request = await currentRequest("/partner/provvigioni");
  const preview = isRenderPullRequestPreview(request);

  let actorRole = "PARTNER_ADMIN";
  let offers: OfferRow[] = [];
  let rules: RuleRow[] = [];

  if (preview) {
    const fixture = previewData();
    actorRole = fixture.actorRole;
    offers = fixture.offers;
    rules = fixture.rules;
  } else {
    const actor = await getActor(request);
    if (!actor || !isPartnerNoleggioRole(actor.role) || !actor.partnerId) {
      return (
        <main className="ceo-server-login">
          <section className="ceo-server-login__card">
            <h1>Area Partner richiesta</h1>
            <p>Accedi prima alla tua Area Partner ECCOMI NOLEGGIO.</p>
            <a className="ceo-server-primary" href="/partner">Vai all’Area Partner</a>
          </section>
        </main>
      );
    }

    actorRole = actor.role;
    await ensurePracticeSchema();
    const db = getDb();

    offers = await db
      .select({
        id: promotions.id,
        offerNumber: promotions.offerNumber,
        brand: promotions.brand,
        model: promotions.model,
        status: promotions.status,
      })
      .from(promotions)
      .where(and(eq(promotions.partnerId, actor.partnerId), ne(promotions.status, "TRASHED")))
      .orderBy(desc(promotions.updatedAt));

    rules = await db
      .select({ scope: commissionRules.scope, entityId: commissionRules.entityId, amountCents: commissionRules.amountCents })
      .from(commissionRules)
      .where(inArray(commissionRules.scope, ["PROMOTION", "PARTNER_INCREMENT"]));
  }

  const baseByOffer = new Map(rules.filter((rule) => rule.scope === "PROMOTION").map((rule) => [rule.entityId, rule.amountCents]));
  const extraByOffer = new Map(rules.filter((rule) => rule.scope === "PARTNER_INCREMENT").map((rule) => [rule.entityId, rule.amountCents]));
  const canIncrease = actorRole === "PARTNER_ADMIN";
  const feedback = queryValue(query, "partnerIncrease");
  const message = queryValue(query, "message");
  const backHref = preview ? "/partner/pr28-workspace-preview?view=offers" : "/partner";

  const offerItems = offers.map((offer) => {
    const baseCents = baseByOffer.get(offer.id) ?? null;
    const extraCents = extraByOffer.get(offer.id) ?? 0;
    return {
      ...offer,
      baseCents,
      extraCents,
      totalCents: baseCents === null ? null : baseCents + extraCents,
    };
  });

  return (
    <main className="ceo-server-page" data-pr28-extra-gara="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div>
            <div style={{ color: "#073f73", fontWeight: 900, letterSpacing: ".04em" }}>ECCOMI NOLEGGIO</div>
            <div style={{ color: "#073f73", fontSize: 10, fontWeight: 700, lineHeight: 1.25 }}>by Eccomi OnLine</div>
            <div style={{ color: "#073f73", fontSize: 10, fontWeight: 800, letterSpacing: ".12em", lineHeight: 1.25 }}>AREA PARTNER</div>
          </div>
        </div>
        <a href={backHref}>← Area Partner</a>
      </header>

      <section className="ceo-server-heading">
        {preview ? <small>PR28 · PREVIEW SICURA · NESSUNA SCRITTURA REALE</small> : null}
        <h1>Extra Gara</h1>
        <p>Aumenta il compenso riconosciuto su una singola offerta.</p>
      </section>

      {feedback && message ? (
        <div className={feedback === "saved" ? "ceo-server-result" : "ceo-server-result ceo-server-result--error"}>
          <strong>{feedback === "saved" ? "EXTRA GARA REGISTRATO" : "OPERAZIONE BLOCCATA"}</strong>
          <div>{message}</div>
        </div>
      ) : null}

      <section className="partner-detail-stack">
        <article className="partner-detail-section">
          <div className="partner-detail-section__head"><div><h2>Le tue offerte</h2></div></div>
          <ExtraGaraOffers offers={offerItems} canIncrease={canIncrease} preview={preview} />
          {!offerItems.length ? <p>Nessuna offerta disponibile.</p> : null}
        </article>
      </section>
    </main>
  );
}
