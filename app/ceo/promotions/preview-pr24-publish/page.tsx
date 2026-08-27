/* eslint-disable @next/next/no-html-link-for-pages -- Dedicated PR preview uses native navigation. */
import "../../ceo-server.css";

type PreviewProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function Pr24PublishPreview({ searchParams }: PreviewProps) {
  const query = await searchParams;
  const published = queryValue(query, "published") === "1";

  return (
    <main className="ceo-server-page" data-pr24-publish-preview="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <span>PR24 · PREVIEW SICURA</span>
      </header>

      <section className="ceo-server-heading">
        <small>PUBBLICAZIONE SERVER-SIDE · NESSUNA SCRITTURA REALE</small>
        <h1>Conferma pubblicazione</h1>
        <p>Collaudo del flusso stabile per iPad senza caricare la Dashboard React.</p>
      </section>

      {published ? (
        <div className="ceo-server-result">
          <strong>SIMULAZIONE PUBBLICAZIONE COMPLETATA</strong>
          <div>Nessuna scrittura su Supabase o Shopify. In produzione la stessa azione approverà e pubblicherà l’offerta.</div>
        </div>
      ) : null}

      <section className="ceo-server-panel">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>FIAT</small>
            <strong>Ducato 3</strong>
            <em className="ceo-server-status">PENDING_APPROVAL</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>OFFERTA 4022223739 · DEMO</small>
            <h2>FIAT Ducato 3</h2>
            <p>DUCATO 33 L2H2 140CV 2.2</p>
            <div className="ceo-server-promotion__metrics">
              <span>624,77 €/mese</span>
              <span>48 mesi</span>
              <span>60.000 km</span>
              <span>Scadenza: 15/09/2026</span>
            </div>
          </div>
        </article>
      </section>

      <section className="ceo-server-editor">
        <fieldset>
          <legend>Controllo finale</legend>
          <div className="ceo-server-fields ceo-server-fields--four">
            <label><span>Canone</span><input readOnly value="624,77 €" /></label>
            <label><span>Anticipo</span><input readOnly value="0,00 €" /></label>
            <label><span>Durata</span><input readOnly value="48 mesi" /></label>
            <label><span>Km totali</span><input readOnly value="60.000" /></label>
            <label><span>Alimentazione</span><input readOnly value="Diesel" /></label>
            <label><span>Cambio</span><input readOnly value="Manuale" /></label>
            <label><span>Colore</span><input readOnly value="549 BIANCO DUCATO PASTELL" /></label>
            <label><span>Scadenza</span><input readOnly value="15/09/2026" /></label>
          </div>
        </fieldset>

        <div className="ceo-server-shopify">
          <strong>PRODOTTO SHOPIFY COLLEGATO</strong>
          <code>gid://shopify/Product/15400462942531</code>
        </div>

        <footer className="ceo-server-actions">
          <a className="ceo-server-secondary" href="/ceo/promotions/preview-pr24-publish">Annulla</a>
          <form method="get" action="/ceo/promotions/preview-pr24-publish">
            <input type="hidden" name="published" value="1" />
            <button className="ceo-server-primary" type="submit">SIMULA CONFERMA PUBBLICAZIONE ONLINE</button>
          </form>
        </footer>
      </section>
    </main>
  );
}
