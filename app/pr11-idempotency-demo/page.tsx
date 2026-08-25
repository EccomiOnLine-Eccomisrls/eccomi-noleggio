export default async function Pr11IdempotencyDemo({
  searchParams,
}: {
  searchParams: Promise<{ repeat?: string }>;
}) {
  const params = await searchParams;
  const repeated = params.repeat === "1";

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "Arial, sans-serif", color: "#10213a" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.2, color: "#0b6faf", marginBottom: 10 }}>
            PREVIEW SICURA · PR11 · ANTI DOPPIO INVIO
          </div>
          <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: 0 }}>Preventivo predisposto</h1>
          <p style={{ fontSize: 18, color: "#6b7b91" }}>Simulazione server-only del reinvio dello stesso comando.</p>
        </div>
        <span style={{ background: "#e8f8ee", color: "#137638", borderRadius: 999, padding: "10px 14px", fontWeight: 800 }}>
          SERVER-SAFE · ZERO JS
        </span>
      </header>

      <section style={{ background: "#f2f8fd", border: "1px solid #bdddf1", borderRadius: 22, padding: 28 }}>
        <h2 style={{ marginTop: 0 }}>Test idempotenza</h2>
        <p style={{ fontSize: 17 }}>
          Stato corrente: <strong>Preventivo predisposto</strong>
        </p>
        <p style={{ color: "#5f7188" }}>
          Il primo invio ha già portato la pratica a QUOTE. Se lo stesso comando arriva una seconda volta, PR11 deve trattarlo come già applicato e non come errore.
        </p>

        <form method="get" style={{ marginTop: 22 }}>
          <button
            type="submit"
            name="repeat"
            value="1"
            style={{ border: 0, borderRadius: 12, background: "#0878b9", color: "white", fontSize: 16, fontWeight: 800, padding: "14px 20px" }}
          >
            Reinvia “Preventivo predisposto”
          </button>
        </form>

        {repeated ? (
          <div role="status" style={{ marginTop: 20, border: "1px solid #b9e5c7", background: "#eaf8ef", color: "#176b35", borderRadius: 12, padding: "14px 16px", fontWeight: 800 }}>
            Stato già aggiornato: Preventivo predisposto. Nessuna seconda modifica eseguita.
          </div>
        ) : (
          <div style={{ marginTop: 20, border: "1px solid #c9ddec", background: "white", borderRadius: 12, padding: "14px 16px", color: "#547087" }}>
            Premi il pulsante una volta: la pagina deve ricaricarsi con conferma verde e senza errore rosso.
          </div>
        )}
      </section>
    </main>
  );
}
