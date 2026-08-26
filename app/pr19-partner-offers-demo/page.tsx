const offers = [
  { offer: "4022223346", car: "FIAT PANDA", version: "1.0 Hybrid", status: "PUBBLICATA", date: "03/09/2026", actions: ["Aggiorna scadenza", "Sospendi", "Archivia"] },
  { offer: "4022223351", car: "KIA PICANTO", version: "1.0 GDi AMT Urban", status: "IN VERIFICA ECCOMI", date: "08/09/2026", actions: ["Archivia"] },
  { offer: "4022223360", car: "JEEP AVENGER", version: "1.2 e-Hybrid", status: "SOSPESA", date: "15/09/2026", actions: ["Aggiorna scadenza", "Riattiva", "Archivia"] },
  { offer: "4022223370", car: "RENAULT CAPTUR", version: "E-Tech Full Hybrid", status: "SCADUTA", date: "25/08/2026", actions: ["Aggiorna scadenza", "Archivia"] },
];

export default function Pr19PartnerOffersDemo() {
  return <main style={s.page}>
    <header style={s.header}><div><strong style={s.brand}>ECCOMI NOLEGGIO</strong><span style={s.sub}>AREA PARTNER · by Eccomi OnLine</span></div><span style={s.secure}>🛡️ Perimetro protetto</span></header>
    <div style={s.content}>
      <section style={s.hero}><div><span style={s.kicker}>PREVIEW SICURA · PR19</span><h1 style={s.title}>Offerte Partner operative</h1><p style={s.muted}>Il Partner carica la quotazione, ECCOMI la verifica e solo dopo viene pubblicata. Disponibilità e scadenza restano gestibili dal Partner.</p></div><div style={s.scope}><strong>Area protetta</strong><small>Solo offerte della tua organizzazione</small></div></section>

      <nav style={s.nav}><span>Panoramica</span><strong>Offerte</strong><span>Pratiche</span><span>Commissioni</span><span>Collaboratori</span></nav>

      <section style={s.panel}>
        <span style={s.kicker}>NUOVA QUOTAZIONE</span><h2 style={s.h2}>Carica il PDF del noleggiatore</h2><p style={s.muted}>L’AI estrae i dati e prepara la proposta. Il Partner non ha un pulsante “Pubblica”.</p>
        <div style={s.upload}><div style={s.file}>⬆️ <span><strong>Seleziona quotazione PDF</strong><small>PDF · massimo 15 MB</small></span></div><button disabled style={s.primary}>Invia a verifica ECCOMI</button></div>
      </section>

      <section style={s.panel}>
        <div style={s.head}><div><span style={s.kicker}>LE TUE OFFERTE</span><h2 style={s.h2}>Quotazioni e pubblicazioni</h2></div><span style={s.count}>4</span></div>
        <div style={s.grid}>{offers.map((item) => <article key={item.offer} style={s.card}>
          <div style={s.row}><span style={s.code}>OFFERTA {item.offer}</span><span style={s.status}>{item.status}</span></div>
          <h3 style={s.h3}>{item.car}</h3><p style={s.muted}>{item.version}</p>
          <div style={s.meta}><div><small>SCADENZA</small><strong>{item.date}</strong></div><div><small>GESTIONE</small><strong>{item.status === "IN VERIFICA ECCOMI" ? "ECCOMI sta verificando" : "Partner"}</strong></div></div>
          {item.status !== "IN VERIFICA ECCOMI" ? <div style={s.dateRow}><div><small>Nuova scadenza</small><div style={s.fakeInput}>gg/mm/aaaa</div></div><button disabled style={s.secondary}>Aggiorna scadenza</button></div> : <div style={s.info}>ECCOMI sta verificando la quotazione. Non devi fare altro.</div>}
          <div style={s.actions}>{item.actions.filter((action) => action !== "Aggiorna scadenza").map((action) => <button disabled key={action} style={action === "Archivia" ? s.danger : s.secondary}>{action}</button>)}</div>
        </article>)}</div>
      </section>

      <div style={s.preview}>PREVIEW SICURA · I pulsanti sono disattivati solo qui. In produzione le azioni reali sono protette da account, permessi e partner_id.</div>
      <footer style={s.footer}><strong>ECCOMI NOLEGGIO</strong> · Ideato e progettato by Eccomi OnLine</footer>
    </div>
  </main>;
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", padding: "18px 5vw", background: "#fff", borderBottom: "1px solid #dce6f1" }, brand: { color: "#073f73" }, sub: { display: "block", marginTop: 4, color: "#66768a", fontSize: 12 }, secure: { color: "#166534", fontWeight: 800 },
  content: { maxWidth: 1320, margin: "0 auto", padding: "32px 24px 60px" }, hero: { display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", padding: 28, border: "1px solid #dce6f1", borderRadius: 20, background: "#fff" }, kicker: { color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".09em" }, title: { margin: "8px 0", fontSize: 40, fontWeight: 500 }, muted: { margin: 0, color: "#66768a", lineHeight: 1.5 }, scope: { display: "grid", gap: 4, alignSelf: "center", padding: "14px 18px", borderRadius: 14, background: "#ecfdf3", color: "#166534" },
  nav: { display: "flex", gap: 9, flexWrap: "wrap", margin: "18px 0" }, panel: { marginBottom: 14, padding: 22, border: "1px solid #dce6f1", borderRadius: 18, background: "#fff" }, h2: { margin: "7px 0 8px", fontSize: 25 }, upload: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, marginTop: 17 }, file: { display: "flex", gap: 12, alignItems: "center", padding: 14, border: "1px dashed #9db7cf", borderRadius: 12, color: "#0c5597" }, primary: { border: 0, borderRadius: 11, padding: "12px 20px", background: "#1478bd", color: "#fff", fontWeight: 900 }, head: { display: "flex", justifyContent: "space-between", gap: 12 }, count: { width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 999, background: "#eff6ff", color: "#0c5597", fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 13 }, card: { display: "grid", gap: 11, padding: 18, border: "1px solid #e0e8f0", borderRadius: 16, background: "#fbfdff" }, row: { display: "flex", justifyContent: "space-between", gap: 10 }, code: { color: "#0c5597", fontSize: 12, fontWeight: 900 }, status: { padding: "6px 8px", borderRadius: 999, background: "#e9f7ef", color: "#25734f", fontSize: 11, fontWeight: 900 }, h3: { margin: 0, fontSize: 22 }, meta: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }, dateRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", borderTop: "1px solid #e5edf5", paddingTop: 10 }, fakeInput: { marginTop: 5, padding: 9, borderRadius: 9, border: "1px solid #cbd8e6", color: "#94a3b8" }, secondary: { padding: "9px 12px", border: "1px solid #cbd8e6", borderRadius: 10, background: "#fff", color: "#0c5597", fontWeight: 800 }, danger: { padding: "9px 12px", border: "1px solid #fecaca", borderRadius: 10, background: "#fff", color: "#b42318", fontWeight: 800 }, actions: { display: "flex", gap: 8, flexWrap: "wrap" }, info: { padding: 11, borderRadius: 10, background: "#eff6ff", color: "#0c5597", fontSize: 13, fontWeight: 700 }, preview: { marginTop: 18, padding: 13, borderRadius: 11, background: "#ecfdf3", color: "#166534", fontWeight: 800 }, footer: { marginTop: 26, paddingTop: 20, borderTop: "1px solid #dce6f1", textAlign: "center", color: "#66768a", fontSize: 12 },
};
