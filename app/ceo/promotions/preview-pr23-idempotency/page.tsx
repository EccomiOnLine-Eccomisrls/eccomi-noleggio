import ConcurrencyDemo from "./concurrency-demo";
import { currentRequest } from "../../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../../lib/server/preview-mode";
import "../../ceo-server.css";

export default async function Pr23IdempotencyPreview() {
  const request = await currentRequest("/ceo/promotions/preview-pr23-idempotency");
  const preview = isRenderPullRequestPreview(request);

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
    <main className="ceo-server-page">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <span>PR23 · PREVIEW SICURA</span>
      </header>

      <section className="ceo-server-heading">
        <small>HOTFIX ANTI-DUPLICATI SHOPIFY</small>
        <h1>Una sola bozza, anche con più richieste</h1>
        <p>Il backend assegna un claim atomico alla prima richiesta. Le altre aspettano e riutilizzano il risultato invece di creare prodotti duplicati.</p>
      </section>

      <ConcurrencyDemo />
    </main>
  );
}
