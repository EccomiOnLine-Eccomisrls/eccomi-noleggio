"use client";

import { useMemo, useState } from "react";

type Status = "SENT_TO_PARTNER" | "PARTNER_REVIEW" | "NEEDS_INFO" | "QUOTE" | "CONTRACT" | "DELIVERED";

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
  const [practice, setPractice] = useState(initial);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

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

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div><strong>ECCOMI NOLEGGIO · AREA PARTNER</strong><small style={s.block}>by Eccomi OnLine</small></div>
        <strong style={s.secure}>🛡️ Perimetro protetto</strong>
      </header>

      <div style={s.content}>
        <section style={s.hero}>
          <div><span style={s.kicker}>PARTNER ADMIN</span><h1 style={s.title}>Pratiche</h1><p style={s.muted}>Lavora esclusivamente le richieste clienti della tua organizzazione.</p></div>
          <div style={s.scope}><strong>Area protetta</strong><small>Solo pratiche della tua società</small></div>
        </section>

        <nav style={s.nav}>
          <span style={s.navGhost}>Panoramica</span><span style={s.navGhost}>Offerte</span><span style={s.navActive}>Pratiche</span><span style={s.navGhost}>Commissioni</span><span style={s.navGhost}>Collaboratori</span>
        </nav>

        {notice ? <div style={s.notice}>{notice}</div> : null}

        <section style={s.grid}>
          <article style={s.listPanel}>
            <div style={s.sectionHead}><div><span style={s.kicker}>LE TUE PRATICHE</span><h2 style={s.h2}>Richieste clienti</h2></div><span style={s.count}>1</span></div>
            <button style={s.practiceCard} type="button">
              <div style={s.cardTop}><strong>{practice.id}</strong><span style={s.status}>{labels[practice.status]}</span></div>
              <h3 style={s.h3}>{practice.vehicle}</h3>
              <span>{practice.version}</span>
              <div style={s.customer}><strong>{practice.customer}</strong><span>{practice.province} · {practice.email}</span><span>{practice.documents} documenti disponibili</span></div>
            </button>
          </article>

          <article style={s.detailPanel}>
            <div style={s.cardTop}><div><span style={s.kicker}>PRATICA {practice.id}</span><h2 style={s.h2}>{practice.vehicle}</h2><p style={s.muted}>{practice.version} · Offerta {practice.offerNumber}</p></div><span style={s.status}>{labels[practice.status]}</span></div>

            <div style={s.summary}>
              <div><span>Cliente</span><strong>{practice.customer}</strong></div>
              <div><span>Provincia</span><strong>{practice.province}</strong></div>
              <div><span>Documenti</span><strong>{practice.documents}</strong></div>
            </div>

            <section style={s.detailSection}>
              <span style={s.kicker}>CONTATTI CLIENTE</span>
              <p><strong>{practice.email}</strong><br />{practice.phone}</p>
            </section>

            <section style={s.detailSection}>
              <span style={s.kicker}>DOCUMENTI</span>
              <div style={s.docs}><span>📄 Documento identità</span><span>📄 Codice fiscale</span><span>📄 Ultima busta paga</span><span>📄 Documento reddituale</span></div>
            </section>

            {practice.status !== "DELIVERED" ? <section style={s.detailSection}>
              <span style={s.kicker}>NOTA OPERATIVA</span>
              <textarea style={s.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Scrivi una nota o indica cosa manca al cliente…" />
            </section> : null}

            <section style={s.actions}>
              {nextActions.map((action) => <button key={action.status} type="button" style={action.status === "NEEDS_INFO" ? s.secondary : s.primary} onClick={() => advance(action.status, action.label)}>{action.label}</button>)}
              {practice.status === "DELIVERED" ? <div style={s.done}>✓ Pratica conclusa · commissione maturata alla consegna</div> : null}
              <button type="button" style={s.reset} onClick={reset}>Ripristina demo</button>
            </section>
          </article>
        </section>

        <div style={s.safe}>PREVIEW SICURA · I pulsanti modificano solo questa demo locale. Nessuna pratica, cliente, documento o database reale viene modificato.</div>
        <footer style={s.footer}><strong>ECCOMI NOLEGGIO</strong> · Ideato e progettato by Eccomi OnLine</footer>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif" },
  header: { minHeight: 76, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px clamp(22px,5vw,72px)", background: "#fff", borderBottom: "1px solid #dce6f1", color: "#073f73" },
  block: { display: "block", marginTop: 3, color: "#6b7c90", fontSize: 11 }, secure: { color: "#267352" },
  content: { maxWidth: 1320, margin: "0 auto", padding: "34px 24px" },
  hero: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", padding: 28, borderRadius: 20, border: "1px solid #dce6f1", background: "#fff" },
  kicker: { color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".09em" }, title: { margin: "8px 0", fontSize: 42, fontWeight: 500 }, muted: { margin: 0, color: "#66768a", lineHeight: 1.5 }, scope: { display: "grid", gap: 4, padding: "14px 18px", borderRadius: 14, background: "#ecfdf3", color: "#166534" },
  nav: { display: "flex", gap: 9, flexWrap: "wrap", margin: "18px 0" }, navGhost: { padding: "10px 15px", border: "1px solid #9db7cf", borderRadius: 999, color: "#0c5597", fontWeight: 800, background: "#fff" }, navActive: { padding: "10px 15px", borderRadius: 999, color: "#fff", fontWeight: 800, background: "#0c66a8" },
  notice: { marginBottom: 14, padding: 13, borderRadius: 12, background: "#eef6ff", color: "#0c5597", fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "minmax(300px,.75fr) minmax(0,1.5fr)", gap: 14 }, listPanel: { padding: 20, borderRadius: 18, background: "#fff", border: "1px solid #dce6f1" }, detailPanel: { padding: 24, borderRadius: 18, background: "#fff", border: "1px solid #dce6f1" },
  sectionHead: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }, count: { minWidth: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 999, background: "#eef6ff", color: "#0c5597", fontWeight: 900 }, h2: { margin: "7px 0 0", fontSize: 24 }, h3: { margin: 0, fontSize: 22 },
  practiceCard: { width: "100%", display: "grid", gap: 10, textAlign: "left", padding: 18, borderRadius: 15, border: "1px solid #dbe6f0", background: "#fbfdff", color: "#102033" }, cardTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }, status: { padding: "6px 9px", borderRadius: 999, background: "#e9f7ef", color: "#25734f", fontSize: 11, fontWeight: 900 }, customer: { display: "grid", gap: 4, padding: 12, borderRadius: 11, background: "#f1f5f9", color: "#526274" },
  summary: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, margin: "22px 0" }, detailSection: { marginTop: 20, paddingTop: 18, borderTop: "1px solid #e4eaf0" }, docs: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }, textarea: { width: "100%", minHeight: 92, marginTop: 10, boxSizing: "border-box", border: "1px solid #cbd8e6", borderRadius: 12, padding: 12, fontSize: 15, resize: "vertical" },
  actions: { display: "flex", flexWrap: "wrap", gap: 9, marginTop: 22 }, primary: { minHeight: 42, border: 0, borderRadius: 10, padding: "9px 15px", background: "#1478bd", color: "#fff", fontWeight: 900, cursor: "pointer" }, secondary: { minHeight: 42, border: "1px solid #cbd8e6", borderRadius: 10, padding: "9px 15px", background: "#fff", color: "#0c5597", fontWeight: 900, cursor: "pointer" }, reset: { minHeight: 42, border: 0, background: "transparent", color: "#66768a", fontWeight: 700, cursor: "pointer" }, done: { flex: "1 0 100%", padding: 13, borderRadius: 11, background: "#ecfdf3", color: "#166534", fontWeight: 850 },
  safe: { marginTop: 16, padding: 13, borderRadius: 12, background: "#ecfdf3", color: "#166534", fontSize: 13, fontWeight: 800 }, footer: { marginTop: 34, padding: "24px 0 4px", borderTop: "1px solid #dce6f1", color: "#6b7c90", fontSize: 12, textAlign: "center" },
};
