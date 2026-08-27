"use client";

import { useMemo, useState } from "react";

type Status = "SENT_TO_PARTNER" | "PARTNER_REVIEW" | "NEEDS_INFO" | "QUOTE" | "CONTRACT" | "DELIVERED";
type WorkspaceTab = "overview" | "offers" | "practices" | "commissions" | "collaborators";
type OfferStatus = "PUBBLICATA" | "SOSPESA";
type InvitedCollaborator = { name: string; email: string; role: string };

type DemoPractice = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  province: string;
  vehicle: string;
  version: string;
  offerNumber: string;
  documents: number;
  status: Status;
};

const labels: Record<Status, string> = {
  SENT_TO_PARTNER: "NUOVA · DA PRENDERE IN CARICO",
  PARTNER_REVIEW: "IN LAVORAZIONE",
  NEEDS_INFO: "IN ATTESA CLIENTE",
  QUOTE: "PREVENTIVO PREDISPOSTO",
  CONTRACT: "CONTRATTO ACQUISITO",
  DELIVERED: "VEICOLO CONSEGNATO",
};

const tabMeta: Record<WorkspaceTab, { label: string; title: string; description: string }> = {
  overview: { label: "Panoramica", title: "Panoramica", description: "Controlla a colpo d’occhio offerte, pratiche, commissioni e collaboratori della tua organizzazione." },
  offers: { label: "Offerte", title: "Offerte", description: "Inserisci nuove quotazioni e gestisci disponibilità e stato delle offerte della tua organizzazione." },
  practices: { label: "Pratiche", title: "Pratiche", description: "Lavora esclusivamente le richieste clienti della tua organizzazione." },
  commissions: { label: "Commissioni", title: "Commissioni", description: "Consulta le commissioni maturate sulle pratiche concluse della tua organizzazione." },
  collaborators: { label: "Collaboratori", title: "Collaboratori", description: "Gestisci e invita le persone autorizzate a lavorare per la tua organizzazione." },
};

const tabs: WorkspaceTab[] = ["overview", "offers", "practices", "commissions", "collaborators"];

const initial: DemoPractice = {
  id: "ECN-20260827-DEMO01",
  customer: "Cliente Demo",
  email: "cliente.demo@example.it",
  phone: "+39 333 000 0000",
  province: "RM",
  vehicle: "FIAT PANDA",
  version: "1.0 Hybrid",
  offerNumber: "4022223346",
  documents: 4,
  status: "SENT_TO_PARTNER",
};

export default function Pr21PracticesDemo() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("practices");
  const [practice, setPractice] = useState(initial);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [offerStatus, setOfferStatus] = useState<OfferStatus>("PUBBLICATA");
  const [quoteFileName, setQuoteFileName] = useState("");
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [collaboratorActive, setCollaboratorActive] = useState(true);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Collaboratore");
  const [invitedCollaborators, setInvitedCollaborators] = useState<InvitedCollaborator[]>([]);

  const nextActions = useMemo(() => {
    switch (practice.status) {
      case "SENT_TO_PARTNER": return [{ status: "PARTNER_REVIEW" as Status, label: "Prendi in carico" }];
      case "PARTNER_REVIEW": return [
        { status: "QUOTE" as Status, label: "Preventivo predisposto" },
        { status: "NEEDS_INFO" as Status, label: "Richiedi integrazione" },
      ];
      case "NEEDS_INFO": return [{ status: "PARTNER_REVIEW" as Status, label: "Riprendi lavorazione" }];
      case "QUOTE": return [
        { status: "CONTRACT" as Status, label: "Contratto acquisito" },
        { status: "NEEDS_INFO" as Status, label: "Richiedi integrazione" },
      ];
      case "CONTRACT": return [{ status: "DELIVERED" as Status, label: "Veicolo consegnato" }];
      case "DELIVERED": return [];
    }
  }, [practice.status]);

  const selectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    setNotice("");
  };

  const advance = (status: Status, label: string) => {
    if (status === "NEEDS_INFO" && note.trim().length < 5) {
      setNotice("Scrivi prima cosa manca al cliente (almeno 5 caratteri).");
      return;
    }
    setPractice((current) => ({ ...current, status }));
    setNotice(`Demo aggiornata: ${label}. Nessun dato reale modificato.`);
    if (status !== "NEEDS_INFO") setNote("");
  };

  const reset = () => {
    setPractice(initial);
    setNote("");
    setNotice("Demo ripristinata.");
  };

  const toggleOffer = () => {
    const next: OfferStatus = offerStatus === "PUBBLICATA" ? "SOSPESA" : "PUBBLICATA";
    setOfferStatus(next);
    setNotice(`Offerta demo ${next === "PUBBLICATA" ? "riattivata" : "sospesa"}. Nessun dato reale modificato.`);
  };

  const submitQuotation = () => {
    if (!quoteFileName.toLowerCase().endsWith(".pdf")) {
      setNotice("Seleziona prima una quotazione in formato PDF.");
      return;
    }
    setQuoteSubmitted(true);
    setNotice("Quotazione demo inviata a verifica ECCOMI. Nessun file reale è stato caricato.");
  };

  const requestDeactivateCollaborator = () => setShowDeactivateConfirm(true);

  const confirmDeactivateCollaborator = () => {
    setCollaboratorActive(false);
    setShowDeactivateConfirm(false);
    setNotice("Collaboratore demo disattivato dopo conferma. Nessun dato reale modificato.");
  };

  const reactivateCollaborator = () => {
    setCollaboratorActive(true);
    setNotice("Collaboratore demo riattivato. Nessun dato reale modificato.");
  };

  const inviteCollaborator = () => {
    if (inviteName.trim().length < 2 || !inviteEmail.includes("@")) {
      setNotice("Inserisci nome e un indirizzo email valido per preparare l’invito.");
      return;
    }
    setInvitedCollaborators((current) => [...current, { name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole }]);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Collaboratore");
    setShowInvite(false);
    setNotice("Invito collaboratore preparato nella demo. Nessuna email reale è stata inviata.");
  };

  const activeCollaboratorsCount = (collaboratorActive ? 1 : 0) + invitedCollaborators.length;

  const renderOverview = () => (
    <>
      <section style={s.kpiGrid}>
        <article style={s.kpiCard}><span>Offerte online</span><strong style={s.kpiValue}>{offerStatus === "PUBBLICATA" ? 1 : 0}</strong><small>{quoteSubmitted ? "1 in verifica ECCOMI" : offerStatus === "SOSPESA" ? "1 sospesa" : "0 in verifica"}</small></article>
        <article style={s.kpiCard}><span>Pratiche aperte</span><strong style={s.kpiValue}>{practice.status === "DELIVERED" ? 0 : 1}</strong><small>1 totale demo</small></article>
        <article style={s.kpiCard}><span>Commissioni</span><strong style={s.kpiValue}>{practice.status === "DELIVERED" ? 1 : 0}</strong><small>{practice.status === "DELIVERED" ? "maturata alla consegna" : "nessuna maturata"}</small></article>
        <article style={s.kpiCard}><span>Collaboratori</span><strong style={s.kpiValue}>{activeCollaboratorsCount}</strong><small>gestibili dal Partner Admin</small></article>
      </section>
      <section style={s.twoCol}>
        <article style={s.panel}><span style={s.kicker}>OPERATIVITÀ</span><h2 style={s.h2}>Cosa richiede attenzione</h2><div style={practice.status === "SENT_TO_PARTNER" ? s.attention : s.doneSoft}>{practice.status === "SENT_TO_PARTNER" ? "1 pratica da prendere in carico." : practice.status === "NEEDS_INFO" ? "1 pratica in attesa di integrazione cliente." : practice.status === "DELIVERED" ? "Nessuna pratica aperta." : "1 pratica in lavorazione."}</div></article>
        <article style={s.panel}><span style={s.kicker}>SICUREZZA</span><h2 style={s.h2}>Perimetro della società</h2><p style={s.muted}>Offerte, clienti, documenti, commissioni e collaboratori restano confinati alla tua organizzazione.</p></article>
      </section>
    </>
  );

  const renderOffers = () => (
    <div style={s.stack}>
      <section style={s.panel}>
        <div style={s.sectionHead}><div><span style={s.kicker}>NUOVA QUOTAZIONE</span><h2 style={s.h2}>Carica il PDF del noleggiatore</h2><p style={s.muted}>La quotazione viene inviata a ECCOMI per verifica. Il Partner non può approvarla o pubblicarla direttamente.</p></div>{quoteSubmitted ? <span style={s.status}>IN VERIFICA ECCOMI</span> : null}</div>
        <div style={s.quoteComposer}>
          <label style={s.uploadBox}><input type="file" accept="application/pdf,.pdf" style={s.hiddenInput} onChange={(event) => setQuoteFileName(event.target.files?.[0]?.name ?? "")} /><span style={s.uploadIcon}>⬆️</span><span><strong>{quoteFileName || "Seleziona quotazione PDF"}</strong><small style={s.block}>PDF · massimo 15 MB nella versione reale</small></span></label>
          <button type="button" style={s.primary} onClick={submitQuotation}>Invia a verifica ECCOMI</button>
        </div>
      </section>
      <section style={s.panel}>
        <div style={s.sectionHead}><div><span style={s.kicker}>LE TUE OFFERTE</span><h2 style={s.h2}>Quotazioni e pubblicazioni</h2></div><span style={s.count}>{quoteSubmitted ? 2 : 1}</span></div>
        {quoteSubmitted ? <article style={s.pendingCard}><div><span style={s.kicker}>NUOVA QUOTAZIONE</span><strong>{quoteFileName}</strong></div><span style={s.status}>IN VERIFICA ECCOMI</span></article> : null}
        <article style={s.offerCard}><div style={s.cardTop}><div><span style={s.kicker}>OFFERTA {practice.offerNumber}</span><h3 style={s.h3}>{practice.vehicle}</h3><p style={s.muted}>{practice.version}</p></div><span style={s.status}>{offerStatus}</span></div><div style={s.offerMeta}><div><span style={s.summaryLabel}>Scadenza</span><strong>03/09/2026</strong></div><div><span style={s.summaryLabel}>Gestione</span><strong>Partner</strong></div><div><span style={s.summaryLabel}>Stato</span><strong>{offerStatus === "PUBBLICATA" ? "Visibile" : "Non visibile"}</strong></div></div><div style={s.actions}><button type="button" style={s.secondary} onClick={toggleOffer}>{offerStatus === "PUBBLICATA" ? "Sospendi" : "Riattiva"}</button></div></article>
      </section>
    </div>
  );

  const renderPractices = () => (
    <section style={s.grid}>
      <article style={s.listPanel}><div style={s.sectionHead}><div><span style={s.kicker}>LE TUE PRATICHE</span><h2 style={s.h2}>Richieste clienti</h2></div><span style={s.count}>1</span></div><button style={s.practiceCard} type="button"><div style={s.cardTop}><strong>{practice.id}</strong><span style={s.status}>{labels[practice.status]}</span></div><h3 style={s.h3}>{practice.vehicle}</h3><span>{practice.version}</span><div style={s.customer}><strong>{practice.customer}</strong><span>{practice.province} · {practice.email}</span><span>{practice.documents} documenti disponibili</span></div></button></article>
      <article style={s.detailPanel}>
        <div style={s.cardTop}><div><span style={s.kicker}>PRATICA {practice.id}</span><h2 style={s.h2}>{practice.vehicle}</h2><p style={s.muted}>{practice.version} · Offerta {practice.offerNumber}</p></div><span style={s.status}>{labels[practice.status]}</span></div>
        <div style={s.summary}><div style={s.summaryItem}><span style={s.summaryLabel}>Cliente</span><strong style={s.summaryValue}>{practice.customer}</strong></div><div style={s.summaryItem}><span style={s.summaryLabel}>Provincia</span><strong style={s.summaryValue}>{practice.province}</strong></div><div style={s.summaryItem}><span style={s.summaryLabel}>Documenti</span><strong style={s.summaryValue}>{practice.documents}</strong></div></div>
        <section style={s.detailSection}><span style={s.kicker}>CONTATTI CLIENTE</span><p><strong>{practice.email}</strong><br />{practice.phone}</p></section>
        <section style={s.detailSection}><span style={s.kicker}>DOCUMENTI</span><div style={s.docs}><span>📄 Documento identità</span><span>📄 Codice fiscale</span><span>📄 Ultima busta paga</span><span>📄 Documento reddituale</span></div></section>
        {practice.status !== "DELIVERED" ? <section style={s.detailSection}><span style={s.kicker}>NOTA OPERATIVA</span><textarea style={s.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Scrivi una nota o indica cosa manca al cliente…" /></section> : null}
        <section style={s.actions}>{nextActions.map((action) => <button key={action.status} type="button" style={action.status === "NEEDS_INFO" ? s.secondary : s.primary} onClick={() => advance(action.status, action.label)}>{action.label}</button>)}{practice.status === "DELIVERED" ? <div style={s.done}>✓ Pratica conclusa · commissione maturata alla consegna</div> : null}<button type="button" style={s.reset} onClick={reset}>Ripristina demo</button></section>
      </article>
    </section>
  );

  const renderCommissions = () => (
    <section style={s.panel}><div style={s.sectionHead}><div><span style={s.kicker}>COMMISSIONI</span><h2 style={s.h2}>Il tuo maturato</h2></div><span style={s.count}>{practice.status === "DELIVERED" ? 1 : 0}</span></div>{practice.status === "DELIVERED" ? <article style={s.commissionCard}><div><strong>{practice.vehicle}</strong><p style={s.muted}>Pratica {practice.id}</p></div><div><span style={s.summaryLabel}>Stato</span><strong style={s.greenText}>MATURATA ALLA CONSEGNA</strong></div><div><span style={s.summaryLabel}>Importo</span><strong>Secondo accordi Partner</strong></div></article> : <div style={s.infoBox}>Nessuna commissione maturata. La commissione matura quando la pratica arriva a “Veicolo consegnato”.</div>}</section>
  );

  const renderCollaborators = () => (
    <div style={s.stack}>
      <section style={s.panel}>
        <div style={s.sectionHead}><div><span style={s.kicker}>COLLABORATORI</span><h2 style={s.h2}>Persone della tua società</h2><p style={s.muted}>Il Partner Admin gestisce la propria sottorete senza uscire dal perimetro della società.</p></div><button type="button" style={s.primary} onClick={() => setShowInvite((current) => !current)}>{showInvite ? "Chiudi" : "+ Invita collaboratore"}</button></div>
        {showInvite ? <div style={s.inviteCard}><div style={s.formGrid}><label style={s.fieldLabel}>Nome e cognome<input style={s.input} value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Es. Mario Rossi" /></label><label style={s.fieldLabel}>Email<input style={s.input} type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="nome@azienda.it" /></label><label style={s.fieldLabel}>Ruolo<select style={s.input} value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option>Collaboratore</option><option>Operatore Partner</option></select></label></div><div style={s.actions}><button type="button" style={s.primary} onClick={inviteCollaborator}>Prepara invito</button><button type="button" style={s.reset} onClick={() => setShowInvite(false)}>Annulla</button></div></div> : null}
        <div style={s.collaboratorList}>
          <article style={s.collaboratorCard}><div><strong>Partner Admin Demo</strong><p style={s.muted}>partner.admin@example.it</p></div><div><span style={s.summaryLabel}>Ruolo</span><strong>Partner Admin</strong></div><div><span style={s.summaryLabel}>Stato</span><strong style={collaboratorActive ? s.greenText : s.redText}>{collaboratorActive ? "ATTIVO" : "DISATTIVATO"}</strong></div><button type="button" style={collaboratorActive ? s.dangerOutline : s.secondary} onClick={collaboratorActive ? requestDeactivateCollaborator : reactivateCollaborator}>{collaboratorActive ? "Disattiva" : "Riattiva"}</button></article>
          {invitedCollaborators.map((collaborator, index) => <article key={`${collaborator.email}-${index}`} style={s.collaboratorCard}><div><strong>{collaborator.name}</strong><p style={s.muted}>{collaborator.email}</p></div><div><span style={s.summaryLabel}>Ruolo</span><strong>{collaborator.role}</strong></div><div><span style={s.summaryLabel}>Stato</span><strong style={s.greenText}>INVITO PRONTO</strong></div><span style={s.miniBadge}>DEMO</span></article>)}
        </div>
      </section>
    </div>
  );

  const activeContent = activeTab === "overview" ? renderOverview() : activeTab === "offers" ? renderOffers() : activeTab === "practices" ? renderPractices() : activeTab === "commissions" ? renderCommissions() : renderCollaborators();

  return (
    <main style={s.page}>
      <header style={s.header}><div><strong>ECCOMI NOLEGGIO · AREA PARTNER</strong><small style={s.block}>by Eccomi OnLine</small></div><strong style={s.secure}>🛡️ Perimetro protetto</strong></header>
      <div style={s.content}>
        <section style={s.hero}><div><span style={s.kicker}>PARTNER ADMIN</span><h1 style={s.title}>{tabMeta[activeTab].title}</h1><p style={s.muted}>{tabMeta[activeTab].description}</p></div><div style={s.scope}><strong>Area protetta</strong><small>Accesso riservato alla tua organizzazione</small></div></section>
        <nav style={s.nav} aria-label="Area Partner">{tabs.map((tab) => <button key={tab} type="button" style={activeTab === tab ? s.navActive : s.navGhost} onClick={() => selectTab(tab)}>{tabMeta[tab].label}</button>)}</nav>
        {notice ? <div style={s.notice}>{notice}</div> : null}
        {activeContent}
        <div style={s.safe}>DEMO SICURA · Le azioni modificano solo questa preview locale. Nessuna pratica, cliente, offerta, commissione, collaboratore, email o database reale viene modificato.</div>
        <footer style={s.footer}><strong>ECCOMI NOLEGGIO</strong> · Ideato e progettato by Eccomi OnLine</footer>
      </div>
      {showDeactivateConfirm ? <div style={s.modalOverlay} role="dialog" aria-modal="true" aria-label="Conferma disattivazione collaboratore"><div style={s.modalCard}><span style={s.kicker}>CONFERMA RICHIESTA</span><h2 style={s.modalTitle}>Disattivare questo collaboratore?</h2><p style={s.muted}>Il collaboratore perderà l’accesso all’Area Partner della tua organizzazione. Potrai riattivarlo successivamente.</p><div style={s.warningBox}><strong>Partner Admin Demo</strong><span>partner.admin@example.it</span></div><div style={s.modalActions}><button type="button" style={s.secondary} onClick={() => setShowDeactivateConfirm(false)}>Annulla</button><button type="button" style={s.danger} onClick={confirmDeactivateCollaborator}>Conferma disattivazione</button></div></div></div> : null}
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif" },
  header: { minHeight: 76, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px clamp(22px,5vw,72px)", background: "#fff", borderBottom: "1px solid #dce6f1", color: "#073f73" },
  block: { display: "block", marginTop: 3, color: "#6b7c90", fontSize: 11 }, secure: { color: "#267352" }, content: { maxWidth: 1320, margin: "0 auto", padding: "34px 24px" },
  hero: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", padding: 28, borderRadius: 20, border: "1px solid #dce6f1", background: "#fff" },
  kicker: { color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".09em" }, title: { margin: "8px 0", fontSize: 42, fontWeight: 500 }, muted: { margin: 0, color: "#66768a", lineHeight: 1.5 }, scope: { display: "grid", gap: 4, padding: "14px 18px", borderRadius: 14, background: "#ecfdf3", color: "#166534" },
  nav: { display: "flex", gap: 9, flexWrap: "wrap", margin: "18px 0" }, navGhost: { padding: "10px 15px", border: "1px solid #9db7cf", borderRadius: 999, color: "#0c5597", fontWeight: 800, background: "#fff", cursor: "pointer" }, navActive: { padding: "10px 15px", border: "1px solid #0c66a8", borderRadius: 999, color: "#fff", fontWeight: 800, background: "#0c66a8", cursor: "pointer" },
  notice: { marginBottom: 14, padding: 13, borderRadius: 12, background: "#eef6ff", color: "#0c5597", fontWeight: 800 }, stack: { display: "grid", gap: 14 }, kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }, kpiCard: { display: "grid", gap: 8, padding: 20, borderRadius: 18, background: "#fff", border: "1px solid #dce6f1" }, kpiValue: { fontSize: 26 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginTop: 14 }, panel: { padding: 24, borderRadius: 18, background: "#fff", border: "1px solid #dce6f1" }, attention: { marginTop: 16, padding: 14, borderRadius: 12, background: "#fff7ed", color: "#9a3412", fontWeight: 800 }, doneSoft: { marginTop: 16, padding: 14, borderRadius: 12, background: "#ecfdf3", color: "#166534", fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "minmax(300px,.75fr) minmax(0,1.5fr)", gap: 14 }, listPanel: { padding: 20, borderRadius: 18, background: "#fff", border: "1px solid #dce6f1" }, detailPanel: { padding: 24, borderRadius: 18, background: "#fff", border: "1px solid #dce6f1" }, sectionHead: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }, count: { minWidth: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 999, background: "#eef6ff", color: "#0c5597", fontWeight: 900 }, h2: { margin: "7px 0 0", fontSize: 24 }, h3: { margin: "8px 0", fontSize: 22 },
  practiceCard: { width: "100%", display: "grid", gap: 10, textAlign: "left", padding: 18, borderRadius: 15, border: "1px solid #dbe6f0", background: "#fbfdff", color: "#102033" }, cardTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }, status: { padding: "6px 9px", borderRadius: 999, background: "#e9f7ef", color: "#25734f", fontSize: 11, fontWeight: 900 }, customer: { display: "grid", gap: 4, padding: 12, borderRadius: 11, background: "#f1f5f9", color: "#526274" },
  summary: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, margin: "22px 0" }, summaryItem: { display: "grid", gap: 6, minWidth: 0 }, summaryLabel: { display: "block", color: "#66768a", fontSize: 12, fontWeight: 800, marginBottom: 5 }, summaryValue: { color: "#102033", fontSize: 15, lineHeight: 1.35, overflowWrap: "anywhere" }, detailSection: { marginTop: 20, paddingTop: 18, borderTop: "1px solid #e4eaf0" }, docs: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }, textarea: { width: "100%", minHeight: 92, marginTop: 10, boxSizing: "border-box", border: "1px solid #cbd8e6", borderRadius: 12, padding: 12, fontSize: 15, resize: "vertical" },
  quoteComposer: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "stretch", marginTop: 18 }, uploadBox: { minHeight: 68, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1px dashed #9db7cf", borderRadius: 13, cursor: "pointer", background: "#fbfdff" }, uploadIcon: { fontSize: 20 }, hiddenInput: { display: "none" }, pendingCard: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: 16, marginBottom: 12, borderRadius: 13, background: "#eef6ff", border: "1px solid #dbe6f0" }, offerCard: { padding: 20, border: "1px solid #dbe6f0", borderRadius: 15, background: "#fbfdff" }, offerMeta: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginTop: 20, paddingTop: 18, borderTop: "1px solid #e4eaf0" },
  commissionCard: { display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 20, alignItems: "center", padding: 20, border: "1px solid #dbe6f0", borderRadius: 15, background: "#fbfdff" }, collaboratorList: { display: "grid", gap: 10 }, collaboratorCard: { display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr auto", gap: 20, alignItems: "center", padding: 20, border: "1px solid #dbe6f0", borderRadius: 15, background: "#fbfdff" }, inviteCard: { padding: 18, marginBottom: 16, border: "1px solid #dbe6f0", borderRadius: 14, background: "#f8fbff" }, formGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }, fieldLabel: { display: "grid", gap: 7, color: "#102033", fontWeight: 800 }, input: { width: "100%", minHeight: 44, boxSizing: "border-box", border: "1px solid #cbd8e6", borderRadius: 10, padding: "8px 11px", background: "#fff", fontSize: 14 }, miniBadge: { padding: "6px 9px", borderRadius: 999, background: "#eef6ff", color: "#0c5597", fontSize: 11, fontWeight: 900 }, infoBox: { padding: 16, borderRadius: 12, background: "#eef6ff", color: "#0c5597", fontWeight: 800 }, greenText: { color: "#166534" }, redText: { color: "#b42318" },
  actions: { display: "flex", flexWrap: "wrap", gap: 9, marginTop: 22 }, primary: { minHeight: 42, border: 0, borderRadius: 10, padding: "9px 15px", background: "#1478bd", color: "#fff", fontWeight: 900, cursor: "pointer" }, secondary: { minHeight: 42, border: "1px solid #cbd8e6", borderRadius: 10, padding: "9px 15px", background: "#fff", color: "#0c5597", fontWeight: 900, cursor: "pointer" }, dangerOutline: { minHeight: 42, border: "1px solid #f1a5a5", borderRadius: 10, padding: "9px 15px", background: "#fff", color: "#b42318", fontWeight: 900, cursor: "pointer" }, danger: { minHeight: 42, border: 0, borderRadius: 10, padding: "9px 15px", background: "#b42318", color: "#fff", fontWeight: 900, cursor: "pointer" }, reset: { minHeight: 42, border: 0, background: "transparent", color: "#66768a", fontWeight: 700, cursor: "pointer" }, done: { flex: "1 0 100%", padding: 13, borderRadius: 11, background: "#ecfdf3", color: "#166534", fontWeight: 850 },
  warningBox: { display: "grid", gap: 3, padding: 14, marginTop: 18, borderRadius: 12, background: "#fff7ed", color: "#9a3412" }, modalOverlay: { position: "fixed", inset: 0, display: "grid", placeItems: "center", padding: 20, background: "rgba(15,32,51,.48)", zIndex: 99 }, modalCard: { width: "min(520px,100%)", padding: 26, borderRadius: 18, background: "#fff", boxShadow: "0 24px 70px rgba(15,32,51,.22)" }, modalTitle: { margin: "9px 0 10px", fontSize: 28 }, modalActions: { display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, marginTop: 22 },
  safe: { marginTop: 16, padding: 13, borderRadius: 12, background: "#ecfdf3", color: "#166534", fontSize: 13, fontWeight: 800 }, footer: { marginTop: 34, padding: "24px 0 4px", borderTop: "1px solid #dce6f1", color: "#6b7c90", fontSize: 12, textAlign: "center" },
};