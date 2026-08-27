/* eslint-disable @next/next/no-html-link-for-pages -- Preview uses native forms for iPad compatibility. */
import { currentRequest } from "../../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../../lib/server/preview-mode";
import "../../ceo-server.css";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function Pr21ShopifyPreparationPreview({ searchParams }: PageProps) {
  const request = await currentRequest("/ceo/promotions/preview-pr21-shopify");
  const preview = isRenderPullRequestPreview(request);
  const query = await searchParams;
  const prepared = queryValue(query, "prepared");
  const prepareError = queryValue(query, "prepareError");

  if (!preview) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Preview non disponibile</h1>
          <p>Questa pagina esiste solo nelle preview Render delle pull request.</p>
          <a className="ceo-server-primary" href="/ceo">Dashboard CEO</a>
        </section>
      </main>
    );
  }

  return (
    <main className="ceo-server-page" data-pr21-shopify-preview="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/partner/pr21-practices-demo">← Area Partner demo</a>
      </header>

      <section className="ceo-server-heading">
        <small>PR21 · PREVIEW SICURA · SOLO CEO</small>
        <h1>Modifica offerta</h1>
        <p>Scenario dedicato al recupero di una quotazione in verifica ECCOMI senza prodotto Shopify. Nessuna scrittura reale è consentita.</p>
      </section>

      <div className="ceo-server-editor">
        <div className="ceo-server-editor__summary">
          <small>OFFERTA 4022223739 · DEMO</small>
          <strong>FIAT Ducato 3 DUCATO 33 L2H2 140CV 2.2</strong>
          <span>Stato: PENDING_APPROVAL · Scadenza: 15/09/2026</span>
        </div>

        {prepared ? (
          <div className="ceo-server-result">
            <strong>SIMULAZIONE PREPARAZIONE COMPLETATA</strong>
            <div>Nessuna scrittura su Supabase o Shopify. In produzione la bozza resterebbe invisibile al pubblico fino all’approvazione ECCOMI.</div>
          </div>
        ) : null}
        {prepareError ? <div className="ceo-server-result--error">{prepareError}</div> : null}

        <section>
          <fieldset>
            <legend>01 · Veicolo</legend>
            <div className="ceo-server-fields">
              <label><span>Marca</span><input defaultValue="FIAT" readOnly /></label>
              <label><span>Modello</span><input defaultValue="Ducato 3" readOnly /></label>
              <label className="ceo-server-wide"><span>Versione</span><input defaultValue="DUCATO 33 L2H2 140CV 2.2" readOnly /></label>
              <label><span>Alimentazione</span><input defaultValue="Diesel" readOnly /></label>
              <label><span>Cambio</span><input defaultValue="Manuale" readOnly /></label>
              <label><span>Colore</span><input defaultValue="549 BIANCO DUCATO PASTELL" readOnly /></label>
              <label><span>Noleggiatore</span><input defaultValue="Leasys Italia S.p.A." readOnly /></label>
            </div>
          </fieldset>
        </section>

        <section>
          <fieldset>
            <legend>02 · Condizioni economiche</legend>
            <div className="ceo-server-fields ceo-server-fields--four">
              <label><span>Canone €/mese</span><input defaultValue="624,77" readOnly /></label>
              <label><span>Anticipo €</span><input defaultValue="0,00" readOnly /></label>
              <label><span>Durata mesi</span><input defaultValue="48" readOnly /></label>
              <label><span>Km totali</span><input defaultValue="60000" readOnly /></label>
              <label className="ceo-server-wide"><span>Consegna</span><input defaultValue="Entro 12 settimane dalla formale conferma di accettazione della richiesta" readOnly /></label>
            </div>
          </fieldset>
        </section>

        <section>
          <fieldset>
            <legend>03 · Durata promozione</legend>
            <div className="ceo-server-expiry">
              <label><span>Scadenza</span><input value="2026-09-15" readOnly /></label>
            </div>
          </fieldset>
        </section>

        <div className="ceo-server-shopify">
          <strong>PRODOTTO SHOPIFY</strong>
          <code>Prodotto non ancora creato</code>
        </div>

        <section style={{ marginTop: 16 }}>
          <div className="ceo-server-result">
            <strong>AZIONE DI RECUPERO</strong>
            <div>Questa azione prepara soltanto la bozza Shopify. Non approva e non pubblica l’offerta.</div>
          </div>
          <form method="post" action="/api/promotions/preview-pr21-shopify/prepare-form">
            <input type="hidden" name="returnTo" value="/ceo/promotions/preview-pr21-shopify" />
            <div className="ceo-server-actions">
              <a className="ceo-server-secondary" href="/partner/pr21-practices-demo">Annulla</a>
              <button className="ceo-server-primary" type="submit">SIMULA PREPARA BOZZA SHOPIFY</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
