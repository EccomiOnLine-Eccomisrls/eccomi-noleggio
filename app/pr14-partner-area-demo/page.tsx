const card = { background: "#fff", border: "1px solid #dce6f1", borderRadius: 18, padding: 18 } as const;
const pill = { display: "inline-block", padding: "6px 9px", borderRadius: 999, background: "#ecfdf3", color: "#166534", fontWeight: 900, fontSize: 12 } as const;

export default function PartnerAreaDemoPage() {
  const offers = [
    ["4022223346", "FIAT PANDA", "ONLINE", "03/09/2026"],
    ["4022223351", "KIA PICANTO", "IN VERIFICA", "08/09/2026"],
    ["4022223360", "JEEP AVENGER", "SOSPESA", "15/09/2026"],
  ];
  return <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif", padding: "26px 18px 60px" }}>
    <section style={{ maxWidth: 1280, margin: "0 auto" }}>
      <header style={{ background: "linear-gradient(135deg,#073f73,#0b62a3)", color: "#fff", borderRadius: 24, padding: 28 }}>
        <small style={{ fontWeight: 900, letterSpacing: ".08em" }}>PREVIEW SICURA · PR14 · AREA PARTNER</small>
        <h1 style={{ margin: "12px 0 8px", fontSize: 36 }}>Area Partner · perimetro reale</h1>
        <p style={{ margin: 0, color: "#dcecff", maxWidth: 900 }}>Il CEO non entra automaticamente. Partner e Partner Admin vedono soltanto offerte, pratiche, documenti, commissioni e collaboratori della propria società.</p>
      </header>

      <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
        <article style={{ ...card, background: "#fff7ed" }}><small style={{ color: "#9a3412", fontWeight: 900 }}>SESSIONE CEO</small><h2 style={{ margin: "7px 0" }}>Accesso Partner negato</h2><p style={{ margin: 0, color: "#64748b" }}>La sessione CEO non viene riutilizzata per aprire dati Partner.</p></article>
        <article style={{ ...card, background: "#ecfdf3" }}><small style={{ color: "#166534", fontWeight: 900 }}>PARTNER / PARTNER ADMIN</small><h2 style={{ margin: "7px 0" }}>Scope server-side</h2><p style={{ margin: 0, color: "#64748b" }}>Ogni richiesta è vincolata al proprio <code>partner_id</code>, anche aprendo direttamente un URL.</p></article>
      </section>

      <section style={{ marginTop: 18, ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div><small style={{ color: "#0c5597", fontWeight: 900 }}>PARTNER ADMIN</small><h2 style={{ margin: "5px 0 2px", fontSize: 28 }}>Goal Rent SRL</h2><p style={{ margin: 0, color: "#64748b" }}>Account demo Partner Admin · solo perimetro Goal Rent</p></div>
          <div style={{ padding: "11px 13px", borderRadius: 13, background: "#eff6ff", color: "#0c5597", fontWeight: 800 }}>🔒 Perimetro protetto</div>
        </div>
      </section>

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 11 }}>
        {[['Offerte online','13','2 in verifica'],['Pratiche aperte','4','7 totali'],['Commissioni','€ 1.250','maturato'],['Collaboratori','3','Partner Admin']].map(([label,value,note]) => <article key={label} style={card}><small style={{ color: "#64748b", fontWeight: 800 }}>{label}</small><strong style={{ display: "block", margin: "8px 0 4px", fontSize: 28 }}>{value}</strong><span style={{ color: "#64748b", fontSize: 13 }}>{note}</span></article>)}
      </section>

      <nav style={{ margin: "16px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>{["Panoramica","Offerte","Pratiche","Commissioni","Collaboratori"].map((label,index) => <span key={label} style={{ padding: "8px 12px", borderRadius: 999, background: index === 0 ? "#0c5597" : "#fff", color: index === 0 ? "#fff" : "#0c5597", border: "1px solid #cbd8e6", fontWeight: 800 }}>{label}</span>)}</nav>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
        <article style={card}><small style={{ color: "#0c5597", fontWeight: 900 }}>OPERATIVITÀ</small><h2 style={{ margin: "7px 0 12px" }}>Cosa richiede attenzione</h2><div style={{ padding: 14, borderRadius: 13, background: "#fff7ed" }}><strong>4 pratiche aperte</strong><p style={{ margin: "5px 0 0", color: "#64748b" }}>Il Partner lavora soltanto le proprie richieste.</p></div></article>
        <article style={card}><small style={{ color: "#0c5597", fontWeight: 900 }}>SICUREZZA</small><h2 style={{ margin: "7px 0 12px" }}>Barriera di società</h2><p style={{ color: "#64748b" }}>Un account Goal Rent non può aprire una pratica, un PDF, una copertina o una quotazione appartenente a un altro Partner.</p><span style={pill}>403 se fuori perimetro</span></article>
      </section>

      <section style={{ marginTop: 14, ...card }}><small style={{ color: "#0c5597", fontWeight: 900 }}>LE TUE OFFERTE</small><h2 style={{ margin: "7px 0 12px" }}>Quotazioni e pubblicazioni</h2><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}><thead><tr style={{ background: "#f8fafc" }}><th style={{ textAlign: "left", padding: 11 }}>Offerta</th><th style={{ textAlign: "left", padding: 11 }}>Veicolo</th><th style={{ textAlign: "left", padding: 11 }}>Stato</th><th style={{ textAlign: "left", padding: 11 }}>Scadenza</th></tr></thead><tbody>{offers.map((item) => <tr key={item[0]} style={{ borderTop: "1px solid #edf2f7" }}>{item.map((value) => <td key={value} style={{ padding: 11 }}>{value}</td>)}</tr>)}</tbody></table></div></section>

      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        <article style={card}><small style={{ color: "#0c5597", fontWeight: 900 }}>PARTNER</small><h2 style={{ margin: "7px 0" }}>Vede il proprio lavoro</h2><p style={{ color: "#64748b" }}>Offerte · pratiche · clienti collegati · documenti · commissioni.</p></article>
        <article style={card}><small style={{ color: "#0c5597", fontWeight: 900 }}>PARTNER ADMIN</small><h2 style={{ margin: "7px 0" }}>In più vede i collaboratori</h2><p style={{ color: "#64748b" }}>L’elenco è già isolato sulla propria società. Creazione/disattivazione verrà collegata al flusso dedicato.</p></article>
      </section>

      <footer style={{ marginTop: 16, padding: 15, borderRadius: 15, background: "#ecfdf3", color: "#166534", fontWeight: 900 }}>SERVER-SAFE · ZERO JS · Preview senza utenti reali e senza modifiche al database di produzione.</footer>
    </section>
  </main>;
}
