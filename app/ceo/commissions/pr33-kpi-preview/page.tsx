import "../../ceo-server.css";

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function Pr33KpiPreviewPage() {
  const daFatturare = 0;
  const daIncassare = 0;
  const incassate = 50000;

  return (
    <main className="ceo-server-page">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <strong>PR33 · PREVIEW SICURA</strong>
      </header>

      <section className="ceo-server-heading">
        <small>NESSUNA SCRITTURA REALE · SOLO COLLAUDO VISIVO</small>
        <h1>Provvigioni ECCOMI</h1>
        <p>Anteprima dei soli KPI economici. Stati, calcoli e workflow non vengono modificati.</p>
      </section>

      <section className="ceo-server-kpis" aria-label="Anteprima KPI provvigioni ECCOMI">
        <article>
          <small>DA FATTURARE · IMPONIBILE</small>
          <strong>{money(daFatturare)}</strong>
          <span>IVA esclusa · crediti ECCOMI da fatturare</span>
        </article>
        <article>
          <small>DA INCASSARE · IMPONIBILE</small>
          <strong>{money(daIncassare)}</strong>
          <span>IVA esclusa · fatture emesse non ancora incassate</span>
        </article>
        <article>
          <small>INCASSATE · IMPONIBILE</small>
          <strong>{money(incassate)}</strong>
          <span>IVA esclusa · importi già incassati</span>
        </article>
      </section>
    </main>
  );
}
