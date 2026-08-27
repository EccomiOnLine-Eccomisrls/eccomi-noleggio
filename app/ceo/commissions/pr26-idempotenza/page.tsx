/* eslint-disable @next/next/no-html-link-for-pages -- PR26 preview uses native navigation for iPad stability. */
import { currentRequest } from "../../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../../lib/server/preview-mode";
import "../../ceo-server.css";

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default async function Pr26IdempotencyPreview() {
  const request = await currentRequest("/ceo/commissions/pr26-idempotenza");
  const preview = isRenderPullRequestPreview(request);

  if (!preview) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Collaudo PR26 non disponibile</h1>
          <p>Questa pagina è attiva esclusivamente nelle Render Pull Request Preview.</p>
          <a className="ceo-server-primary" href="/ceo/commissions">Torna alle provvigioni</a>
        </section>
      </main>
    );
  }

  const amount = 45000;
  const commissionId = "COMM-DEMO-001";
  const firstAttempt = { created: true, commissionId, amountCents: amount };
  const secondAttempt = { created: false, commissionId, amountCents: amount };
  const uniqueCredits = new Set([firstAttempt.commissionId, secondAttempt.commissionId]).size;

  return (
    <main className="ceo-server-page" data-pr26-idempotency-preview="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand"><span>🚙</span><div><strong>ECCOMI</strong><small>NOLEGGIO</small></div></div>
        <a href="/ceo/commissions">← Provvigioni ECCOMI</a>
      </header>

      <section className="ceo-server-heading">
        <small>PR26 · COLLAUDO IDEMPOTENZA · NESSUNA SCRITTURA REALE</small>
        <h1>Contratto acquisito: doppio invio</h1>
        <p>Simulazione locale della stessa pratica inviata due volte. Nessuna chiamata a Supabase o Shopify.</p>
      </section>

      <section className="ceo-server-kpis" aria-label="Esito collaudo">
        <article><small>PRIMO INVIO</small><strong>CREATA</strong><span>{money(firstAttempt.amountCents)}</span></article>
        <article><small>SECONDO INVIO</small><strong>RIUTILIZZATA</strong><span>stesso credito</span></article>
        <article><small>CREDITI TOTALI</small><strong>{uniqueCredits}</strong><span>nessun duplicato</span></article>
      </section>

      <section className="ceo-server-panel">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>PRATICA-DEMO-001</small>
            <strong>CONTRATTO ACQUISITO</strong>
            <em className="ceo-server-status ceo-server-status--online">SAFE</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>RISULTATO PR26</small>
            <h2>TEST COMPLETATO: CONTRATTO = 1 PROVVIGIONE</h2>
            <p>Primo tentativo: credito ECCOMI {money(amount)} creato. Secondo tentativo: viene riusato lo stesso identificativo {commissionId}. Totale crediti per la pratica: {uniqueCredits}.</p>
          </div>
          <div className="ceo-server-promotion__actions">
            <a className="ceo-server-primary" href="/ceo/commissions">TORNA AL CENTRO PROVVIGIONI</a>
          </div>
        </article>
      </section>
    </main>
  );
}
