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
import "../../ceo/ceo-server.css";
import "../../ceo/partners/partners.css";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type OfferRow = { id: string; offerNumber: string; brand: string; model: string; status: string };
type RuleRow = { scope: string; entityId: string; amountCents: number };

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function moneyPlusVat(cents: number) {
  return `${money(cents)} + IVA`;
}

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function previewData() {
  return {
    partnerName: "GOAL RENT",
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

  let partnerName = "Partner ECCOMI";
  let actorRole = "PARTNER_ADMIN";
  let offers: OfferRow[] = [];
  let rules: RuleRow[] = [];

  if (preview) {
    const fixture = previewData();
    partnerName = fixture.partnerName;
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

  return (
    <main className="ceo-server-page" data-pr27-partner-commission="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand"><span>🚙</span><div><strong>ECCOMI</strong><small>NOLEGGIO · AREA PARTNER</small></div></div>
        <a href="/partner">← Area Partner</a>
      </header>

      <section className="ceo-server-heading">
        <small>{preview ? "PR27 · PREVIEW SICURA · NESSUNA SCRITTURA REALE" : "PARTNER · CONDIZIONI ECONOMICHE"}</small>
        <h1>Aumenta la provvigione ECCOMI</h1>
        <p><strong>{partnerName}</strong> può riconoscere a ECCOMI un compenso maggiore sulla singola offerta. <strong>La provvigione può solo aumentare, mai diminuire.</strong> Tutti gli importi sono <strong>imponibili, IVA esclusa.</strong></p>
      </section>

      {feedback && message ? (
        <div className={feedback === "saved" ? "ceo-server-result" : "ceo-server-result ceo-server-result--error"}>
          <strong>{feedback === "saved" ? "AUMENTO REGISTRATO" : "OPERAZIONE BLOCCATA"}</strong>
          <div>{message}</div>
        </div>
      ) : null}

      <section className="ceo-server-kpis" aria-label="Regole provvigione Partner">
        <article><small>BASE ECCOMI</small><strong>PROTETTA</strong><span>imponibile + IVA · il Partner non può modificarla</span></article>
        <article><small>AZIONE PARTNER</small><strong>SOLO +</strong><span>può aumentare l’imponibile totale</span></article>
        <article><small>PRATICHE ESISTENTI</small><strong>CONGELATE</strong><span>nessuna modifica retroattiva</span></article>
      </section>

      {preview ? (
        <section className="ceo-server-panel">
          <article className="ceo-server-promotion">
            <div className="ceo-server-promotion__vehicle"><small>COLLAUDO PR27</small><strong>500 € + IVA → 650 € + IVA</strong><em className="ceo-server-status ceo-server-status--online">CONSENTITO</em></div>
            <div className="ceo-server-promotion__copy"><small>TEST REGOLA</small><h2>Aumento Partner +150 € imponibili</h2><p>Base imponibile ECCOMI 500 € + extra imponibile Partner 150 € = totale imponibile 650 €, IVA esclusa. Una nuova pratica congelerà 650 € + IVA.</p></div>
          </article>
          <article className="ceo-server-promotion">
            <div className="ceo-server-promotion__vehicle"><small>COLLAUDO PR27</small><strong>650 € + IVA → 450 € + IVA</strong><em className="ceo-server-status">BLOCCATO</em></div>
            <div className="ceo-server-promotion__copy"><small>ANTI-RIBASSO</small><h2>Riduzione non consentita</h2><p>Il Partner non può scendere sotto l’imponibile totale già riconosciuto. Il controllo è server-side, non solo grafico.</p></div>
          </article>
        </section>
      ) : null}

      <section className="partner-detail-stack">
        <article className="partner-detail-section">
          <div className="partner-detail-section__head"><div><h2>Le tue offerte</h2><p>Tutti gli importi sono imponibili, IVA esclusa. Gli aumenti valgono solo per le nuove pratiche create dopo il salvataggio.</p></div></div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Offerta</th><th>Base ECCOMI imponibile</th><th>Extra Partner imponibile</th><th>Totale imponibile</th><th>Aumenta imponibile a</th></tr></thead>
              <tbody>
                {offers.map((offer) => {
                  const base = baseByOffer.get(offer.id) ?? null;
                  const extra = extraByOffer.get(offer.id) ?? 0;
                  const total = base === null ? null : base + extra;
                  return (
                    <tr key={offer.id}>
                      <td><strong>{offer.offerNumber}</strong><br /><small>{offer.brand} {offer.model} · {offer.status.replaceAll("_", " ")}</small></td>
                      <td><strong>{base === null ? "DA DEFINIRE DA ECCOMI" : moneyPlusVat(base)}</strong></td>
                      <td>{base === null ? "—" : extra > 0 ? <strong>+ {money(extra)}</strong> : money(0)}<br /><small>IVA esclusa</small></td>
                      <td><strong>{total === null ? "—" : moneyPlusVat(total)}</strong></td>
                      <td>
                        {base === null ? <small>Attendi la validazione economica ECCOMI.</small> : (
                          <form method="post" action={`/api/partner/offers/${offer.id}/commission-increase`} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                              name="total"
                              type="number"
                              min={((total || base) + 1) / 100}
                              step="0.01"
                              placeholder={`Più di ${((total || base) / 100).toFixed(2).replace(".", ",")}`}
                              disabled={preview || !canIncrease || ["ARCHIVED", "TRASHED"].includes(offer.status)}
                              style={{ width: 150 }}
                              required
                            />
                            <span style={{ fontSize: 12, fontWeight: 700 }}>€ + IVA</span>
                            <button type="submit" disabled={preview || !canIncrease || ["ARCHIVED", "TRASHED"].includes(offer.status)}>Aumenta provvigione</button>
                          </form>
                        )}
                        {!canIncrease ? <small>Solo il Partner Admin può assumere questo impegno economico.</small> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!offers.length ? <p>Nessuna offerta disponibile.</p> : null}
        </article>
      </section>
    </main>
  );
}
