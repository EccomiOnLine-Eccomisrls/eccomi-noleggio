/* eslint-disable @next/next/no-html-link-for-pages -- Preview iPad uses native navigation intentionally. */
import "../ceo/ceo-server.css";
import "../ceo/partners/partners.css";
import "../ceo/partners/final-touches.css";
import "./preview-practice-actions.css";

type Query = Record<string, string | string[] | undefined>;
type StatusAction = { label: string; status: string; tone?: "primary" | "danger" };

const actionsByStatus: Record<string, StatusAction[]> = {
  NEW: [
    { label: "Prendi in carico ECCOMI", status: "ECCOMI_REVIEW", tone: "primary" },
    { label: "Richiedi integrazione", status: "NEEDS_INFO" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  ECCOMI_REVIEW: [
    { label: "Richiedi integrazione", status: "NEEDS_INFO" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  NEEDS_INFO: [
    { label: "Riprendi lavorazione ECCOMI", status: "ECCOMI_REVIEW", tone: "primary" },
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  PARTNER_REVIEW: [
    { label: "Preventivo predisposto", status: "QUOTE", tone: "primary" },
    { label: "Richiedi integrazione", status: "NEEDS_INFO" },
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

const statusLabels: Record<string, string> = {
  NEW: "Richiesta ricevuta",
  ECCOMI_REVIEW: "In verifica ECCOMI",
  NEEDS_INFO: "Integrazione richiesta",
  PARTNER_REVIEW: "In lavorazione partner",
  QUOTE: "Preventivo predisposto",
  CONTRACT: "Contratto acquisito",
  DELIVERED: "Veicolo consegnato",
  ARCHIVED: "Pratica archiviata",
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function safeStatus(value: string) {
  const status = value.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(actionsByStatus, status) ? status : "PARTNER_REVIEW";
}

export default async function Pr9PracticeDemoPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const status = safeStatus(one(query.status));
  const priority = ["LOW", "NORMAL", "HIGH"].includes(one(query.priority).toUpperCase())
    ? one(query.priority).toUpperCase()
    : "NORMAL";
  const assignedTo = one(query.assignedTo).slice(0, 160);
  const demoAction = one(query.demoAction);
  const actions = actionsByStatus[status] || [];
  const note = one(query.note).slice(0, 2000);
  const deleteReason = one(query.deleteReason).slice(0, 500);
  const recipientEmail = one(query.recipientEmail) || "mobility.preview@eccomi.local";

  let feedback = "PREVIEW · Server-only attiva. Nessun dato reale viene modificato.";
  if (demoAction === "status") {
    feedback = `PREVIEW · ${statusLabels[status] || status} simulato${note ? ` · Nota: ${note}` : ""}.`;
  } else if (demoAction === "priority") {
    feedback = `PREVIEW · Priorità ${priority} salvata in simulazione.`;
  } else if (demoAction === "assignment") {
    feedback = assignedTo
      ? `PREVIEW · Pratica assegnata a ${assignedTo} in simulazione.`
      : "PREVIEW · Assegnazione rimossa in simulazione.";
  } else if (demoAction === "note") {
    feedback = note
      ? `PREVIEW · Nota operativa salvata: ${note}`
      : "PREVIEW · Inserisci una nota prima di salvarla.";
  } else if (demoAction === "partner") {
    feedback = `PREVIEW · Invio a ${recipientEmail} simulato. Nessuna email inviata.`;
  } else if (demoAction === "trash") {
    feedback = deleteReason.length >= 5
      ? `PREVIEW · Spostamento nel cestino simulato · Motivo: ${deleteReason}`
      : "PREVIEW · Per il cestino serve un motivo di almeno 5 caratteri.";
  }

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
          <p className="practice-ceo-context">MOBILITY ONE · {statusLabels[status] || status}</p>
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
            <p>Ogni comando ricarica questa pagina lato server. Nessuna hydration React e nessuna scrittura sui dati reali.</p>
          </div>
          <span className="is-preview">SERVER-SAFE · ZERO JS</span>
        </div>

        <div className="ceo-practice-control__grid">
          <article>
            <h3>Avanzamento</h3>
            <p>Stato corrente: <strong>{statusLabels[status] || status}</strong></p>
            {actions.length ? (
              <form method="get" action="/pr9-pratica-demo" className="ceo-practice-control__stack">
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
            ) : <span className="ceo-practice-control__empty">Nessun avanzamento disponibile.</span>}
          </article>

          <article>
            <h3>Priorità e responsabile</h3>
            <form method="get" action="/pr9-pratica-demo" className="ceo-practice-control__stack">
              <input type="hidden" name="demoAction" value="priority" />
              <input type="hidden" name="status" value={status} />
              <label>
                Priorità
                <select name="priority" defaultValue={priority}>
                  <option value="LOW">Bassa</option>
                  <option value="NORMAL">Normale</option>
                  <option value="HIGH">Alta / urgente</option>
                </select>
              </label>
              <button type="submit">Salva priorità</button>
            </form>

            <form method="get" action="/pr9-pratica-demo" className="ceo-practice-control__stack">
              <input type="hidden" name="demoAction" value="assignment" />
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="priority" value={priority} />
              <label>
                Responsabile interno
                <input name="assignedTo" defaultValue={assignedTo} placeholder="Nome o email operatore" maxLength={160} />
              </label>
              <button type="submit">Assegna / riassegna</button>
            </form>
          </article>

          <article>
            <h3>Nota operativa</h3>
            <form method="get" action="/pr9-pratica-demo" className="ceo-practice-control__stack">
              <input type="hidden" name="demoAction" value="note" />
              <input type="hidden" name="status" value={status} />
              <label>
                Nota / istruzioni
                <textarea name="note" required defaultValue={note} placeholder="Es. cliente richiamato, documento mancante…" />
              </label>
              <button type="submit">Salva nota</button>
            </form>
          </article>

          <article>
            <h3>Partner</h3>
            <form method="get" action="/pr9-pratica-demo" className="ceo-practice-control__stack">
              <input type="hidden" name="demoAction" value="partner" />
              <input type="hidden" name="status" value={status} />
              <label>
                Email partner
                <input type="email" name="recipientEmail" required defaultValue={recipientEmail} />
              </label>
              <button type="submit" className="primary">Invia al partner</button>
            </form>
          </article>
        </div>

        <details className="ceo-practice-control__danger">
          <summary>Azioni amministrative / cestino</summary>
          <p>In preview il cestino è simulato e non modifica alcuna pratica.</p>
          <form method="get" action="/pr9-pratica-demo" className="ceo-practice-control__stack">
            <input type="hidden" name="demoAction" value="trash" />
            <input type="hidden" name="status" value={status} />
            <label>
              Motivo
              <input name="deleteReason" required minLength={5} defaultValue={deleteReason} placeholder="Es. pratica duplicata / test" />
            </label>
            <button type="submit" className="danger">Sposta pratica nel cestino</button>
          </form>
        </details>

        <div className="ceo-practice-control__feedback" role="status">{feedback}</div>
      </section>

      <section className="partner-detail-stack">
        <article className="partner-detail-section">
          <div className="partner-detail-section__head">
            <div><h2>Stato pratica</h2><p>Riepilogo operativo e tempi della richiesta.</p></div>
            <span className="partner-pill partner-pill--active">{statusLabels[status] || status}</span>
          </div>
          <div className="partner-detail-grid">
            <div><small>Cliente</small><strong>Cliente Demo</strong></div>
            <div><small>Stato</small><strong>{statusLabels[status] || status}</strong></div>
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
