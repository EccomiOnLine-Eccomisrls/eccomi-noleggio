"use client";

import { useEffect, useMemo, useState } from "react";

type StatusAction = {
  label: string;
  status: string;
  tone?: "primary" | "danger";
};

type PracticeApiPayload = {
  practice?: {
    priority?: string | null;
    assignedTo?: string | null;
    partner?: {
      contactEmail?: string | null;
    };
  };
  error?: string;
};

type Props = {
  practiceId: string;
  initialStatus: string;
  preview: boolean;
  partnerName: string;
  partnerLegalName: string;
  partnerContactEmail: string | null;
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

function normalized(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

export default function CeoPracticeActions({
  practiceId,
  initialStatus,
  preview,
  partnerName,
  partnerLegalName,
  partnerContactEmail,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState("NORMAL");
  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(partnerContactEmail || "");
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(preview ? "Preview sicura: le azioni sono simulate e non scrivono dati reali." : "");

  const internalEccomi = useMemo(() => {
    const name = normalized(partnerName);
    const legal = normalized(partnerLegalName);
    return name === "ECCOMI" || name.startsWith("ECCOMI ") || legal === "ECCOMI SRLS" || legal.startsWith("ECCOMI SRLS ");
  }, [partnerName, partnerLegalName]);

  useEffect(() => {
    if (preview) return;
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/practices/${encodeURIComponent(practiceId)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = await response.json() as PracticeApiPayload;
        if (!response.ok || !payload.practice || !active) return;
        setPriority((payload.practice.priority || "NORMAL").toUpperCase());
        setAssignedTo(payload.practice.assignedTo || "");
        if (!recipientEmail && payload.practice.partner?.contactEmail) {
          setRecipientEmail(payload.practice.partner.contactEmail);
        }
      } catch {
        // La scheda server-side resta utilizzabile anche se questo caricamento accessorio fallisce.
      }
    })();
    return () => { active = false; };
  }, [practiceId, preview, recipientEmail]);

  const finish = (message: string, nextStatus?: string) => {
    if (nextStatus) setStatus(nextStatus);
    setFeedback(message);
    setBusy(null);
    if (!preview) window.setTimeout(() => window.location.reload(), 450);
  };

  const postAction = async (key: string, body: Record<string, unknown>, previewMessage: string, nextStatus?: string) => {
    if (busy) return;
    setBusy(key);
    setFeedback("");
    if (preview) {
      finish(`PREVIEW · ${previewMessage}`, nextStatus);
      return;
    }
    try {
      const response = await fetch(`/api/practices/${encodeURIComponent(practiceId)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; label?: string };
      if (!response.ok) throw new Error(payload.error || "Operazione non riuscita.");
      finish(payload.label ? `Operazione completata: ${payload.label}.` : "Operazione completata.", nextStatus);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Operazione non riuscita.");
      setBusy(null);
    }
  };

  const advance = async (action: StatusAction) => {
    let actionNote = note.trim();
    if (action.status === "NEEDS_INFO" && actionNote.length < 5) {
      actionNote = window.prompt("Indica cosa deve integrare il cliente:", actionNote) || "";
      if (actionNote.trim().length < 5) {
        setFeedback("Per richiedere un'integrazione serve una nota di almeno 5 caratteri.");
        return;
      }
      setNote(actionNote);
    }
    if (action.status === "ARCHIVED" && !window.confirm("Archiviare questa pratica?")) return;
    await postAction(
      `status:${action.status}`,
      { status: action.status, note: actionNote },
      `${action.label} simulato.`,
      action.status,
    );
  };

  const sendToPartner = async () => {
    const email = recipientEmail.trim();
    if (!email) {
      setFeedback("Inserisci l'email del partner.");
      return;
    }
    if (!window.confirm(`Inviare la pratica a ${email}?`)) return;
    if (busy) return;
    setBusy("send-partner");
    setFeedback("");
    if (preview) {
      finish(`PREVIEW · invio a ${email} simulato.`, "SENT_TO_PARTNER");
      return;
    }
    try {
      const response = await fetch(`/api/practices/${encodeURIComponent(practiceId)}/send-to-partner`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipientEmail: email,
          message: note.trim(),
          saveRecipient: true,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Invio al partner non riuscito.");
      finish(`Pratica inviata al partner: ${email}.`, "SENT_TO_PARTNER");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Invio al partner non riuscito.");
      setBusy(null);
    }
  };

  const trashPractice = async () => {
    const reason = deleteReason.trim();
    if (reason.length < 5) {
      setFeedback("Indica il motivo dello spostamento nel cestino (almeno 5 caratteri).");
      return;
    }
    if (!window.confirm("Spostare questa pratica nel cestino? L'azione verrà registrata.")) return;
    await postAction(
      "trash",
      { trashAction: "TRASH", deleteReason: reason },
      "spostamento nel cestino simulato.",
    );
  };

  const actions = actionsByStatus[status] || [];
  const canSendToPartner = !internalEccomi && ["NEW", "ECCOMI_REVIEW", "NEEDS_INFO"].includes(status);

  return (
    <section className="ceo-practice-control" data-ceo-practice-control="true">
      <div className="ceo-practice-control__head">
        <div>
          <small>GESTIONE PRATICA CEO</small>
          <h2>Azioni operative</h2>
          <p>Il rosso diventa lavorabile: prendi in carico, aggiorna, assegna, comunica o archivia dalla stessa scheda.</p>
        </div>
        <span className={preview ? "is-preview" : "is-live"}>{preview ? "PREVIEW · SIMULAZIONE" : "DATI REALI · AZIONI ATTIVE"}</span>
      </div>

      <div className="ceo-practice-control__grid">
        <article>
          <h3>Avanzamento</h3>
          <p>Stato corrente: <strong>{status.replaceAll("_", " ")}</strong></p>
          <div className="ceo-practice-control__buttons">
            {actions.length ? actions.map((action) => (
              <button
                key={action.status}
                type="button"
                className={action.tone === "primary" ? "primary" : action.tone === "danger" ? "danger" : ""}
                disabled={Boolean(busy)}
                onClick={() => void advance(action)}
              >
                {busy === `status:${action.status}` ? "Aggiornamento…" : action.label}
              </button>
            )) : <span className="ceo-practice-control__empty">Nessun avanzamento disponibile per questo stato.</span>}
          </div>
        </article>

        <article>
          <h3>Priorità e responsabile</h3>
          <label>
            Priorità
            <select value={priority} onChange={(event) => setPriority(event.target.value)} disabled={Boolean(busy)}>
              <option value="LOW">Bassa</option>
              <option value="NORMAL">Normale</option>
              <option value="HIGH">Alta / urgente</option>
            </select>
          </label>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void postAction("priority", { priority }, `priorità ${priority} simulata.`)}
          >
            {busy === "priority" ? "Salvataggio…" : "Salva priorità"}
          </button>
          <label>
            Responsabile interno
            <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Nome o email operatore" />
          </label>
          <div className="ceo-practice-control__inline">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void postAction("assign", { assignedTo }, assignedTo.trim() ? `assegnazione a ${assignedTo.trim()} simulata.` : "rimozione assegnazione simulata.")}
            >
              {busy === "assign" ? "Salvataggio…" : assignedTo.trim() ? "Assegna" : "Rimuovi assegnazione"}
            </button>
            {assignedTo.trim() ? (
              <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => { setAssignedTo(""); void postAction("unassign", { assignedTo: "" }, "rimozione assegnazione simulata."); }}>
                Rimuovi
              </button>
            ) : null}
          </div>
        </article>

        <article>
          <h3>Nota operativa</h3>
          <label>
            Nota / istruzioni
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Es. cliente richiamato, documento mancante, istruzioni al partner…" />
          </label>
          <button
            type="button"
            disabled={Boolean(busy) || note.trim().length === 0}
            onClick={() => void postAction("note", { note: note.trim() }, "nota operativa salvata.")}
          >
            {busy === "note" ? "Salvataggio…" : "Salva nota"}
          </button>
        </article>

        <article>
          <h3>Partner</h3>
          {internalEccomi ? (
            <div className="ceo-practice-control__internal">
              <strong>Struttura interna ECCOMI</strong>
              <span>L'invio all'Area Partner non è necessario per questa pratica.</span>
            </div>
          ) : (
            <>
              <label>
                Email partner
                <input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="partner@azienda.it" />
              </label>
              <button type="button" className="primary" disabled={Boolean(busy) || !canSendToPartner} onClick={() => void sendToPartner()}>
                {busy === "send-partner" ? "Invio…" : status === "SENT_TO_PARTNER" ? "Già inviata al partner" : "Invia al partner"}
              </button>
              {!canSendToPartner ? <span className="ceo-practice-control__hint">L'invio è disponibile nelle fasi ECCOMI precedenti alla presa in carico del partner.</span> : null}
            </>
          )}
        </article>
      </div>

      <details className="ceo-practice-control__danger">
        <summary>Azioni amministrative / cestino</summary>
        <p>Lo spostamento nel cestino è riservato al CEO, richiede una motivazione e viene registrato nell'audit log.</p>
        <label>
          Motivo
          <input value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder="Es. pratica duplicata / test / richiesta annullata" />
        </label>
        <button type="button" className="danger" disabled={Boolean(busy)} onClick={() => void trashPractice()}>
          {busy === "trash" ? "Spostamento…" : "Sposta pratica nel cestino"}
        </button>
      </details>

      {feedback ? <div className="ceo-practice-control__feedback" role="status">{feedback}</div> : null}
    </section>
  );
}
