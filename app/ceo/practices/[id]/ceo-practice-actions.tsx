import { isInternalEccomiPartner } from "../../../lib/partner-identity";

type StatusAction = {
  label: string;
  status: string;
  tone?: "primary" | "danger";
};

type Props = {
  practiceId: string;
  initialStatus: string;
  initialPriority: string;
  initialAssignedTo: string | null;
  preview: boolean;
  partnerName: string;
  partnerLegalName: string;
  partnerContactEmail: string | null;
  feedbackStatus?: "ok" | "error" | null;
  feedbackMessage?: string | null;
};

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
  SENT_TO_PARTNER: [
    { label: "Segna presa in carico partner", status: "PARTNER_REVIEW", tone: "primary" },
    { label: "Richiedi integrazione", status: "NEEDS_INFO" },
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
  DELIVERED: [
    { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" },
  ],
  ARCHIVED: [],
};

const statusLabels: Record<string, string> = {
  NEW: "Richiesta ricevuta",
  ECCOMI_REVIEW: "In verifica ECCOMI",
  NEEDS_INFO: "Integrazione richiesta",
  SENT_TO_PARTNER: "Inviata al partner",
  PARTNER_REVIEW: "In lavorazione partner",
  QUOTE: "Preventivo predisposto",
  CONTRACT: "Contratto acquisito",
  DELIVERED: "Veicolo consegnato",
  ARCHIVED: "Pratica archiviata",
};

function cleanPriority(value: string) {
  const priority = value.trim().toUpperCase();
  return ["LOW", "NORMAL", "HIGH"].includes(priority) ? priority : "NORMAL";
}

export default function CeoPracticeActions({
  practiceId,
  initialStatus,
  initialPriority,
  initialAssignedTo,
  preview,
  partnerName,
  partnerLegalName,
  partnerContactEmail,
  feedbackStatus,
  feedbackMessage,
}: Props) {
  const status = initialStatus.trim().toUpperCase();
  const priority = cleanPriority(initialPriority);
  const assignedTo = initialAssignedTo?.trim() || "";
  const internalEccomi = isInternalEccomiPartner({
    name: partnerName,
    legalName: partnerLegalName,
  });
  const actions = internalEccomi && status === "ECCOMI_REVIEW"
    ? [
        { label: "Preventivo predisposto", status: "QUOTE", tone: "primary" as const },
        { label: "Richiedi integrazione", status: "NEEDS_INFO" },
        { label: "Archivia pratica", status: "ARCHIVED", tone: "danger" as const },
      ]
    : actionsByStatus[status] || [];
  const statusLabel = statusLabels[status] || status.replaceAll("_", " ");

  if (preview) {
    return (
      <section className="ceo-practice-control" data-ceo-practice-control="true" data-server-only="true">
        <div className="ceo-practice-control__head">
          <div>
            <small>GESTIONE PRATICA CEO</small>
            <h2>Azioni operative</h2>
            <p>Per il collaudo sicuro della PR9 usa la route server-only dedicata, senza scritture sui dati reali.</p>
          </div>
          <span className="is-preview">PREVIEW · SERVER-ONLY</span>
        </div>
        <a className="ceo-server-primary" href="/pr9-pratica-demo">Apri collaudo azioni PR9</a>
      </section>
    );
  }

  const actionPath = `/api/practices/${encodeURIComponent(practiceId)}/action-form`;
  const partnerPath = `/api/practices/${encodeURIComponent(practiceId)}/send-to-partner-form`;
  const canSendToPartner = !internalEccomi && ["NEW", "ECCOMI_REVIEW", "NEEDS_INFO"].includes(status);

  return (
    <section className="ceo-practice-control" data-ceo-practice-control="true" data-server-only="true">
      <div className="ceo-practice-control__head">
        <div>
          <small>GESTIONE PRATICA CEO</small>
          <h2>Azioni operative</h2>
          <p>Gestione server-side: avanzamento, priorità, assegnazione, note, partner e cestino senza dashboard React.</p>
        </div>
        <span className="is-live">DATI REALI · SERVER-SAFE</span>
      </div>

      <div className="ceo-practice-control__grid">
        <article>
          <h3>Avanzamento</h3>
          <p>Stato corrente: <strong>{statusLabel}</strong></p>
          {actions.length ? (
            <form method="post" action={actionPath} className="ceo-practice-control__stack">
              <input type="hidden" name="operation" value="status" />
              <label>
                Nota per l’avanzamento
                <textarea name="note" placeholder="Facoltativa, obbligatoria per Richiedi integrazione…" />
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
            <span className="ceo-practice-control__empty">Nessun avanzamento disponibile per questo stato.</span>
          )}
        </article>

        <article>
          <h3>Priorità e responsabile</h3>
          <form method="post" action={actionPath} className="ceo-practice-control__stack">
            <input type="hidden" name="operation" value="priority" />
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

          <form method="post" action={actionPath} className="ceo-practice-control__stack">
            <input type="hidden" name="operation" value="assignment" />
            <label>
              Responsabile interno
              <input name="assignedTo" defaultValue={assignedTo} placeholder="Nome o email operatore" maxLength={160} />
            </label>
            <button type="submit">Assegna / riassegna</button>
          </form>

          {assignedTo ? (
            <form method="post" action={actionPath}>
              <input type="hidden" name="operation" value="assignment" />
              <input type="hidden" name="assignedTo" value="" />
              <button type="submit" className="secondary">Rimuovi assegnazione</button>
            </form>
          ) : null}
        </article>

        <article>
          <h3>Nota operativa</h3>
          <form method="post" action={actionPath} className="ceo-practice-control__stack">
            <input type="hidden" name="operation" value="note" />
            <label>
              Nota / istruzioni
              <textarea name="note" required maxLength={2000} placeholder="Es. cliente richiamato, documento mancante, istruzioni al partner…" />
            </label>
            <button type="submit">Salva nota</button>
          </form>
        </article>

        <article>
          <h3>Partner</h3>
          {internalEccomi ? (
            <div className="ceo-practice-control__internal">
              <strong>Struttura interna ECCOMI</strong>
              <span>Workflow interno: dopo la verifica puoi predisporre direttamente il preventivo, senza passaggi fittizi nell’Area Partner.</span>
            </div>
          ) : (
            <form method="post" action={partnerPath} className="ceo-practice-control__stack">
              <label>
                Email partner
                <input type="email" name="recipientEmail" required defaultValue={partnerContactEmail || ""} placeholder="partner@azienda.it" />
              </label>
              <label>
                Oggetto
                <input name="subject" defaultValue={`Nuova pratica ECCOMI NOLEGGIO ${practiceId}`} maxLength={180} />
              </label>
              <label>
                Messaggio
                <textarea name="message" maxLength={3000} placeholder="Messaggio operativo al partner…" />
              </label>
              <input type="hidden" name="saveRecipient" value="true" />
              <button type="submit" className="primary" disabled={!canSendToPartner}>
                {canSendToPartner ? "Invia al partner" : "Invio non disponibile in questa fase"}
              </button>
              {!canSendToPartner ? (
                <span className="ceo-practice-control__hint">L’invio è disponibile nelle fasi ECCOMI precedenti alla presa in carico del partner.</span>
              ) : null}
            </form>
          )}
        </article>
      </div>

      <details className="ceo-practice-control__danger">
        <summary>Azioni amministrative / cestino</summary>
        <p>Lo spostamento nel cestino è riservato al CEO, richiede una motivazione e viene registrato nell’audit log.</p>
        <form method="post" action={actionPath} className="ceo-practice-control__stack">
          <input type="hidden" name="operation" value="trash" />
          <label>
            Motivo
            <input name="deleteReason" required minLength={5} maxLength={500} placeholder="Es. pratica duplicata / test / richiesta annullata" />
          </label>
          <button type="submit" className="danger">Sposta pratica nel cestino</button>
        </form>
      </details>

      {feedbackMessage ? (
        <div
          className={`ceo-practice-control__feedback ${feedbackStatus === "error" ? "is-error" : "is-ok"}`}
          role="status"
        >
          {feedbackMessage}
        </div>
      ) : null}
    </section>
  );
}
