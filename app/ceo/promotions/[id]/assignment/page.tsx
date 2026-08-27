/* eslint-disable @next/next/no-html-link-for-pages -- Native form/navigation kept for iPad stability. */
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { commissionRules } from "../../../../../db/commission-rules";
import { partners, promotions } from "../../../../../db/schema";
import { getActor } from "../../../../lib/server/authz";
import { currentRequest } from "../../../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import CeoLoginFallback from "../../../ceo-login-fallback";
import "../../../ceo-server.css";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type PartnerOption = { id: string; name: string; legalName: string; status: string };

type AssignmentData = {
  promotion: {
    id: string;
    offerNumber: string;
    brand: string;
    model: string;
    partnerId: string;
    shopifyProductId: string | null;
  };
  currentPartner: PartnerOption;
  partnerOptions: PartnerOption[];
  baseCents: number | null;
  extraCents: number;
};

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function euro(cents: number | null) {
  if (cents === null) return "Non configurata";
  return `${(cents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € + IVA`;
}

function partnerLabel(partner: PartnerOption) {
  return partner.id === "eccomi-direct" ? "ECCOMI DIRETTO" : partner.name;
}

function previewAssignment(id: string): AssignmentData {
  const partnerOptions: PartnerOption[] = [
    { id: "eccomi-direct", name: "ECCOMI", legalName: "ECCOMI SRLS", status: "ACTIVE" },
    { id: "preview-goal-rent", name: "Goal Rent SRL", legalName: "Goal Rent SRL", status: "ACTIVE" },
    { id: "preview-partner-b", name: "Partner B", legalName: "Partner B S.r.l.", status: "ACTIVE" },
  ];
  return {
    promotion: {
      id,
      offerNumber: "4022223739",
      brand: "FIAT",
      model: "Ducato 3",
      partnerId: "preview-goal-rent",
      shopifyProductId: "gid://shopify/Product/15400462942531",
    },
    currentPartner: partnerOptions[1],
    partnerOptions,
    baseCents: 50000,
    extraCents: 15000,
  };
}

async function realAssignment(id: string): Promise<AssignmentData | null> {
  const db = getDb();
  const [promotion] = await db
    .select({
      id: promotions.id,
      offerNumber: promotions.offerNumber,
      brand: promotions.brand,
      model: promotions.model,
      partnerId: promotions.partnerId,
      shopifyProductId: promotions.shopifyProductId,
    })
    .from(promotions)
    .where(eq(promotions.id, id))
    .limit(1);
  if (!promotion) return null;

  const partnerOptions = await db
    .select({ id: partners.id, name: partners.name, legalName: partners.legalName, status: partners.status })
    .from(partners)
    .orderBy(asc(partners.name));
  const currentPartner = partnerOptions.find((partner) => partner.id === promotion.partnerId);
  if (!currentPartner) return null;

  const rules = await db
    .select({ scope: commissionRules.scope, amountCents: commissionRules.amountCents })
    .from(commissionRules)
    .where(eq(commissionRules.entityId, id));
  const baseCents = rules.find((rule) => rule.scope === "PROMOTION")?.amountCents ?? null;
  const extraCents = rules.find((rule) => rule.scope === "PARTNER_INCREMENT")?.amountCents ?? 0;

  return { promotion, currentPartner, partnerOptions, baseCents, extraCents };
}

export default async function CeoPromotionAssignmentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const request = await currentRequest(`/ceo/promotions/${id}/assignment`);
  const preview = isRenderPullRequestPreview(request);

  if (!preview) {
    const actor = await getActor(request);
    if (!actor || actor.role !== "CEO") return <CeoLoginFallback />;
  }

  const data = preview ? previewAssignment(id) : await realAssignment(id);
  if (!data) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Offerta non disponibile</h1>
          <p>Non è stato possibile leggere l’assegnazione dell’offerta.</p>
          <a className="ceo-server-primary" href="/ceo/promotions">Torna alle promozioni</a>
        </section>
      </main>
    );
  }

  const saved = queryValue(query, "saved") === "1";
  const simulated = queryValue(query, "simulated") === "1";
  const error = queryValue(query, "error");
  const from = queryValue(query, "from");
  const to = queryValue(query, "to");
  const extraResetCents = Number(queryValue(query, "extraResetCents") || 0);
  const existingPractices = Number(queryValue(query, "existingPractices") || 0);
  const newlyFrozenPractices = Number(queryValue(query, "newlyFrozenPractices") || 0);
  const activeDestinations = data.partnerOptions.filter((partner) => partner.status === "ACTIVE" && partner.id !== data.currentPartner.id);
  const totalCents = data.baseCents === null ? null : data.baseCents + data.extraCents;

  return (
    <main className="ceo-server-page" data-pr29-assignment="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href={`/ceo/promotions/${encodeURIComponent(id)}`}>← Modifica offerta</a>
      </header>

      <section className="ceo-server-heading">
        <small>{preview ? "PR29 · PREVIEW SICURA · NESSUNA SCRITTURA REALE" : "SOLO CEO · RIASSEGNAZIONE REALE"}</small>
        <h1>Assegnazione offerta</h1>
        <p>Puoi spostare l’offerta tra Partner attivi ed ECCOMI DIRETTO senza duplicare il prodotto Shopify.</p>
      </section>

      <form className="ceo-server-editor" method="post" action={`/api/ceo/promotions/${encodeURIComponent(id)}/reassign-form`}>
        <div className="ceo-server-editor__summary">
          <small>OFFERTA {data.promotion.offerNumber}</small>
          <strong>{data.promotion.brand} {data.promotion.model}</strong>
          <span>Prodotto Shopify invariato: {data.promotion.shopifyProductId || "non ancora creato"}</span>
        </div>

        {(saved || simulated) ? (
          <div className="ceo-server-result">
            <strong>{simulated ? "SIMULAZIONE COMPLETATA" : "RIASSEGNAZIONE COMPLETATA"}</strong>
            <div>{from && to ? `${from} → ${to}` : "Assegnazione aggiornata."}</div>
            <div>Extra Gara precedente azzerato{extraResetCents ? `: ${(extraResetCents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 })} €` : ""}.</div>
            {existingPractices ? <div>Pratiche esistenti lasciate alla vecchia assegnazione: {existingPractices}. Congelate ora: {newlyFrozenPractices}.</div> : null}
            {simulated ? <div>Nessuna scrittura su Supabase o Shopify.</div> : null}
          </div>
        ) : null}
        {error ? <div className="ceo-server-result--error">{error}</div> : null}

        <section>
          <fieldset>
            <legend>01 · Assegnazione attuale</legend>
            <div className="ceo-server-fields ceo-server-fields--four">
              <label><span>Assegnatario</span><input value={partnerLabel(data.currentPartner)} readOnly /></label>
              <label><span>Base ECCOMI</span><input value={euro(data.baseCents)} readOnly /></label>
              <label><span>Extra Gara</span><input value={euro(data.extraCents)} readOnly /></label>
              <label><span>Totale attuale</span><input value={euro(totalCents)} readOnly /></label>
            </div>
          </fieldset>
        </section>

        <section>
          <fieldset>
            <legend>02 · Nuova assegnazione</legend>
            <div className="ceo-server-fields">
              <label className="ceo-server-wide">
                <span>Destinazione</span>
                <select name="partnerId" required defaultValue="" style={{ minHeight: 48, border: "1px solid #cad7e6", borderRadius: 12, padding: "12px 14px", background: "#fff", color: "#142236", font: "inherit" }}>
                  <option value="" disabled>Seleziona destinazione…</option>
                  {activeDestinations.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partnerLabel(partner)}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
        </section>

        <section>
          <fieldset>
            <legend>03 · Cosa succede</legend>
            <div className="ceo-server-shopify" style={{ display: "grid", gap: 8 }}>
              <strong>RIASSEGNAZIONE PROTETTA</strong>
              <span>✓ La Base ECCOMI resta invariata.</span>
              <span>✓ L’Extra Gara del vecchio Partner viene azzerato.</span>
              <span>✓ Le pratiche già nate restano al vecchio Partner e conservano la provvigione maturabile al momento della loro nascita.</span>
              <span>✓ Solo le nuove pratiche seguiranno la nuova assegnazione.</span>
              <span>✓ Shopify non viene duplicato né modificato.</span>
            </div>
          </fieldset>
        </section>

        <footer className="ceo-server-actions">
          <a className="ceo-server-secondary" href={`/ceo/promotions/${encodeURIComponent(id)}`}>Annulla</a>
          <button className="ceo-server-primary" type="submit">
            {preview ? "SIMULA RIASSEGNAZIONE" : "CONFERMA RIASSEGNAZIONE"}
          </button>
        </footer>
      </form>
    </main>
  );
}
