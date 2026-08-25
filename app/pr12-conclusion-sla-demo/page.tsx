export default function Pr12ConclusionSlaDemo() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 80px", fontFamily: "Arial, sans-serif", color: "#10213a" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", marginBottom: 30 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.2, color: "#0b6faf", marginBottom: 10 }}>
            PREVIEW SICURA · PR12 · TIMESTAMP + SLA ECCOMI
          </div>
          <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: 0 }}>Coerenza workflow interno ECCOMI</h1>
          <p style={{ fontSize: 18, color: "#687b92" }}>Verifica server-only. Nessuna scrittura su Supabase.</p>
        </div>
        <span style={{ background: "#e8f8ee", color: "#137638", borderRadius: 999, padding: "10px 14px", fontWeight: 800 }}>
          SERVER-SAFE · ZERO JS
        </span>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
        <article style={{ border: "1px solid #bdddf1", background: "#f3f9fd", borderRadius: 20, padding: 24 }}>
          <small style={{ fontWeight: 800, color: "#0b6faf" }}>CASO 1 · CONTRATTO INTERNO</small>
          <h2 style={{ marginBottom: 10 }}>SLA ECCOMI</h2>
          <p style={{ color: "#5d7188" }}>Una pratica gestita dalla struttura interna non deve attribuire il tempo al partner.</p>
          <div style={{ marginTop: 24, background: "white", border: "1px solid #d6e3ed", borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6d7f93" }}>STATO</div>
            <strong style={{ display: "block", fontSize: 20, marginTop: 6 }}>Contratto acquisito</strong>
          </div>
          <div style={{ marginTop: 12, background: "#eaf8ef", border: "1px solid #b9e5c7", borderRadius: 14, padding: 18, color: "#176b35" }}>
            <strong>🟢 0h · SLA ECCOMI OK</strong>
            <div style={{ marginTop: 6 }}>0 ore · SLA ECCOMI regolare (limite 72h)</div>
          </div>
        </article>

        <article style={{ border: "1px solid #bdddf1", background: "#f3f9fd", borderRadius: 20, padding: 24 }}>
          <small style={{ fontWeight: 800, color: "#0b6faf" }}>CASO 2 · VEICOLO CONSEGNATO</small>
          <h2 style={{ marginBottom: 10 }}>Conclusione da audit</h2>
          <p style={{ color: "#5d7188" }}>Il vecchio completed_at del modulo cliente resta storico; la conclusione operativa arriva dall’audit workflow.</p>
          <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
            <div style={{ background: "#fff4f4", border: "1px solid #efc4c4", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#9b3b3b" }}>VECCHIO DATO NON USATO COME CONCLUSIONE</div>
              <strong style={{ display: "block", marginTop: 6 }}>30 lug 2026, 08:44</strong>
            </div>
            <div style={{ background: "#eaf8ef", border: "1px solid #b9e5c7", borderRadius: 14, padding: 18, color: "#176b35" }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>CONCLUSA · AUDIT PRACTICE_STATUS_DELIVERED</div>
              <strong style={{ display: "block", fontSize: 20, marginTop: 6 }}>25 ago 2026, 23:15</strong>
            </div>
          </div>
        </article>
      </section>

      <div style={{ marginTop: 22, border: "1px solid #c5ddeb", background: "white", borderRadius: 14, padding: "14px 16px", color: "#42627b", fontWeight: 700 }}>
        PR12 non modifica completed_at e non cambia il workflow. Corregge solo la sorgente della data mostrata e l’owner SLA per ECCOMI interno.
      </div>
    </main>
  );
}
