/* eslint-disable @next/next/no-html-link-for-pages -- Preview intentionally uses a native form on iPad. */
import { currentRequest } from "../../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../../lib/server/preview-mode";
import ShopifyPreparationWaiting from "../[id]/shopify-preparation-waiting";
import "../../ceo-server.css";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function Pr22WaitingPreview({ searchParams }: PageProps) {
  const request = await currentRequest("/ceo/promotions/preview-pr22-waiting");
  const preview = isRenderPullRequestPreview(request);
  const query = await searchParams;
  const prepared = queryValue(query, "prepared");

  if (!preview) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Preview non disponibile</h1>
          <p>Questa pagina è disponibile soltanto nelle preview Render.</p>
          <a className="ceo-server-primary" href="/ceo">Dashboard CEO</a>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="ceo-server-page">
        <header className="ceo-server-bar">
          <div className="ceo-server-bar__brand">
            <span>🚙</span>
            <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
          </div>
          <span>PR22 · PREVIEW SICURA</span>
        </header>

        <section className="ceo-server-heading">
          <small>COLLAUDO ATTESA SHOPIFY · NESSUNA SCRITTURA REALE</small>
          <h1>Intrattenimento durante la preparazione</h1>
          <p>Premi il pulsante per provare cosa vedrà il CEO durante i secondi necessari a creare la bozza Shopify.</p>
        </section>

        {prepared ? (
          <div className="ceo-server-result">
            <strong>SIMULAZIONE COMPLETATA</strong>
            <div>Nessuna scrittura su Supabase o Shopify.</div>
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
              <small>OFFERTA DEMO 4022223739</small>
              <h2>FIAT Ducato 3</h2>
              <p>DUCATO 33 L2H2 140CV 2.2</p>
              <div className="ceo-server-promotion__metrics">
                <span>624,77 €/mese</span>
                <span>48 mesi</span>
                <span>60.000 km</span>
                <span>Prodotto Shopify non ancora creato</span>
              </div>
            </div>
          </article>

          <form method="post" action="/api/promotions/preview-pr22-waiting/prepare-form">
            <input type="hidden" name="returnTo" value="/ceo/promotions/preview-pr22-waiting" />
            <div className="ceo-server-actions" style={{ marginTop: 18 }}>
              <button
                className="ceo-server-primary"
                type="submit"
                formMethod="post"
                formAction="/api/promotions/preview-pr22-waiting/prepare-form"
              >
                SIMULA PREPARA BOZZA SHOPIFY
              </button>
            </div>
          </form>
        </section>
      </main>
      <ShopifyPreparationWaiting />
    </>
  );
}
