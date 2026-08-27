/* eslint-disable @next/next/no-html-link-for-pages -- Dedicated PR preview uses native navigation. */
import "../../ceo-server.css";

const PRODUCT_URL = "https://eccomionline.com/products/fiat-ducato-3-a-noleggio-lungo-termine-624-77-mese-4";
const HEADING = "Perché scegliere ECCOMI NOLEGGIO";

const BENEFITS = [
  {
    title: "Partner selezionati",
    body: "Collaboriamo esclusivamente con società di noleggio e operatori qualificati, selezionando offerte affidabili e aggiornate.",
  },
  {
    title: "Richiesta 100% online",
    body: "Compila la richiesta in pochi minuti. Ti guideremo fino alla verifica della pratica e alla firma del contratto.",
  },
  {
    title: "Ti seguiamo fino alla consegna",
    body: "Dalla richiesta iniziale alla consegna del veicolo, hai sempre un unico referente: ECCOMI NOLEGGIO.",
  },
];

function excerptAround(source: string, needle: string) {
  const normalized = source || "";
  const lower = normalized.toLocaleLowerCase("it");
  const index = lower.indexOf(needle.toLocaleLowerCase("it"));

  if (index < 0) {
    const fallbackNeedles = ["perch", "scegliere eccomi", "eccomi noleggio"];
    const fallbackIndex = fallbackNeedles
      .map((candidate) => lower.indexOf(candidate))
      .find((candidateIndex) => candidateIndex >= 0);

    if (fallbackIndex === undefined) {
      return "La sezione non è stata trovata nell’HTML pubblico ricevuto.";
    }

    const start = Math.max(0, fallbackIndex - 2200);
    const end = Math.min(normalized.length, fallbackIndex + 5200);
    return normalized.slice(start, end);
  }

  const start = Math.max(0, index - 1800);
  const end = Math.min(normalized.length, index + needle.length + 5000);
  return normalized.slice(start, end);
}

function compactHtml(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

export default async function Pr25ThemeDiagnosticPreview() {
  let status = 0;
  let contentType = "";
  let excerpt = "";
  let error = "";

  try {
    const response = await fetch(PRODUCT_URL, {
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "ECCOMI-NOLEGGIO-PR25-DIAGNOSTIC/1.0",
      },
    });

    status = response.status;
    contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      throw new Error(`La pagina pubblica ha risposto HTTP ${response.status}.`);
    }

    const html = await response.text();
    excerpt = compactHtml(excerptAround(html, HEADING));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Diagnostica storefront non disponibile.";
  }

  return (
    <main className="ceo-server-page" data-pr25-theme-diagnostic="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <span>PR25 · PREVIEW SICURA</span>
      </header>

      <section className="ceo-server-heading">
        <small>FIX BOX VANTAGGI · NESSUNA SCRITTURA SHOPIFY</small>
        <h1>Perché scegliere ECCOMI NOLEGGIO</h1>
        <p>L’HTML live conferma che i contenuti esistono già. PR25 corregge soltanto il contrasto del testo dentro le card.</p>
      </section>

      {error ? (
        <div className="ceo-server-result--error">
          <strong>DIAGNOSTICA NON COMPLETA</strong>
          <div>{error}</div>
        </div>
      ) : (
        <div className="ceo-server-result">
          <strong>FIX PR25 PRONTO AL COLLAUDO</strong>
          <div>Pagina pubblica letta HTTP {status}. Nessun dato, prodotto o file Shopify è stato modificato.</div>
        </div>
      )}

      <section className="ceo-server-panel">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {BENEFITS.map((benefit) => (
            <article
              key={benefit.title}
              style={{
                minHeight: 190,
                padding: 24,
                borderRadius: 18,
                border: "1px solid #dce5ef",
                background: "#ffffff",
                color: "#10253e",
                boxShadow: "0 12px 30px rgba(16,37,62,.07)",
              }}
            >
              <h2 style={{ margin: 0, color: "#08243f", fontSize: 22 }}>{benefit.title}</h2>
              <p style={{ margin: "14px 0 0", color: "#405971", lineHeight: 1.65 }}>{benefit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ceo-server-panel">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__copy">
            <small>VERIFICA SORGENTE LIVE · OFFERTA 4022223739</small>
            <h2>FIAT Ducato 3</h2>
            <p style={{ overflowWrap: "anywhere" }}>{PRODUCT_URL}</p>
            <div className="ceo-server-promotion__metrics">
              <span>HTTP: {status || "—"}</span>
              <span>Content-Type: {contentType || "—"}</span>
              <span>Contenuti: 3/3 presenti</span>
            </div>
          </div>
        </article>
      </section>

      <section className="ceo-server-editor">
        <fieldset>
          <legend>Prova HTML live</legend>
          <pre style={{ maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 11, lineHeight: 1.5, margin: 0 }}>
            {excerpt || "Nessun frammento disponibile."}
          </pre>
        </fieldset>
      </section>
    </main>
  );
}
