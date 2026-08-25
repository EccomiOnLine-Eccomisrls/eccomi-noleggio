/* eslint-disable @next/next/no-html-link-for-pages -- Preview iPad uses native navigation intentionally. */
import "../ceo/ceo-server.css";
import "../ceo/partners/partners.css";
import "../ceo/partners/final-touches.css";
import "../pr9-pratica-demo/preview-practice-actions.css";

type Query = Record<string, string | string[] | undefined>;
type StatusAction = { label: string; status: string; tone?: "primary" | "danger" };

const statusLabels: Record<string, string> = {
  NEW: "Richiesta ricevuta",
  ECCOMI_REVIEW: "In verifica ECCOMI",
  NEEDS_INFO: "Integrazione richiesta",
  QUOTE: "Preventivo predisposto",
  CONTRACT: "Contratto acquisito",
  DELIVERED: "Veicolo consegnato",
  ARCHIVED: "Pratica archiviata",
};

const actionsByStatus: Record<string, StatusAction[]> = {
  NEW: [
    { label: "Prendi in carico ECCOMI", status: "ECCOMI_REVIEW", tone: "primary" },
    { label: "Richiedi integrazione", status: "NEEDS_INFO" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  ECCOMI_REVIEW: [
    { label: "Preventivo predisposto", status: "QUOTE", tone: "primary" },
    { label: "Richiedi integrazione", status: "NEEDS_INFO" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  NEEDS_INFO: [
    { label: "Riprendi lavorazione ECCOMI", status: "ECCOMI_REVIEW", tone: "primary" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  QUOTE: [
    { label: "Contratto acquisito", status: "CONTRACT", tone: "primary" },
    { label: "Richiedi integrazione", status: "NEEDS_INFO" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  CONTRACT: [
    { label: "Veicolo consegnato", status: "DELIVERED", tone: "primary" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  DELIVERED: [{ label: "Archivia pratica", status: "ARCHIVED", tone: "danger" }],
  ARCHIVED: [],
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function safeStatus(value: string) {
  const status = value.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(actionsByStatus, status)
    ? status
    : "ECCOMI_REVIEW";
}

export default async function Pr10EccomiDemoPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const status = safeStatus(one(query.status));
  const demoAction = one(query.demoAction);
  const note = one(query.note).slice(0, 2000);
  const actions = actionsByStatus[status] || [];

  const feedback = demoAction === "status"
    ? `PREVIEW PR10 · ${statusLabels[status] || status} simulato${note ? ` · Nota: ${note}` : ""}.`
    : "PREVIEW PR10 · Workflow ECCOMI interno server-only. Nessun dato reale viene modificato.";

  return (
    <main className="ceo-server-page" data-pr10-demo-ready="true" data-pr10-server-only="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo">← Dashboard CEO</a>
      </header>

      <section className="ceo-server-heading partner-heading practice-ceo-heading">
        <div>
          <small>PREVIEW SICURA · PR10 · ECCOMI INTERNO</small>
          <h1 className="practice-ceo-title">Cliente Demo · KIA PICANTO</h1>
          <p className="practice-ceo-id">Pratica #PR10-ECCOMI-INTERNAL-DEMO</p>
          <p className="practice-ceo-context">ECCOMI · {statusLabels[status] || status}</p>
        </div>
        <span className="partner-sla partner-sla--large partner-sla--ok">🟢 0h · SLA ECCOMI OK</span>
      </section>

      <section className="ceo-practice-control" data-ceo-practice-control="true">
        <div className="ceo-practice-control__head">
          <div>
            <small>GESTIONE PRATICA CEO</small>
            <h2>Workflow interno ECCOMI</h2>
            <p>La struttura interna salta i passaggi partner fittizi e resta interamente server-side.</p>
          </div>
          <span className="is-preview">SERVER-SAFE · ZERO JS</span>
        </div>

        <div className="ceo-practice-control__grid">
          <article>
            <h3>Avanzamento</h3>
            <p>Stato corrente: <strong>{statusLabels[status] || status}</strong></p>
            {actions.length ? (
              <form method="get" action="/pr10-eccomi-demo" className="ceo-practice-control__stack">
                <input type="hidden" name="demoAction" value="status" />
                <label>
                  Nota per l’avanzamento
                  <textarea name="note" defaultValue={note} placeholder="Facoltativa; per integrazione indica cosa manca…" />
                </label>
                <div className="ceo-practice-control__buttons">
                  {actions.map((action) => (
                    <button
                      key={action.status}
                      type="submit"
                      name="status"
                      value={action.status}
                      className={action.tone === "primary" ? "primary" : action.tone === "danger" ? "danger" : ""}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <span className="ceo-practice-control__empty">Nessun avanzamento disponibile.</span>
            )}
          </article>

          <article>
            <h3>Partner</h3>
            <div className="ceo-practice-control__internal">
              <strong>Struttura interna ECCOMI</strong>
              <span>Nessun invio email, nessuna presa in carico partner fittizia. Da In verifica ECCOMI si passa direttamente a Preventivo predisposto.</span>
            </div>
          </article>
        </div>

        <div className="ceo-practice-control__feedback" role="status">{feedback}</div>
      </section>

      <section className="partner-detail-stack">
        <article className="partner-detail-section">
          <div className="partner-detail-section__head">
            <div><h2>Stato pratica</h2><p>Riepilogo del workflow interno PR10.</p></div>
            <span className="partner-pill partner-pill--active">{statusLabels[status] || status}</span>
          </div>
          <div className="partner-detail-grid">
            <div><small>Cliente</small><strong>Cliente Demo</strong></div>
            <div><small>Partner</small><strong>ECCOMI</strong></div>
            <div><small>Stato</small><strong>{statusLabels[status] || status}</strong></div>
            <div><small>Documenti</small><strong>Completi</strong></div>
          </div>
        </article>
      </section>
    </main>
  );
}
