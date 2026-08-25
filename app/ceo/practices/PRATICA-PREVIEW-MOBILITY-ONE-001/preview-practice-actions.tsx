"use client";

import { useState } from "react";

export default function PreviewPracticeActions() {
  const [status, setStatus] = useState("PARTNER_REVIEW");
  const [priority, setPriority] = useState("NORMAL");
  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [feedback, setFeedback] = useState("Preview sicura: tutte le azioni sono simulate e non scrivono dati reali.");

  const advance = (label: string, next: string) => {
    setStatus(next);
    setFeedback(`PREVIEW · ${label} simulato. Nessun dato reale modificato.`);
  };

  return (
    <section className="ceo-practice-control" data-ceo-practice-control="true" data-preview-controller="local">
      <div className="ceo-practice-control__head">
        <div>
          <small>GESTIONE PRATICA CEO</small>
          <h2>Azioni operative</h2>
          <p>Collaudo PR9: il rosso diventa lavorabile dalla stessa scheda, senza scritture sui dati reali.</p>
        </div>
        <span className="is-preview">PREVIEW · SIMULAZIONE</span>
      </div>

      <div className="ceo-practice-control__grid">
        <article>
          <h3>Avanzamento</h3>
          <p>Stato corrente: <strong>{status.replaceAll("_", " ")}</strong></p>
          <div className="ceo-practice-control__buttons">
            {status === "PARTNER_REVIEW" ? <button type="button" className="primary" onClick={() => advance("Preventivo predisposto", "QUOTE")}>Preventivo predisposto</button> : null}
            {status === "QUOTE" ? <button type="button" className="primary" onClick={() => advance("Contratto acquisito", "CONTRACT")}>Contratto acquisito</button> : null}
            {status === "CONTRACT" ? <button type="button" className="primary" onClick={() => advance("Veicolo consegnato", "DELIVERED")}>Veicolo consegnato</button> : null}
            {!['DELIVERED','ARCHIVED'].includes(status) ? <button type="button" onClick={() => advance("Richiesta integrazione", "NEEDS_INFO")}>Richiedi integrazione</button> : null}
            {status !== "ARCHIVED" ? <button type="button" className="danger" onClick={() => advance("Archiviazione", "ARCHIVED")}>Archivia pratica</button> : null}
          </div>
        </article>

        <article>
          <h3>Priorità e responsabile</h3>
          <label>Priorità<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="LOW">Bassa</option><option value="NORMAL">Normale</option><option value="HIGH">Alta / urgente</option></select></label>
          <button type="button" onClick={() => setFeedback(`PREVIEW · priorità ${priority} simulata.`)}>Salva priorità</button>
          <label>Responsabile interno<input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Nome o email operatore" /></label>
          <button type="button" onClick={() => setFeedback(assignedTo.trim() ? `PREVIEW · assegnazione a ${assignedTo.trim()} simulata.` : "PREVIEW · rimozione assegnazione simulata.")}>{assignedTo.trim() ? "Assegna" : "Rimuovi assegnazione"}</button>
        </article>

        <article>
          <h3>Nota operativa</h3>
          <label>Nota / istruzioni<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Es. cliente richiamato, documento mancante…" /></label>
          <button type="button" disabled={!note.trim()} onClick={() => setFeedback("PREVIEW · nota operativa salvata in simulazione.")}>Salva nota</button>
        </article>

        <article>
          <h3>Partner</h3>
          <label>Email partner<input type="email" defaultValue="mobility.preview@eccomi.local" /></label>
          <button type="button" className="primary" onClick={() => { setStatus("SENT_TO_PARTNER"); setFeedback("PREVIEW · invio al partner simulato. Nessuna email inviata."); }}>Invia al partner</button>
        </article>
      </div>

      <details className="ceo-practice-control__danger">
        <summary>Azioni amministrative / cestino</summary>
        <p>In preview il cestino è solo simulato.</p>
        <label>Motivo<input value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder="Es. pratica duplicata / test" /></label>
        <button type="button" className="danger" disabled={deleteReason.trim().length < 5} onClick={() => setFeedback("PREVIEW · spostamento nel cestino simulato.")}>Sposta pratica nel cestino</button>
      </details>

      <div className="ceo-practice-control__feedback" role="status">{feedback}</div>
    </section>
  );
}
