"use client";

import { useState } from "react";

type Section = "overview" | "offers" | "practices" | "commissions" | "team";

const nav: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Panoramica" },
  { id: "offers", label: "Offerte" },
  { id: "practices", label: "Pratiche" },
  { id: "commissions", label: "Commissioni" },
  { id: "team", label: "Collaboratori" },
];

export default function Pr20WorkspaceBrandingDemo() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div style={s.brand}>
          <span style={s.icon}>🚗</span>
          <span style={s.brandCopy}>
            <strong>ECCOMI NOLEGGIO · AREA PARTNER</strong>
            <small>by Eccomi OnLine</small>
          </span>
        </div>
        <strong style={s.secure}>🛡️ Perimetro protetto</strong>
      </header>

      <div style={s.content}>
        <section style={s.hero}>
          <div><span style={s.kicker}>PARTNER ADMIN · AREA PARTNER</span><h1 style={s.title}>Eccomi OnLine Test</h1><p style={s.muted}>Eccomi OnLine Test S.r.l. · Sasa</p></div>
          <div style={s.scope}><strong>Area protetta</strong><small>Accesso riservato alla tua organizzazione</small></div>
        </section>

        <section style={s.kpis}>
          <button type="button" style={s.cardButton} onClick={() => setSection("offers")}><span>Offerte online</span><strong>0</strong><small>0 in verifica</small></button>
          <button type="button" style={s.cardButton} onClick={() => setSection("practices")}><span>Pratiche aperte</span><strong>0</strong><small>0 totali</small></button>
          <button type="button" style={s.cardButton} onClick={() => setSection("commissions")}><span>Commissioni</span><strong>0,00 €</strong><small>maturato registrato</small></button>
          <button type="button" style={s.cardButton} onClick={() => setSection("team")}><span>Collaboratori</span><strong>1</strong><small>gestibili dal Partner Admin</small></button>
        </section>

        <div style={s.workspaceLabel}>IL TUO SPAZIO DI LAVORO</div>
        <nav style={s.nav}>
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              style={section === item.id ? s.active : s.button}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {section === "overview" ? (
          <section style={s.twoCol}>
            <article style={s.panel}><span style={s.kicker}>OPERATIVITÀ</span><h2>Cosa richiede attenzione</h2><div style={s.ok}>✓ Nessuna pratica aperta.</div></article>
            <article style={s.panel}><span style={s.kicker}>SICUREZZA</span><h2>Perimetro della società</h2><p style={s.muted}>Offerte, clienti, documenti e commissioni restano filtrati server-side sulla tua organizzazione.</p></article>
          </section>
        ) : null}

        {section === "offers" ? (
          <section style={s.panel}><span style={s.kicker}>OFFERTE</span><h2>Le tue quotazioni e pubblicazioni</h2><p style={s.muted}>Qui il Partner carica le quotazioni, segue la verifica ECCOMI e gestisce disponibilità, sospensione, riattivazione, scadenza e archivio delle proprie offerte.</p><div style={s.info}>Gestisci qui le tue quotazioni e pubblicazioni.</div></section>
        ) : null}

        {section === "practices" ? (
          <section style={s.panel}><span style={s.kicker}>PRATICHE</span><h2>Le tue richieste clienti</h2><p style={s.muted}>Qui compaiono esclusivamente le pratiche collegate alla tua organizzazione, con cliente, veicolo, documenti e stato di avanzamento.</p><div style={s.info}>Nessuna pratica presente.</div></section>
        ) : null}

        {section === "commissions" ? (
          <section style={s.panel}><span style={s.kicker}>COMMISSIONI</span><h2>Il tuo maturato</h2><p style={s.muted}>La commissione matura alla consegna. Questa area conterrà maturate, da fatturare, fatturate, pagate e storico.</p><div style={s.info}>Maturato: 0,00 €.</div></section>
        ) : null}

        {section === "team" ? (
          <section style={s.panel}><span style={s.kicker}>COLLABORATORI</span><h2>Persone della tua società</h2><p style={s.muted}>Il Partner Admin può invitare, vedere e disattivare i collaboratori della propria organizzazione.</p><div style={s.info}>1 Partner Admin.</div></section>
        ) : null}

        <footer style={s.footer}><strong>ECCOMI NOLEGGIO</strong> · Ideato e progettato by Eccomi OnLine</footer>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 5vw", background: "#fff", borderBottom: "1px solid #dce6f1" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandCopy: { display: "grid", gap: 3, color: "#073f73" },
  icon: { width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 12, background: "#1281c5" },
  secure: { color: "#25734f" },
  content: { maxWidth: 1320, margin: "0 auto", padding: "32px 24px 32px" },
  hero: { display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", padding: 28, background: "#fff", border: "1px solid #dce6f1", borderRadius: 20 },
  kicker: { color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".09em" },
  title: { margin: "8px 0", fontSize: 42, fontWeight: 500 },
  muted: { color: "#66768a", lineHeight: 1.55 },
  scope: { display: "grid", gap: 4, alignSelf: "center", padding: "14px 18px", borderRadius: 14, background: "#ecfdf3", color: "#166534" },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 16 },
  cardButton: { display: "grid", gap: 10, padding: 20, textAlign: "left", background: "#fff", color: "#102033", border: "1px solid #dce6f1", borderRadius: 16, cursor: "pointer" },
  workspaceLabel: { marginTop: 20, color: "#0c5597", fontSize: 11, fontWeight: 900, letterSpacing: ".1em" },
  nav: { display: "flex", flexWrap: "wrap", gap: 9, margin: "8px 0 20px" },
  button: { padding: "10px 16px", border: "1px solid #9db7cf", borderRadius: 999, background: "#fff", color: "#0c5597", fontWeight: 800, cursor: "pointer" },
  active: { padding: "10px 16px", border: 0, borderRadius: 999, background: "#0c66a8", color: "#fff", fontWeight: 800, cursor: "pointer" },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 },
  panel: { padding: 22, background: "#fff", border: "1px solid #dce6f1", borderRadius: 18 },
  ok: { marginTop: 16, padding: 14, borderRadius: 12, background: "#ecfdf3", color: "#166534", fontWeight: 800 },
  info: { marginTop: 16, padding: 14, borderRadius: 12, background: "#eef6ff", color: "#0c5597", fontWeight: 700 },
  footer: { marginTop: 44, padding: "24px 0 4px", borderTop: "1px solid #dce6f1", color: "#6b7c90", fontSize: 12, textAlign: "center" },
};
