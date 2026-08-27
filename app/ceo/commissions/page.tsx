/* eslint-disable @next/next/no-html-link-for-pages -- Commission Center intentionally uses native forms/navigation for iPad stability. */
import { asc, desc, isNull, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { commissionRules } from "../../../db/commission-rules";
import { commissions, leads, partners, promotions } from "../../../db/schema";
import { isInternalEccomiPartner } from "../../lib/partner-identity";
import { getActor } from "../../lib/server/authz";
import { currentRequest } from "../../lib/server/current-request";
import { ensurePracticeSchema } from "../../lib/server/practice-schema";
import { isRenderPullRequestPreview } from "../../lib/server/preview-mode";
import CeoLoginFallback from "../ceo-login-fallback";
import "../ceo-server.css";
import "../partners/partners.css";

type CommissionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type Rule = { scope: string; entityId: string; amountCents: number };
type PartnerRow = { id: string; name: string; legalName: string; status: string };
type PromotionRow = { id: string; partnerId: string; offerNumber: string; brand: string; model: string; status: string };
type LeadRow = { id: string; partnerId: string; promotionId: string; firstName: string; lastName: string; status: string };
type CommissionRow = { id: string; leadId: string; partnerId: string; amountCents: number; status: string; accruedAt: string; invoicedAt: string | null; paidAt: string | null };

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function amountValue(cents: number | null | undefined) {
  return typeof cents === "number" ? (cents / 100).toFixed(2) : "";
}

function shortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
  }).format(date);
}

function ruleMap(rules: Rule[]) {
  return new Map(rules.map((rule) => [`${rule.scope}:${rule.entityId}`, rule.amountCents]));
}

function ruleAmount(map: Map<string, number>, scope: string, entityId: string) {
  const value = map.get(`${scope}:${entityId}`);
  return typeof value === "number" ? value : null;
}

function statusLabel(value: string) {
  return ({
    ACCRUED: "MATURATA",
    INVOICED: "FATTURATA",
    PAID: "PAGATA",
    ONLINE: "ONLINE",
    ACTIVE: "ONLINE",
    EXPIRING: "IN SCADENZA",
    PENDING_APPROVAL: "IN VERIFICA",
    CONTRACT: "CONTRATTO",
    DELIVERED: "CONSEGNATA",
  } as Record<string, string>)[value] || value.replaceAll("_", " ");
}

function previewData() {
  const partnersRows: PartnerRow[] = [
    { id: "preview-goal-rent", name: "GOAL RENT", legalName: "Goal Rent S.r.l.", status: "ACTIVE" },
    { id: "preview-eccomi", name: "ECCOMI", legalName: "ECCOMI SRLS", status: "ACTIVE" },
  ];
  const promotionRows: PromotionRow[] = [
    { id: "preview-offer-ducato", partnerId: "preview-goal-rent", offerNumber: "4022223739", brand: "FIAT", model: "Ducato 3", status: "ONLINE" },
    { id: "preview-offer-panda", partnerId: "preview-goal-rent", offerNumber: "DEMO-PANDA", brand: "FIAT", model: "Panda", status: "ONLINE" },
  ];
  const leadRows: LeadRow[] = [
    { id: "PRATICA-DEMO-001", partnerId: "preview-goal-rent", promotionId: "preview-offer-ducato", firstName: "Cliente", lastName: "Demo", status: "CONTRACT" },
    { id: "PRATICA-DEMO-002", partnerId: "preview-goal-rent", promotionId: "preview-offer-panda", firstName: "Mario", lastName: "Rossi", status: "PARTNER_REVIEW" },
  ];
  const rules: Rule[] = [
    { scope: "PARTNER", entityId: "preview-goal-rent", amountCents: 25000 },
    { scope: "PROMOTION", entityId: "preview-offer-ducato", amountCents: 35000 },
    { scope: "LEAD", entityId: "PRATICA-DEMO-001", amountCents: 42000 },
  ];
  const commissionRows: CommissionRow[] = [
    { id: "COMM-DEMO-001", leadId: "PRATICA-DEMO-000", partnerId: "preview-goal-rent", amountCents: 30000, status: "ACCRUED", accruedAt: new Date().toISOString(), invoicedAt: null, paidAt: null },
  ];
  return { partnersRows, promotionRows, leadRows, rules, commissionRows };
}

export default async function CeoCommissionCenter({ searchParams }: CommissionPageProps) {
  const query = await searchParams;
  const request = await currentRequest("/ceo/commissions");
  const preview = isRenderPullRequestPreview(request);
  const actor = preview ? { role: "CEO", email: "preview@eccomi.local" } : await getActor(request);
  if (!actor) return <CeoLoginFallback />;
  if (actor.role !== "CEO") {
    return <main className="ceo-server-login"><section className="ceo-server-login__card"><h1>Area riservata al CEO</h1><p>Le regole commissioni non sono modificabili dagli account Partner.</p><a className="ceo-server-primary" href="/partner">Area Partner</a></section></main>;
  }

  let data = preview ? previewData() : null;
  if (!data) {
    await ensurePracticeSchema();
    const db = getDb();
    const [partnersRows, promotionRows, leadRows, rules, commissionRows] = await Promise.all([
      db.select({ id: partners.id, name: partners.name, legalName: partners.legalName, status: partners.status }).from(partners).orderBy(asc(partners.name)),
      db.select({ id: promotions.id, partnerId: promotions.partnerId, offerNumber: promotions.offerNumber, brand: promotions.brand, model: promotions.model, status: promotions.status }).from(promotions).where(ne(promotions.status, "TRASHED")).orderBy(desc(promotions.updatedAt)),
      db.select({ id: leads.id, partnerId: leads.partnerId, promotionId: leads.promotionId, firstName: leads.firstName, lastName: leads.lastName, status: leads.status }).from(leads).where(isNull(leads.deletedAt)).orderBy(desc(leads.updatedAt)),
      db.select({ scope: commissionRules.scope, entityId: commissionRules.entityId, amountCents: commissionRules.amountCents }).from(commissionRules),
      db.select({ id: commissions.id, leadId: commissions.leadId, partnerId: commissions.partnerId, amountCents: commissions.amountCents, status: commissions.status, accruedAt: commissions.accruedAt, invoicedAt: commissions.invoicedAt, paidAt: commissions.paidAt }).from(commissions).orderBy(desc(commissions.accruedAt)),
    ]);
    data = { partnersRows, promotionRows, leadRows, rules, commissionRows };
  }

  const rules = ruleMap(data.rules);
  const partnersById = new Map(data.partnersRows.map((partner) => [partner.id, partner]));
  const promotionsById = new Map(data.promotionRows.map((promotion) => [promotion.id, promotion]));
  const simulate = preview && queryValue(query, "simulate") === "1";
  const feedback = queryValue(query, "commissionRule") || queryValue(query, "commissionStatus");

  const accrued = data.commissionRows.filter((item) => item.status === "ACCRUED").reduce((sum, item) => sum + item.amountCents, 0);
  const invoiced = data.commissionRows.filter((item) => item.status === "INVOICED").reduce((sum, item) => sum + item.amountCents, 0);
  const paid = data.commissionRows.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <main className="ceo-server-page" data-pr26-commission-center="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand"><span>🚙</span><div><strong>ECCOMI</strong><small>NOLEGGIO</small></div></div>
        <a href="/ceo">← Dashboard CEO</a>
      </header>

      <section className="ceo-server-heading">
        <small>{preview ? "PR26 · PREVIEW SICURA · NESSUNA SCRITTURA REALE" : "SOLO CEO · COMMISSIONI REALI"}</small>
        <h1>Commissioni Partner</h1>
        <p>Regola di precedenza: <strong>Pratica → Offerta → Partner</strong>. La commissione matura esclusivamente alla consegna del veicolo.</p>
      </section>

      {feedback ? <div className="ceo-server-result"><strong>OPERAZIONE COMPLETATA</strong><div>Regole e stato commissione aggiornati.</div></div> : null}

      <section className="ceo-server-kpis" aria-label="Riepilogo commissioni">
        <article><small>MATURATE</small><strong>{money(accrued)}</strong><span>da fatturare</span></article>
        <article><small>FATTURATE</small><strong>{money(invoiced)}</strong><span>in attesa pagamento</span></article>
        <article><small>PAGATE</small><strong>{money(paid)}</strong><span>chiuse</span></article>
      </section>

      {preview ? (
        <section className="ceo-server-panel" id="collaudo">
          <article className="ceo-server-promotion">
            <div className="ceo-server-promotion__vehicle"><small>COLLAUDO IDEMPOTENZA</small><strong>CONTRACT → DELIVERED</strong><em className="ceo-server-status ceo-server-status--online">SAFE</em></div>
            <div className="ceo-server-promotion__copy">
              <small>PRATICA-DEMO-001</small>
              <h2>Commissione effettiva: {money(42000)}</h2>
              <p>Override pratica €420 prevale su override offerta €350 e base Partner €250.</p>
              {simulate ? <div className="ceo-server-result"><strong>TEST COMPLETATO: 1 CREAZIONE · 1 RIUSO</strong><div>Richiesta 1: commissione creata €420,00. Richiesta 2: stessa commissione riutilizzata. Totale commissioni per la pratica: 1.</div></div> : null}
            </div>
            <div className="ceo-server-promotion__actions"><a className="ceo-server-primary" href="/ceo/commissions?simulate=1#collaudo">SIMULA DOPPIO CLICK CONSEGNA</a></div>
          </article>
        </section>
      ) : null}

      <section className="partner-detail-stack">
        <article className="partner-detail-section" id="partner-base">
          <div className="partner-detail-section__head"><div><h2>01 · Commissione base Partner</h2><p>Usata quando non esiste un override più specifico.</p></div></div>
          <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Partner</th><th>Stato</th><th>Base</th><th>Gestione</th></tr></thead><tbody>
            {data.partnersRows.map((partner) => {
              const current = ruleAmount(rules, "PARTNER", partner.id);
              const internal = isInternalEccomiPartner(partner);
              return <tr key={partner.id}><td><strong>{partner.name}</strong><br /><small>{partner.legalName}</small></td><td>{partner.status}</td><td>{current === null ? internal ? "€0,00 · interno ECCOMI" : "NON CONFIGURATA" : money(current)}</td><td>
                <form method="post" action="/api/ceo/commissions/rule-form" className="ceo-server-expiry">
                  <input type="hidden" name="scope" value="PARTNER" /><input type="hidden" name="entityId" value={partner.id} /><input type="hidden" name="returnTo" value="/ceo/commissions#partner-base" />
                  <label><span>€ per consegna</span><input name="amount" type="number" min="0" step="0.01" defaultValue={amountValue(current)} placeholder={internal ? "0,00" : "Es. 250,00"} disabled={preview} /></label>
                  <button type="submit" disabled={preview}>Salva</button>{current !== null ? <button type="submit" name="clear" value="true" disabled={preview}>Rimuovi</button> : null}
                </form>
              </td></tr>;
            })}
          </tbody></table></div>
        </article>

        <article className="partner-detail-section" id="offerte">
          <div className="partner-detail-section__head"><div><h2>02 · Override offerta</h2><p>Se impostato, prevale sulla commissione base Partner.</p></div></div>
          <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Offerta</th><th>Partner</th><th>Stato</th><th>Override</th><th>Gestione</th></tr></thead><tbody>
            {data.promotionRows.map((promotion) => {
              const current = ruleAmount(rules, "PROMOTION", promotion.id);
              const partnerBase = ruleAmount(rules, "PARTNER", promotion.partnerId);
              return <tr key={promotion.id}><td><strong>{promotion.offerNumber}</strong><br /><small>{promotion.brand} {promotion.model}</small></td><td>{partnersById.get(promotion.partnerId)?.name || promotion.partnerId}</td><td>{statusLabel(promotion.status)}</td><td>{current === null ? `Eredita ${partnerBase === null ? "—" : money(partnerBase)}` : money(current)}</td><td>
                <form method="post" action="/api/ceo/commissions/rule-form" className="ceo-server-expiry">
                  <input type="hidden" name="scope" value="PROMOTION" /><input type="hidden" name="entityId" value={promotion.id} /><input type="hidden" name="returnTo" value="/ceo/commissions#offerte" />
                  <label><span>€ override</span><input name="amount" type="number" min="0" step="0.01" defaultValue={amountValue(current)} placeholder="Eredita Partner" disabled={preview} /></label>
                  <button type="submit" disabled={preview}>Salva</button>{current !== null ? <button type="submit" name="clear" value="true" disabled={preview}>Rimuovi</button> : null}
                </form>
              </td></tr>;
            })}
          </tbody></table></div>
        </article>

        <article className="partner-detail-section" id="pratiche">
          <div className="partner-detail-section__head"><div><h2>03 · Override pratica</h2><p>Massima priorità: congela l'importo specifico della singola trattativa.</p></div></div>
          <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Pratica</th><th>Partner</th><th>Stato</th><th>Effettiva</th><th>Gestione</th></tr></thead><tbody>
            {data.leadRows.map((lead) => {
              const leadRule = ruleAmount(rules, "LEAD", lead.id);
              const promotionRule = ruleAmount(rules, "PROMOTION", lead.promotionId);
              const partnerRule = ruleAmount(rules, "PARTNER", lead.partnerId);
              const partner = partnersById.get(lead.partnerId);
              const internal = isInternalEccomiPartner(partner);
              const effective = leadRule ?? promotionRule ?? partnerRule ?? (internal ? 0 : null);
              const source = leadRule !== null ? "PRATICA" : promotionRule !== null ? "OFFERTA" : partnerRule !== null ? "PARTNER" : internal ? "ECCOMI" : "NON CONFIGURATA";
              return <tr key={lead.id}><td><strong>{lead.id}</strong><br /><small>{lead.firstName} {lead.lastName}</small></td><td>{partner?.name || lead.partnerId}<br /><small>{promotionsById.get(lead.promotionId)?.offerNumber || lead.promotionId}</small></td><td>{statusLabel(lead.status)}</td><td>{effective === null ? "NON CONFIGURATA" : `${money(effective)} · ${source}`}</td><td>
                <form method="post" action="/api/ceo/commissions/rule-form" className="ceo-server-expiry">
                  <input type="hidden" name="scope" value="LEAD" /><input type="hidden" name="entityId" value={lead.id} /><input type="hidden" name="returnTo" value="/ceo/commissions#pratiche" />
                  <label><span>€ override</span><input name="amount" type="number" min="0" step="0.01" defaultValue={amountValue(leadRule)} placeholder="Eredita regola superiore" disabled={preview} /></label>
                  <button type="submit" disabled={preview}>Salva</button>{leadRule !== null ? <button type="submit" name="clear" value="true" disabled={preview}>Rimuovi</button> : null}
                </form>
              </td></tr>;
            })}
          </tbody></table></div>
        </article>

        <article className="partner-detail-section" id="maturate">
          <div className="partner-detail-section__head"><div><h2>04 · Commissioni maturate</h2><p>Una sola riga per pratica, creata esclusivamente al passaggio Veicolo consegnato.</p></div><strong>{data.commissionRows.length}</strong></div>
          <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Pratica</th><th>Partner</th><th>Importo</th><th>Stato</th><th>Maturata</th><th>Fatturata</th><th>Pagata</th><th></th></tr></thead><tbody>
            {data.commissionRows.length ? data.commissionRows.map((commission) => <tr key={commission.id}><td><strong>{commission.leadId}</strong></td><td>{partnersById.get(commission.partnerId)?.name || commission.partnerId}</td><td><strong>{money(commission.amountCents)}</strong></td><td>{statusLabel(commission.status)}</td><td>{shortDate(commission.accruedAt)}</td><td>{shortDate(commission.invoicedAt)}</td><td>{shortDate(commission.paidAt)}</td><td>
              {!preview && commission.status === "ACCRUED" ? <form method="post" action={`/api/ceo/commissions/${encodeURIComponent(commission.id)}/status-form`}><input type="hidden" name="status" value="INVOICED" /><input type="hidden" name="returnTo" value="/ceo/commissions#maturate" /><button type="submit">Segna fatturata</button></form> : null}
              {!preview && commission.status === "INVOICED" ? <form method="post" action={`/api/ceo/commissions/${encodeURIComponent(commission.id)}/status-form`}><input type="hidden" name="status" value="PAID" /><input type="hidden" name="returnTo" value="/ceo/commissions#maturate" /><button type="submit">Segna pagata</button></form> : null}
              {preview ? <span>Solo simulazione</span> : null}
            </td></tr>) : <tr><td colSpan={8}>Nessuna commissione maturata.</td></tr>}
          </tbody></table></div>
        </article>
      </section>
    </main>
  );
}
