type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

type PreviewView = "overview" | "offers" | "practices" | "commissions" | "team";

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function resolveView(value: string | undefined): PreviewView {
  return value === "offers" || value === "practices" || value === "commissions" || value === "team" ? value : "overview";
}

const shell: React.CSSProperties = { minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif" };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #dce6f1", borderRadius: 20 };
const pill: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "9px 14px", borderRadius: 999, border: "1px solid #b7c9da", background: "#fff", color: "#0c5597", fontWeight: 800, textDecoration: "none" };
const activePill: React.CSSProperties = { ...pill, background: "#0c5597", color: "#fff", borderColor: "#0c5597" };

export default async function Pr28WorkspacePreview({ searchParams }: PageProps) {
  const query = await searchParams;
  const view = resolveView(queryValue(query, "view"));
  const href = (target: PreviewView) => `/partner/pr28-workspace-preview?view=${target}`;

  return (
    <main style={shell}>
      <header style={{ minHeight: 86, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px clamp(22px,5vw,72px)", background: "#fff", borderBottom: "1px solid #e4eaf0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "#0c74bb", color: "#fff", fontSize: 24 }}>🚙</span>
          <span>
            <strong style={{ display: "block", color: "#073f73", fontSize: 18 }}>ECCOMI NOLEGGIO</strong>
            <small style={{ display: "block", color: "#073f73", fontWeight: 700 }}>by Eccomi OnLine</small>
            <small style={{ display: "block", color: "#073f73", letterSpacing: ".12em", fontSize: 10, fontWeight: 800 }}>AREA PARTNER</small>
          </span>
        </div>
        <span style={{ color: "#267352", fontWeight: 800 }}>🛡 Perimetro protetto</span>
      </header>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 24px 70px" }}>
        <div style={{ marginBottom: 14, color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".1em" }}>PR28 · PREVIEW SICURA · NESSUNA SCRITTURA REALE</div>

        <section style={{ ...card, padding: 26, display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <div><small style={{ color: "#0c5597", fontWeight: 900, letterSpacing: ".08em" }}>PARTNER ADMIN</small><h1 style={{ margin: "8px 0", fontSize: 38 }}>Eccomi OnLine Test</h1><p style={{ margin: 0, color: "#66768a" }}>Eccomi OnLine Test S.r.l. · Sasa</p></div>
          <div style={{ padding: "12px 16px", borderRadius: 14, background: "#ecfdf3", color: "#166534", fontWeight: 800 }}>🏢 Area protetta <span style={{ fontWeight: 500 }}>Accesso riservato alla tua organizzazione</span></div>
        </section>

        <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[['Offerte online','1','0 in verifica'],['Pratiche aperte','0','0 totali'],['Provvigioni dovute','0,00 €','maturate'],['Collaboratori','1','gestibili dal Partner Admin']].map(([label,value,sub]) => <article key={label} style={{ ...card, padding: 18 }}><div style={{ fontSize: 17 }}>{label}</div><strong style={{ display: "block", margin: "8px 0 5px", fontSize: 20 }}>{value}</strong><small>{sub}</small></article>)}
        </section>

        <nav style={{ margin: "18px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={href("overview")} style={view === "overview" ? activePill : pill}>Panoramica</a>
          <a href={href("offers")} style={view === "offers" ? activePill : pill}>Offerte</a>
          <a href={href("practices")} style={view === "practices" ? activePill : pill}>Pratiche</a>
          <a href={href("commissions")} style={view === "commissions" ? activePill : pill}>Commissioni</a>
          <a href="/partner/provvigioni" style={pill}>Extra Gara</a>
          <a href={href("team")} style={view === "team" ? activePill : pill}>Collaboratori</a>
        </nav>

        {view === "overview" ? (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
            <article style={{ ...card, padding: 22 }}><small style={{ color: "#0c5597", fontWeight: 900 }}>OPERATIVITÀ</small><h2 style={{ margin: "8px 0" }}>Cosa richiede attenzione</h2><p style={{ color: "#66768a", marginBottom: 0 }}>Nessuna pratica aperta. Le offerte pubblicate sono operative.</p></article>
            <article style={{ ...card, padding: 22 }}><small style={{ color: "#0c5597", fontWeight: 900 }}>SICUREZZA</small><h2 style={{ margin: "8px 0" }}>Perimetro della società</h2><p style={{ color: "#66768a", marginBottom: 0 }}>Offerte, pratiche e condizioni economiche restano riservate alla tua organizzazione.</p></article>
          </section>
        ) : null}

        {view === "offers" ? (
          <section style={{ display: "grid", gap: 14 }}>
            <article style={{ ...card, padding: 22 }}>
              <small style={{ color: "#0c5597", fontWeight: 900 }}>NUOVA QUOTAZIONE</small>
              <h2 style={{ margin: "8px 0" }}>Carica il PDF del noleggiatore</h2>
              <p style={{ color: "#66768a" }}>ECCOMI estrae i dati, prepara la scheda e la mette in verifica. Il Partner non pubblica direttamente.</p>
              <div style={{ marginTop: 16, border: "1px dashed #9db7cf", borderRadius: 13, padding: 18, color: "#0c5597", fontWeight: 800 }}>⇧ Seleziona quotazione PDF <small style={{ fontWeight: 500 }}>PDF · massimo 15 MB · preview disabilitata</small></div>
            </article>
            <article style={{ ...card, padding: 22 }}>
              <small style={{ color: "#0c5597", fontWeight: 900 }}>LE TUE OFFERTE</small>
              <h2 style={{ margin: "8px 0 18px" }}>Quotazioni e pubblicazioni</h2>
              <div style={{ border: "1px solid #e0e8f0", borderRadius: 16, padding: 18, background: "#fbfdff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong style={{ color: "#0c5597" }}>OFFERTA 4022223739</strong><span style={{ padding: "6px 9px", borderRadius: 999, background: "#e9f7ef", color: "#25734f", fontSize: 11, fontWeight: 900 }}>PUBBLICATA</span></div>
                <h3 style={{ fontSize: 22, marginBottom: 6 }}>FIAT Ducato 3</h3><p style={{ color: "#66768a" }}>DUCATO 33 L2H2 140CV 2.2</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 20, marginTop: 16 }}><div>Canone <strong>624,77 €</strong></div><div>Scadenza <strong>15 set 2026</strong></div></div>
              </div>
            </article>
          </section>
        ) : null}

        {view === "practices" ? (
          <section style={{ ...card, padding: 24 }}><small style={{ color: "#0c5597", fontWeight: 900 }}>LE TUE PRATICHE</small><h2 style={{ margin: "10px 0" }}>Richieste clienti</h2><p style={{ margin: 0, color: "#66768a" }}>Nessuna pratica associata alla società in questa preview.</p></section>
        ) : null}

        {view === "commissions" ? (
          <section style={{ ...card, padding: 24 }}>
            <small style={{ color: "#0c5597", fontWeight: 900, letterSpacing: ".08em" }}>PROVVIGIONI DOVUTE</small>
            <h2 style={{ margin: "10px 0", fontSize: 26 }}>0,00 € maturate</h2>
            <p style={{ margin: "12px 0 6px", fontWeight: 850 }}>CONTRATTO ACQUISITO</p>
            <p style={{ margin: 0, color: "#66768a" }}>La provvigione ECCOMI matura quando il contratto viene acquisito.</p>
          </section>
        ) : null}

        {view === "team" ? (
          <section style={{ ...card, padding: 24 }}><small style={{ color: "#0c5597", fontWeight: 900 }}>PARTNER ADMIN</small><h2 style={{ margin: "10px 0 16px" }}>Collaboratori della tua società</h2><div style={{ border: "1px solid #e0e8f0", borderRadius: 14, padding: 16 }}><strong>Sasa</strong><br /><small>PARTNER_ADMIN · ATTIVO</small></div></section>
        ) : null}
      </div>
    </main>
  );
}
