import {
  basePermissionsForRole,
  type NoleggioPermission,
  type NoleggioRole,
} from "../lib/permissions";

const roles: Array<{
  role: NoleggioRole;
  title: string;
  subtitle: string;
  scope: string;
}> = [
  { role: "CEO", title: "CEO ECCOMI", subtitle: "Salvatore", scope: "Tutto ECCOMI NOLEGGIO + governance" },
  { role: "NOLEGGIO_MANAGER", title: "Responsabile Noleggio", subtitle: "Tony oggi · Arcibaldo domani", scope: "Tutto il verticale operativo" },
  { role: "NOLEGGIO_DEPUTY", title: "Vice Responsabile", subtitle: "Ruolo scalabile", scope: "Tutto il verticale secondo delega" },
  { role: "NOLEGGIO_OPERATOR", title: "Operatore ECCOMI", subtitle: "Account interno", scope: "Operatività secondo permessi" },
  { role: "PARTNER", title: "Partner", subtitle: "Account separato", scope: "Solo il proprio perimetro" },
];

const keyPermissions: Array<{ key: NoleggioPermission; label: string }> = [
  { key: "QUOTE_VERIFY", label: "Verifica quotazioni" },
  { key: "QUOTE_APPROVE", label: "Approva quotazioni" },
  { key: "PRACTICE_VIEW_ALL", label: "Vede tutte le pratiche" },
  { key: "PRACTICE_REASSIGN_RED", label: "Riassegna pratica rossa" },
  { key: "QUOTE_SUSPEND_OWN", label: "Sospende propria offerta" },
  { key: "QUOTE_ARCHIVE_OWN", label: "Archivia propria offerta" },
];

function hasBase(role: NoleggioRole, permission: NoleggioPermission) {
  return basePermissionsForRole(role).includes(permission);
}

function PermissionCell({ role, permission }: { role: NoleggioRole; permission: NoleggioPermission }) {
  if (permission === "QUOTE_APPROVE" && ["NOLEGGIO_MANAGER", "NOLEGGIO_DEPUTY", "NOLEGGIO_OPERATOR"].includes(role)) {
    return <span style={{ color: "#a16207", fontWeight: 800 }}>CEO abilita</span>;
  }
  const enabled = hasBase(role, permission);
  return <span style={{ color: enabled ? "#15803d" : "#94a3b8", fontWeight: 800 }}>{enabled ? "✓" : "—"}</span>;
}

export default function RolesPermissionsPreviewPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", color: "#102033", fontFamily: "Arial, sans-serif", padding: "28px 18px 60px" }}>
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ background: "linear-gradient(135deg,#073f73,#0b62a3)", color: "white", borderRadius: 24, padding: 28, boxShadow: "0 18px 45px rgba(7,63,115,.18)" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 900, letterSpacing: ".08em" }}>
            PREVIEW SICURA · PR13 · ACCOUNT + RUOLI + PERMESSI
          </div>
          <h1 style={{ margin: "16px 0 8px", fontSize: 36 }}>Governance ECCOMI NOLEGGIO</h1>
          <p style={{ margin: 0, maxWidth: 850, color: "#dcecff", lineHeight: 1.55 }}>
            Account separati, ruoli sostituibili e permessi controllati dal CEO. Nessuna persona è codificata nel software: Tony oggi, Arcibaldo domani, senza perdere storico o pratiche.
          </p>
        </header>

        <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(205px,1fr))", gap: 12 }}>
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
            <small style={{ color: "#0c5597", fontWeight: 900 }}>MATRICE V1</small>
            <h2 style={{ margin: "5px 0 0", fontSize: 23 }}>Chi può fare cosa</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800, fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 13 }}>Permesso</th>
                  {roles.map((item) => <th key={item.role} style={{ padding: 13 }}>{item.title}</th>)}
                </tr>
              </thead>
              <tbody>
                {keyPermissions.map((permission) => (
                  <tr key={permission.key} style={{ borderTop: "1px solid #edf2f7" }}>
                    <td style={{ padding: 13, fontWeight: 800 }}>{permission.label}</td>
                    {roles.map((item) => (
                      <td key={item.role} style={{ padding: 13, textAlign: "center" }}>
                        <PermissionCell role={item.role} permission={permission.key} />
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
            <small style={{ color: "#0c5597", fontWeight: 900 }}>STESSA PERSONA · DUE IDENTITÀ OPERATIVE</small>
            <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Tony resta separato</h2>
            <div style={{ background: "#eff6ff", borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <strong>tony.responsabile@eccomi.local</strong>
              <div style={{ marginTop: 4, color: "#475569" }}>Ruolo: Responsabile ECCOMI NOLEGGIO · vede il verticale.</div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 14, padding: 14 }}>
              <strong>tony.partner@partner.local</strong>
              <div style={{ marginTop: 4, color: "#475569" }}>Ruolo: PARTNER · vede esclusivamente il proprio perimetro.</div>
            </div>
            <p style={{ color: "#64748b", lineHeight: 1.5, marginBottom: 0 }}>Nessun “cambia ruolo”. L'audit sa sempre quale account ha compiuto l'azione.</p>
          </article>

          <article style={{ background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 20 }}>
            <small style={{ color: "#0c5597", fontWeight: 900 }}>SUBENTRO</small>
            <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Tony → Arcibaldo</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ padding: 13, borderRadius: 13, background: "#fff7ed" }}><strong>OGGI</strong> · Tony = Responsabile + altro account Partner</div>
              <div style={{ padding: 13, borderRadius: 13, background: "#ecfdf3" }}><strong>DOMANI</strong> · Arcibaldo = Responsabile · Tony resta solo Partner</div>
            </div>
            <p style={{ color: "#64748b", lineHeight: 1.5, marginBottom: 0 }}>Le pratiche appartengono a ECCOMI NOLEGGIO, non alla persona che ricopre il ruolo.</p>
          </article>
        </section>

        <section style={{ marginTop: 20, background: "#fff", border: "1px solid #dce6f1", borderRadius: 20, padding: 20 }}>
          <small style={{ color: "#0c5597", fontWeight: 900 }}>FLUSSO COMMERCIALE CONGELATO</small>
          <h2 style={{ margin: "7px 0 14px", fontSize: 22 }}>Partner → ECCOMI → Cliente</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontWeight: 800 }}>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#f1f5f9" }}>Bozza Partner</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#fff7ed" }}>Verifica ECCOMI</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#ecfdf3" }}>Pubblicata</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#eff6ff" }}>Lead al Partner origine</span><span>→</span>
            <span style={{ padding: "9px 12px", borderRadius: 999, background: "#fef2f2" }}>Se ROSSA: CEO/Responsabile può riassegnare</span>
          </div>
          <p style={{ color: "#64748b", lineHeight: 1.55, marginBottom: 0 }}>
            Il Partner può sospendere o archiviare subito una propria offerta non più sostenibile e può prorogarne la validità. Se cambia canone, anticipo, durata, km o condizioni economiche, la quotazione torna sotto verifica ECCOMI.
          </p>
        </section>

        <footer style={{ marginTop: 18, padding: 16, borderRadius: 16, background: "#ecfdf3", border: "1px solid #bbf7d0", color: "#166534", fontWeight: 800 }}>
          SERVER-SAFE · ZERO JS · Questa preview non modifica utenti, ruoli, permessi o database di produzione.
        </footer>
      </section>
    </main>
  );
}
