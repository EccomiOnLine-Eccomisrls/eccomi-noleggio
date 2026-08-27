/* eslint-disable @next/next/no-html-link-for-pages -- Commission Center intentionally uses native forms/navigation for iPad stability. */
import { desc, isNull, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissionRules } from "../../../db/commission-rules";
import { commissions, leads, partners, promotions } from "../../../db/schema";
import { actorHasPermission, getActor } from "../../lib/server/authz";
import { currentRequest } from "../../lib/server/current-request";
import { ensurePracticeSchema } from "../../lib/server/practice-schema";
import { isRenderPullRequestPreview } from "../../lib/server/preview-mode";
import CeoLoginFallback from "../ceo-login-fallback";
import "../ceo-server.css";
import "../partners/partners.css";

type CommissionPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type PromotionRow = { id: string; partnerId: string; offerNumber: string; brand: string; model: string; status: string };
type LeadRow = { id: string; partnerId: string; promotionId: string; firstName: string; lastName: string; status: string };
type CommissionRow = { id: string; leadId: string; partnerId: string; amountCents: number; status: string; accruedAt: string; invoicedAt: string | null; paidAt: string | null };
type TermRow = { scope: string; entityId: string; amountCents: number };

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}
function money(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function amountValue(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2);
}
function shortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(date);
}
function statusLabel(value: string) {
  return ({ ACCRUED: "MATURATA", INVOICED: "FATTURATA", PAID: "PAGATA", CONTRACT: "CONTRATTO ACQUISITO", DELIVERED: "VEICOLO CONSEGNATO" } as Record<string, string>)[value] || value.replaceAll("_", " ");
}
function previewData() {
  const now = new Date().toISOString();
  return {
    promotionsRows: [
      { id: "preview-offer-ducato", partnerId: "preview-goal-rent", offerNumber: "4022223739", brand: "FIAT", model: "Ducato 3", status: "PENDING_APPROVAL" },
    ] as PromotionRow[],
    leadRows: [
      { id: "PRATICA-DEMO-001", partnerId: "preview-goal-rent", promotionId: "preview-offer-ducato", firstName: "Cliente", lastName: "Demo", status: "CONTRACT" },
    ] as LeadRow[],
    terms: [
      { scope: "PROMOTION", entityId: "preview-offer-ducato", amountCents: 45000 },
      { scope: "LEAD", entityId: "PRATICA-DEMO-001", amountCents: 45000 },
    ] as TermRow[],
    commissionRows: [
      { id: "COMM-DEMO-001", leadId: "PRATICA-DEMO-001", partnerId: "preview-goal-rent", amountCents: 45000, status: "ACCRUED", accruedAt: now, invoicedAt: null, paidAt: null },
    ] as CommissionRow[],
    partnerNames: new Map([["preview-goal-rent", "GOAL RENT"]]),
  };
}

export default async function CeoCommissionCenter({ searchParams }: CommissionPageProps) {
  const query = await searchParams;
  const request = await currentRequest("/ceo/commissions");
  const preview = isRenderPullRequestPreview(request);
  const actor = await getActor(request);
  if (!actor) return <CeoLoginFallback />;
  const canView = actor.role === "CEO" || await actorHasPermission(actor, "COMMISSION_VIEW_ALL");
  if (!canView) {
    return <main className="ceo-server-login"><section className="ceo-server-login__card"><h1>Area non autorizzata</h1><p>Il Centro Provvigioni ECCOMI non è disponibile per questo account.</p><a className="ceo-server-primary" href="/">Torna alla dashboard</a></section></main>;
  }
  const canSet = actor.role === "CEO" || await actorHasPermission(actor, "COMMISSION_SET_ECCOMI");

  let data = preview ? previewData() : null;
  if (!data) {
    await ensurePracticeSchema();
    const db = getDb();
    const [promotionsRows, leadRows, terms, commissionRows, partnerRows] = await Promise.all([
      db.select({ id: promotions.id, partnerId: promotions.partnerId, offerNumber: promotions.offerNumber, brand: promotions.brand, model: promotions.model, status: promotions.status }).from(promotions).where(ne(promotions.status, "TRASHED")).orderBy(desc(promotions.updatedAt)),
      db.select({ id: leads.id, partnerId: leads.partnerId, promotionId: leads.promotionId, firstName: leads.firstName, lastName: leads.lastName, status: leads.status }).from(leads).where(isNull(leads.deletedAt)).orderBy(desc(leads.updatedAt)),
      db.select({ scope: commissionRules.scope, entityId: commissionRules.entityId, amountCents: commissionRules.amountCents }).from(commissionRules),
      db.select({ id: commissions.id, leadId: commissions.leadId, partnerId: commissions.partnerId, amountCents: commissions.amountCents, status: commissions.status, accruedAt: commissions.accruedAt, invoicedAt: commissions.invoicedAt, paidAt: commissions.paidAt }).from(commissions).orderBy(desc(commissions.accruedAt)),
      db.select({ id: partners.id, name: partners.name }).from(partners),
    ]);
    data = { promotionsRows, leadRows, terms, commissionRows, partnerNames: new Map(partnerRows.map((partner) => [partner.id, partner.name])) };
  }

  const promotionTerms = new Map(data.terms.filter((term) => term.scope === "PROMOTION").map((term) => [term.entityId, term.amountCents]));
  const leadSnapshots = new Map(data.terms.filter((term) => term.scope === "LEAD").map((term) => [term.entityId, term.amountCents]));
  const feedback = queryValue(query, "commissionRule") || queryValue(query, "commissionStatus");
  const accrued = data.commissionRows.filter((item) => item.status === "ACCRUED").reduce((sum, item) => sum + item.amountCents, 0);
  const invoiced = data.commissionRows.filter((item) => item.status === "INVOICED").reduce((sum, item) => sum + item.amountCents, 0);
  const paid = data.commissionRows.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <main className="ceo-server-page" data-pr26-commission-center="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand"><span>🚙</span><div><strong>ECCOMI</strong><small>NOLEGGIO</small></div></div>
        <a href="/ceo">← Dashboard ECCOMI</a>
      </header>

      <section className="ceo-server-heading">
        <small>{preview ? "PR26 · PREVIEW SICURA · NESSUNA SCRITTURA REALE" : "ECCOMI · CONTROLLO ECONOMICO"}</small>
        <h1>Provvigioni ECCOMI</h1>
        <p>ECCOMI definisce il compenso durante la validazione dell'offerta. La pratica lo eredita e lo congela. <strong>Contratto acquisito = provvigione maturata.</strong></p>
      </section>

      {feedback ? <div className="ceo-server-result"><strong>OPERAZIONE COMPLETATA</strong><div>Provvigioni aggiornate.</div></div> : null}

      <section className="ceo-server-kpis" aria-label="Riepilogo provvigioni ECCOMI">
        <article><small>MATURATE</small><strong>{money(accrued)}</strong><span>crediti ECCOMI da fatturare</span></article>
        <article><small>FATTURATE</small><strong>{money(invoiced)}</strong><span>da incassare</span></article>
        <article><small>PAGATE</small><strong>{money(paid)}</strong><span>incassate</span></article>
      </section>

      {preview ? (
        <section className="ceo-server-panel" id="collaudo">
          <article className="ceo-server-promotion">
            <div className="ceo-server-promotion__vehicle"><small>COLLAUDO PR26</small><strong>OFFERTA → PRATICA → CONTRATTO</strong><em className="ceo-server-status ceo-server-status--online">SAFE</em></div>
            <div className="ceo-server-promotion__copy">
              <small>FIAT DUCATO 3 · 4022223739</small>
              <h2>Provvigione ECCOMI: {money(45000)}</h2>
              <p>Impostata da ECCOMI in validazione. La pratica nasce con snapshot €450,00; modifiche future all'offerta non cambiano la pratica già creata.</p>
            </div>
            <div className="ceo-server-promotion__actions"><a className="ceo-server-primary" href="/ceo/commissions/pr26-idempotenza">SIMULA CONTRATTO DOPPIO CLICK</a></div>
          </article>
        </section>
      ) : null}

      <section className="partner-detail-stack">
        <article className="partner-detail-section" id="offerte">
          <div className="partner-detail-section__head"><div><h2>01 · Provvigione per offerta</h2><p>Definita da CEO oppure Responsabile/Referente ECCOMI abilitato. Il Partner non può modificarla.</p></div></div>
          <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Offerta</th><th>Partner</th><th>Stato</th><th>Provvigione ECCOMI</th><th>Gestione</th></tr></thead><tbody>
            {data.promotionsRows.map((promotion) => {
              const current = promotionTerms.get(promotion.id) ?? null;
              return <tr key={promotion.id}>
                <td><strong>{promotion.offerNumber}</strong><br /><small>{promotion.brand} {promotion.model}</small></td>
                <td>{data.partnerNames.get(promotion.partnerId) || promotion.partnerId}</td>
                <td>{statusLabel(promotion.status)}</td>
                <td><strong>{current === null ? "DA DEFINIRE" : money(current)}</strong></td>
                <td>
                  <form method="post" action="/api/ceo/commissions/rule-form" style={{ display: "flex", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
                    <input type="hidden" name="promotionId" value={promotion.id} />
                    <input type="hidden" name="returnTo" value="/ceo/commissions#offerte" />
                    <label style={{ display: "grid", gap: 6, minWidth: 150 }}>
                      <span>€ a contratto</span>
                      <input name="amount" type="number" min="0" step="0.01" defaultValue={amountValue(current)} placeholder="Es. 450,00" disabled={preview || !canSet} />
                    </label>
                    <button type="submit" disabled={preview || !canSet}>Salva provvigione</button>
                  </form>
                  {!canSet ? <small>Permesso economico non abilitato.</small> : null}
                </td>
              </tr>;
            })}
          </tbody></table></div>
        </article>

        <article className="partner-detail-section" id="pratiche">
          <div className="partner-detail-section__head"><div><h2>02 · Importo congelato nelle pratiche</h2><p>Ogni nuova pratica conserva la provvigione presente sull'offerta al momento della sua nascita.</p></div></div>
          <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Pratica</th><th>Partner</th><th>Stato</th><th>Snapshot ECCOMI</th></tr></thead><tbody>
            {data.leadRows.map((lead) => {
              const snapshot = leadSnapshots.get(lead.id) ?? null;
              return <tr key={lead.id}><td><strong>{lead.id}</strong><br /><small>{lead.firstName} {lead.lastName}</small></td><td>{data.partnerNames.get(lead.partnerId) || lead.partnerId}</td><td>{statusLabel(lead.status)}</td><td><strong>{snapshot === null ? "LEGACY · DA ALLINEARE" : money(snapshot)}</strong></td></tr>;
            })}
          </tbody></table></div>
        </article>

        <article className="partner-detail-section" id="crediti">
          <div className="partner-detail-section__head"><div><h2>03 · Crediti ECCOMI</h2><p>Nascono una sola volta quando la pratica passa a Contratto acquisito.</p></div></div>
          <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Pratica</th><th>Partner</th><th>Importo</th><th>Stato</th><th>Maturata</th><th>Azioni CEO</th></tr></thead><tbody>
            {data.commissionRows.length ? data.commissionRows.map((commission) => <tr key={commission.id}>
              <td>{commission.leadId}</td><td>{data.partnerNames.get(commission.partnerId) || commission.partnerId}</td><td><strong>{money(commission.amountCents)}</strong></td><td>{statusLabel(commission.status)}</td><td>{shortDate(commission.accruedAt)}</td><td>
                {actor.role === "CEO" && commission.status === "ACCRUED" ? <form method="post" action={`/api/ceo/commissions/${commission.id}/status-form`}><input type="hidden" name="status" value="INVOICED" /><input type="hidden" name="returnTo" value="/ceo/commissions#crediti" /><button type="submit" disabled={preview}>Segna fatturata</button></form> : null}
                {actor.role === "CEO" && commission.status === "INVOICED" ? <form method="post" action={`/api/ceo/commissions/${commission.id}/status-form`}><input type="hidden" name="status" value="PAID" /><input type="hidden" name="returnTo" value="/ceo/commissions#crediti" /><button type="submit" disabled={preview}>Segna pagata</button></form> : null}
              </td>
            </tr>) : <tr><td colSpan={6}>Nessuna provvigione maturata.</td></tr>}
          </tbody></table></div>
        </article>
      </section>
    </main>
  );
}
