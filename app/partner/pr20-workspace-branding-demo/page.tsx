export default function Pr20WorkspaceBrandingDemo() {
  return (
    <main style={s.page}>
      <header style={s.header}>
        <div style={s.brand}><span style={s.icon}>🚗</span><span><strong>ECCOMI</strong><small>NOLEGGIO · AREA PARTNER</small></span></div>
        <strong style={s.secure}>🛡️ Perimetro protetto</strong>
      </header>

      <div style={s.content}>
        <section style={s.hero}>
          <div><span style={s.kicker}>PARTNER ADMIN · PREVIEW SICURA PR20</span><h1 style={s.title}>Eccomi OnLine Test</h1><p style={s.muted}>Eccomi OnLine Test S.r.l. · Sasa</p></div>
          <div style={s.scope}><strong>Area protetta</strong><small>Accesso riservato alla tua organizzazione</small></div>
        </section>

        <section style={s.kpis}>
          <div style={s.card}><span>Offerte online</span><strong>0</strong><small>0 in verifica</small></div>
          <div style={s.card}><span>Pratiche aperte</span><strong>0</strong><small>0 totali</small></div>
          <div style={s.card}><span>Commissioni</span><strong>0,00 €</strong><small>maturato registrato</small></div>
          <div style={s.card}><span>Collaboratori</span><strong>1</strong><small>gestibili dal Partner Admin</small></div>
        </section>

        <nav style={s.nav}>
          <button style={s.active}>Panoramica</button><button style={s.button}>Offerte</button><button style={s.button}>Pratiche</button><button style={s.button}>Commissioni</button><button style={s.button}>Collaboratori</button>
        </nav>

        <section style={s.twoCol}>
          <article style={s.panel}><span style={s.kicker}>OPERATIVITÀ</span><h2>Cosa richiede attenzione</h2><div style={s.ok}>✓ Nessuna pratica aperta.</div></article>
          <article style={s.panel}><span style={s.kicker}>SICUREZZA</span><h2>Perimetro della società</h2><p style={s.muted}>Offerte, clienti, documenti e commissioni restano filtrati server-side sulla tua organizzazione.</p></article>
        </section>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 5vw", background: "#fff", borderBottom: "1px solid #dce6f1" },
  brand: { display: "flex", alignItems: "center", gap: 12 }, icon: { width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 12, background: "#1281c5" }, secure: { color: "#25734f" },
  content: { maxWidth: 1320, margin: "0 auto", padding: "32px 24px 56px" }, hero: { display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", padding: 28, background: "#fff", border: "1px solid #dce6f1", borderRadius: 20 }, kicker: { color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".09em" }, title: { margin: "8px 0", fontSize: 42, fontWeight: 500 }, muted: { color: "#66768a" }, scope: { display: "grid", gap: 4, alignSelf: "center", padding: "14px 18px", borderRadius: 14, background: "#ecfdf3", color: "#166534" },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 16 }, card: { display: "grid", gap: 10, padding: 20, background: "#fff", border: "1px solid #dce6f1", borderRadius: 16 },
  nav: { display: "flex", flexWrap: "wrap", gap: 9, margin: "20px 0" }, button: { padding: "10px 16px", border: "1px solid #9db7cf", borderRadius: 999, background: "#fff", color: "#0c5597", fontWeight: 800 }, active: { padding: "10px 16px", border: 0, borderRadius: 999, background: "#0c66a8", color: "#fff", fontWeight: 800 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }, panel: { padding: 22, background: "#fff", border: "1px solid #dce6f1", borderRadius: 18 }, ok: { marginTop: 16, padding: 14, borderRadius: 12, background: "#ecfdf3", color: "#166534", fontWeight: 800 },
};
