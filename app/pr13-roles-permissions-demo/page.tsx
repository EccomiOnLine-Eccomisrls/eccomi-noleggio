import type { NoleggioRole } from "../lib/permissions";

const roles: Array<{
  role: NoleggioRole;
  title: string;
  subtitle: string;
  scope: string;
}> = [
  { role: "CEO", title: "CEO ECCOMI", subtitle: "Salvatore", scope: "Governance completa" },
  { role: "NOLEGGIO_MANAGER", title: "Responsabile", subtitle: "Ruolo sostituibile", scope: "Gestione operativa del verticale" },
  { role: "NOLEGGIO_DEPUTY", title: "Vice", subtitle: "Base limitata", scope: "Permessi aggiunti dal CEO" },
  { role: "NOLEGGIO_OPERATOR", title: "Operatore", subtitle: "Account ECCOMI", scope: "Vede il verticale, agisce per permessi" },
  { role: "PARTNER_ADMIN", title: "Partner Admin", subtitle: "Società Partner", scope: "Gestisce i collaboratori della propria società" },
  { role: "PARTNER", title: "Partner", subtitle: "Account separato", scope: "Solo il proprio perimetro" },
];

type MatrixRow = {
  area: string;
  label: string;
  values: Record<NoleggioRole, string>;
};

const matrixRows: MatrixRow[] = [
  {
    area: "GOVERNANCE",
    label: "Vede tutto ECCOMI NOLEGGIO",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "✓", NOLEGGIO_OPERATOR: "✓", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "GOVERNANCE",
    label: "Attiva / disattiva Partner",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "—", NOLEGGIO_OPERATOR: "—", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "GOVERNANCE",
    label: "Propone nuovo Operatore ECCOMI",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "—", NOLEGGIO_OPERATOR: "—", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "GOVERNANCE",
    label: "Approva creazione / disattivazione Operatore",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "Propone", NOLEGGIO_DEPUTY: "—", NOLEGGIO_OPERATOR: "—", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "PERMESSI",
    label: "Modifica permessi sensibili",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "—", NOLEGGIO_DEPUTY: "—", NOLEGGIO_OPERATOR: "—", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "PERMESSI",
    label: "Gestisce permessi ordinari Operatori",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "—", NOLEGGIO_OPERATOR: "—", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "PARTNER",
    label: "Crea / disattiva collaboratori della propria società",
    values: { CEO: "Supervisione", NOLEGGIO_MANAGER: "Supervisione", NOLEGGIO_DEPUTY: "—", NOLEGGIO_OPERATOR: "—", PARTNER_ADMIN: "✓", PARTNER: "—" },
  },
  {
    area: "QUOTAZIONI",
    label: "Inserisce quotazione",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "✓", PARTNER_ADMIN: "Proprie", PARTNER: "Proprie" },
  },
  {
    area: "QUOTAZIONI",
    label: "Approva / pubblica quotazione",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "CEO abilita", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "OFFERTE",
    label: "Sospende / archivia propria offerta",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "✓", PARTNER: "✓" },
  },
  {
    area: "OFFERTE",
    label: "Riattiva propria offerta sospesa, se invariata",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "✓", PARTNER: "✓" },
  },
  {
    area: "OFFERTE",
    label: "Ripristina offerta archiviata",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "PRATICHE",
    label: "Vede tutte le pratiche",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "✓", NOLEGGIO_OPERATOR: "✓", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "PRATICHE",
    label: "Lavora le proprie pratiche Partner",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "✓", PARTNER: "✓" },
  },
  {
    area: "PRATICHE",
    label: "Riassegna pratica ROSSA",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
  {
    area: "DOCUMENTI",
    label: "Sostituisce / rimuove documento proprio con audit",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "✓", PARTNER: "✓" },
  },
  {
    area: "COMMISSIONI",
    label: "Vede tutte le commissioni",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "✓", NOLEGGIO_DEPUTY: "CEO abilita", NOLEGGIO_OPERATOR: "CEO abilita", PARTNER_ADMIN: "Solo proprie", PARTNER: "Solo proprie" },
  },
  {
    area: "COMMISSIONI",
    label: "Imposta / corregge importo commissione",
    values: { CEO: "✓", NOLEGGIO_MANAGER: "—", NOLEGGIO_DEPUTY: "—", NOLEGGIO_OPERATOR: "—", PARTNER_ADMIN: "—", PARTNER: "—" },
  },
];

function cellStyle(value: string) {
  if (value === "✓" || value === "Proprie" || value === "Solo proprie") return { color: "#15803d", fontWeight: 800 };
  if (value === "—") return { color: "#94a3b8", fontWeight: 800 };
  if (value.includes("CEO")) return { color: "#a16207", fontWeight: 800 };
  return { color: "#0c5597", fontWeight: 800 };
}

export default function RolesPermissionsPreviewPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif", padding: "28px 18px 60px" }}>
      <section style={{ maxWidth: 1320, margin: "0 auto" }}>
        <header style={{ background: "linear-gradient(135deg,#073f73,#0b62a3)", color: "white", borderRadius: 24, padding: 28, boxShadow: "0 18px 45px rgba(7,63,115,.18)" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 900, letterSpacing: ".08em" }}>
            PREVIEW SICURA · PR13 · MATRICE APPROVATA
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: 36 }}>Account, Ruoli e Permessi v1</h1>
          <p style={{ margin: 0, maxWidth: 950, color: "#dcecff", lineHeight: 1.55 }}>
            Default chiari, permessi modificabili e barriere strutturali. Il CEO governa i permessi; il Responsabile gestisce solo quelli ordinari degli Operatori e non può modificare i propri o quelli sensibili.
          </p>
        </header>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          {roles.map((item) => (
            <article key={item.role} style={{ background: "white", border: "1px solid #dce6f1", borderRadius: 18, padding: 18 }}>
              <small style={{ color: "#0c5597", fontWeight: 900 }}>{item.role}</small>
              <h2 style={{ fontSize: 18, margin: "7px 0 4px" }}>{item.title}</h2>
              <strong style={{ display: "block", color: "#334155", fontSize: 13 }}>{item.subtitle}</strong>
              <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, marginBottom: 0 }}>{item.scope}</p>
            </article>
          ))}
        </section>

        <section style={{ marginTop: 20, background: "white", border: "1px solid #dce6f1", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: 20, borderBottom: "1px solid #edf2f7" }}>
            <small style={{ color: "#0c5597", fontWeight: 900 }}>MATRICE V1 DEFINITIVA</small>
            <h2 style={{ margin: "5px 0 4px", fontSize: 23 }}>Chi può fare cosa</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>✓ = base attiva · CEO abilita = permesso aggiungibile · — = non previsto nel ruolo.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 13 }}>Area</th>
                  <th style={{ textAlign: "left", padding: 13 }}>Permesso</th>
                  {roles.map((item) => <th key={item.role} style={{ padding: 13 }}>{item.title}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, index) => (
                  <tr key={`${row.area}-${row.label}`} style={{ borderTop: "1px solid #edf2f7", background: index % 2 ? "#fcfdff" : "white" }}>
                    <td style={{ padding: 13, color: "#0c5597", fontWeight: 900, fontSize: 11 }}>{row.area}</td>
                    <td style={{ padding: 13, fontWeight: 800, minWidth: 260 }}>{row.label}</td>
                    {roles.map((item) => (
                      <td key={item.role} style={{ padding: 13, textAlign: "center", ...cellStyle(row.values[item.role]) }}>
                        {row.values[item.role]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          <article style={{ background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 20 }}>
            <small style={{ color: "#0c5597", fontWeight: 900 }}>REGOLE CONGELATE</small>
            <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Le 10 decisioni approvate</h2>
            <div style={{ color: "#475569", lineHeight: 1.65, fontSize: 14 }}>
              <div>1. Partner: attivazione/disattivazione CEO + Responsabile.</div>
              <div>2. Partner Admin: gestisce i collaboratori della propria società.</div>
              <div>3. Commissioni: importo modificabile solo dal CEO, per ora.</div>
              <div>4. Offerta sospesa invariata: il Partner può riattivarla.</div>
              <div>5. Offerta archiviata: ripristino solo ECCOMI.</div>
              <div>6. Documento errato: Partner può sostituire/rimuovere con audit.</div>
              <div>7. Operatore ECCOMI: Responsabile propone, CEO approva.</div>
              <div>8. Vice: parte con permessi base limitati.</div>
              <div>9. Operatore: vede tutte le pratiche, agisce secondo permessi.</div>
              <div>10. Permessi: CEO governa; Responsabile solo ordinari Operatori.</div>
            </div>
          </article>

          <article style={{ background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 20 }}>
            <small style={{ color: "#0c5597", fontWeight: 900 }}>BARRIERE DI SISTEMA</small>
            <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Queste non sono semplici toggle</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 13, borderRadius: 13, background: "#fef2f2" }}><strong>Partner isolato</strong> · non può accedere ai dati di altre società.</div>
              <div style={{ padding: 13, borderRadius: 13, background: "#fef2f2" }}><strong>Niente auto-approvazione</strong> · Partner e Partner Admin non approvano quotazioni.</div>
              <div style={{ padding: 13, borderRadius: 13, background: "#fef2f2" }}><strong>Audit permanente</strong> · le correzioni lasciano sempre traccia.</div>
              <div style={{ padding: 13, borderRadius: 13, background: "#eff6ff" }}><strong>Account separati</strong> · ruolo ECCOMI e ruolo Partner non si cambiano con uno switch.</div>
            </div>
          </article>
        </section>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          <article style={{ background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 20 }}>
            <small style={{ color: "#0c5597", fontWeight: 900 }}>STESSA PERSONA · DUE IDENTITÀ OPERATIVE</small>
            <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Robin resta separato</h2>
            <div style={{ background: "#eff6ff", borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <strong>robin.responsabile@eccomi.local</strong>
              <div style={{ marginTop: 4, color: "#475569" }}>Ruolo: Responsabile ECCOMI NOLEGGIO.</div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 14, padding: 14 }}>
              <strong>robin.partner@partner.local</strong>
              <div style={{ marginTop: 4, color: "#475569" }}>Ruolo: PARTNER · solo proprio perimetro.</div>
            </div>
          </article>

          <article style={{ background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 20 }}>
            <small style={{ color: "#0c5597", fontWeight: 900 }}>SUBENTRO</small>
            <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Robin → Arcibaldo</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 13, borderRadius: 13, background: "#fff7ed" }}><strong>OGGI</strong> · Robin ricopre il ruolo di Responsabile.</div>
              <div style={{ padding: 13, borderRadius: 13, background: "#ecfdf3" }}><strong>DOMANI</strong> · Arcibaldo subentra; Robin può restare Partner sul suo account separato.</div>
            </div>
          </article>
        </section>

        <section style={{ marginTop: 20, background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 20 }}>
          <small style={{ color: "#0c5597", fontWeight: 900 }}>FLUSSO COMMERCIALE</small>
          <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Partner → ECCOMI → Cliente</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontWeight: 800 }}>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#f1f5f9" }}>Bozza Partner</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#fff7ed" }}>Verifica ECCOMI</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#ecfdf3" }}>Pubblicata</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#eff6ff" }}>Lead al Partner origine</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#fef2f2" }}>Se ROSSA: ECCOMI può riassegnare</span>
          </div>
        </section>

        <footer style={{ marginTop: 18, padding: 16, borderRadius: 16, background: "#ecfdf3", border: "1px solid #bbf7d0", color: "#166534", fontWeight: 800 }}>
          SERVER-SAFE · ZERO JS · Questa preview non modifica utenti, ruoli, permessi o database di produzione.
        </footer>
      </section>
    </main>
  );
}
