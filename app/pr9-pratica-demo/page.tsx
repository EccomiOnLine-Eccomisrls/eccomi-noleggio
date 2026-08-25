/* eslint-disable @next/next/no-html-link-for-pages -- Preview iPad uses native navigation intentionally. */
import "../ceo/ceo-server.css";
import "../ceo/partners/partners.css";
import "../ceo/partners/final-touches.css";
import "./preview-practice-actions.css";

export default function Pr9PracticeDemoPage() {
  return (
    <main className="ceo-server-page" data-pr9-demo-ready="true" data-pr9-server-only="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo/partners/preview-mobility-one#pratiche">← Scheda partner</a>
      </header>

      <section className="ceo-server-heading partner-heading practice-ceo-heading">
        <div>
          <small>PREVIEW SICURA · PR9 · SERVER-ONLY</small>
          <h1 className="practice-ceo-title">Cliente Demo · PEUGEOT 3008</h1>
          <p className="practice-ceo-id">Pratica #PRATICA-PREVIEW-MOBILITY-ONE-001</p>
          <p className="practice-ceo-context">MOBILITY ONE · In lavorazione partner</p>
        </div>
        <span className="partner-sla partner-sla--large partner-sla--late">🔴 30h · SLA PARTNER SCADUTO</span>
      </section>

      <section className="practice-ceo-actions" aria-label="Azioni rapide pratica">
        <a href="/ceo/partners/preview-mobility-one">Apri partner</a>
        <a href="/ceo/promotions/preview-promo-1?partner=preview-mobility-one">Apri offerta</a>
        <a href="mailto:cliente.preview@eccomi.local">Email cliente</a>
        <a href="tel:+393330000000">Chiama cliente</a>
      </section>

      <section className="ceo-practice-control" data-ceo-practice-control="true" data-preview-controller="server-only">
        <div className="ceo-practice-control__head">
          <div>
            <small>GESTIONE PRATICA CEO</small>
            <h2>Azioni operative</h2>
            <p>Test diagnostico PR9: questa versione non carica JavaScript client. Serve a verificare la stabilità della preview Render su iPad.</p>
          </div>
          <span className="is-preview">SERVER-SAFE · ZERO JS</span>
        </div>

        <div className="ceo-practice-control__grid">
          <article>
            <h3>Avanzamento</h3>
            <p>Stato corrente: <strong>IN LAVORAZIONE PARTNER</strong></p>
            <div className="ceo-practice-control__buttons">
              <span className="ceo-server-primary">Preventivo predisposto</span>
              <span className="ceo-server-secondary">Richiedi integrazione</span>
              <span className="ceo-server-danger">Archivia pratica</span>
            </div>
          </article>

          <article>
            <h3>Priorità e responsabile</h3>
            <label>Priorità<select defaultValue="NORMAL" disabled><option value="LOW">Bassa</option><option value="NORMAL">Normale</option><option value="HIGH">Alta / urgente</option></select></label>
            <label>Responsabile interno<input value="" readOnly placeholder="Nome o email operatore" /></label>
            <span className="ceo-server-secondary">Assegna / riassegna</span>
          </article>

          <article>
            <h3>Nota operativa</h3>
            <label>Nota / istruzioni<textarea value="" readOnly placeholder="Es. cliente richiamato, documento mancante…" /></label>
            <span className="ceo-server-secondary">Salva nota</span>
          </article>

          <article>
            <h3>Partner</h3>
            <label>Email partner<input type="email" value="mobility.preview@eccomi.local" readOnly /></label>
            <span className="ceo-server-primary">Invia al partner</span>
          </article>
        </div>

        <details className="ceo-practice-control__danger">
          <summary>Azioni amministrative / cestino</summary>
          <p>Il cestino verrà collegato server-side dopo il test di stabilità.</p>
          <label>Motivo<input value="" readOnly placeholder="Es. pratica duplicata / test" /></label>
          <span className="ceo-server-danger">Sposta pratica nel cestino</span>
        </details>

        <div className="ceo-practice-control__feedback" role="status">PREVIEW · Nessuna hydration React. Nessun dato reale modificato.</div>
      </section>

      <section className="partner-detail-stack">
        <article className="partner-detail-section">
          <div className="partner-detail-section__head">
            <div><h2>Stato pratica</h2><p>Riepilogo operativo e tempi della richiesta.</p></div>
            <span className="partner-pill partner-pill--active">In lavorazione partner</span>
          </div>
          <div className="partner-detail-grid">
            <div><small>Cliente</small><strong>Cliente Demo</strong></div>
            <div><small>Stato</small><strong>In lavorazione partner</strong></div>
            <div><small>Documenti</small><strong>Completi</strong></div>
            <div><small>Ultimo aggiornamento</small><strong>24 ago 2026, 12:52</strong></div>
            <div><small>Creata</small><strong>22 ago 2026, 18:52</strong></div>
            <div><small>Inviata al partner</small><strong>23 ago 2026, 06:52</strong></div>
            <div><small>Conclusa</small><strong>—</strong></div>
            <div><small>SLA · Lavorazione partner</small><strong>30 ore · fuori SLA PARTNER (limite 24h)</strong></div>
          </div>
        </article>

        <article className="partner-detail-section">
          <div className="partner-detail-section__head"><div><h2>Cliente</h2><p>Contatti essenziali della pratica.</p></div></div>
          <div className="partner-detail-grid">
            <div><small>Email</small><strong>cliente.preview@eccomi.local</strong></div>
            <div><small>Telefono</small><strong>+39 333 0000000</strong></div>
            <div><small>Provincia</small><strong>RM</strong></div>
            <div><small>Tipo cliente</small><strong>Privato</strong></div>
          </div>
        </article>

        <article className="partner-detail-section">
          <div className="partner-detail-section__head"><div><h2>Partner e offerta</h2><p>Collegamenti commerciali della pratica.</p></div></div>
          <div className="partner-detail-grid">
            <div><small>Partner</small><strong>MOBILITY ONE</strong></div>
            <div><small>Referente</small><strong>Laura Bianchi</strong></div>
            <div><small>Offerta</small><strong>PREVIEW-3008</strong></div>
            <div><small>Veicolo</small><strong>PEUGEOT 3008</strong></div>
            <div className="partner-detail-grid__wide"><small>Versione</small><strong>Hybrid 145 Allure Business</strong></div>
          </div>
        </article>
      </section>
    </main>
  );
}
