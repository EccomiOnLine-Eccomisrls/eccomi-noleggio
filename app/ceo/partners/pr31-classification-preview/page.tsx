import { isInternalEccomiPartner } from "../../../lib/server/partner-control-rules";

const cards = [
  { id: "eccomi-direct", name: "ECCOMI", legalName: "ECCOMI SRLS" },
  { id: "eccomi-online-test-d579233b", name: "Eccomi OnLine Test", legalName: "Eccomi Srls" },
];

export default function Pr31ClassificationPreviewPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f3f7fb", color: "#10233e", padding: "40px 5vw", fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 44 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 12, background: "#087ab8", fontSize: 24 }}>🚙</span>
          <div><strong style={{ display: "block", letterSpacing: 1.4 }}>ECCOMI</strong><small style={{ letterSpacing: 4 }}>NOLEGGIO</small></div>
        </div>
        <strong style={{ color: "#0b65a3" }}>PR31 · PREVIEW SICURA</strong>
      </header>

      <section style={{ marginBottom: 30 }}>
        <small style={{ color: "#0b65a3", fontWeight: 800, letterSpacing: 1.5 }}>CLASSIFICAZIONE RETE · NESSUNA SCRITTURA REALE</small>
        <h1 style={{ fontSize: "clamp(42px, 6vw, 72px)", margin: "14px 0" }}>Una sola struttura interna</h1>
        <p style={{ fontSize: 20, color: "#66788f" }}>Solo ECCOMI è interno. Tutte le altre aziende restano Partner, anche se la ragione sociale contiene “Eccomi”.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
        {cards.map((card) => {
          const internal = isInternalEccomiPartner(card.name, card.legalName);
          return (
            <article key={card.id} style={{ background: "white", border: "1px solid #cfdeec", borderRadius: 18, padding: 26, boxShadow: "0 12px 30px rgba(36,69,103,.06)" }}>
              <small style={{ fontWeight: 900, color: internal ? "#0b65a3" : "#65778c", letterSpacing: 1.2 }}>
                {internal ? "STRUTTURA INTERNA · CONTROLLO CEO" : "PARTNER · CONTROLLO CEO"}
              </small>
              <h2 style={{ fontSize: 30, margin: "12px 0 5px" }}>{card.name}</h2>
              <p style={{ color: "#697b91", marginTop: 0 }}>{card.legalName}</p>
              <div style={{ marginTop: 28, padding: 18, borderRadius: 12, background: internal ? "#eef7ff" : "#f5f8fb" }}>
                <strong>{internal ? "PROTETTO · NON ELIMINABILE" : "PARTNER · ELIMINA / VERIFICA DISPONIBILE"}</strong>
              </div>
              {!internal ? (
                <button type="button" disabled style={{ marginTop: 18, border: 0, borderRadius: 10, padding: "13px 18px", background: "#0b78b8", color: "white", fontWeight: 800, opacity: 1 }}>
                  Elimina / verifica
                </button>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
