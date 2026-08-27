/* eslint-disable @next/next/no-html-link-for-pages -- Dedicated PR preview uses native navigation. */
import "../../ceo-server.css";

const PRODUCT_URL = "https://eccomionline.com/products/fiat-ducato-3-a-noleggio-lungo-termine-624-77-mese-4";
const HEADING = "Perché scegliere ECCOMI NOLEGGIO";

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

    const start = Math.max(0, fallbackIndex - 3000);
    const end = Math.min(normalized.length, fallbackIndex + 7000);
    return normalized.slice(start, end);
  }

  const start = Math.max(0, index - 3200);
  const end = Math.min(normalized.length, index + needle.length + 8000);
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
        <span>PR25 · DIAGNOSTICA READ-ONLY</span>
      </header>

      <section className="ceo-server-heading">
        <small>STOREFRONT SHOPIFY LIVE · NESSUNA SCRITTURA</small>
        <h1>Controllo dei 3 box vuoti</h1>
        <p>Leggiamo l’HTML già pubblico del Ducato, senza richiedere accesso ai file del tema Shopify.</p>
      </section>

      {error ? (
        <div className="ceo-server-result--error">
          <strong>DIAGNOSTICA NON COMPLETA</strong>
          <div>{error}</div>
        </div>
      ) : (
        <div className="ceo-server-result">
          <strong>PAGINA PUBBLICA LETTA CORRETTAMENTE</strong>
          <div>Nessun dato, prodotto o file Shopify è stato modificato.</div>
        </div>
      )}

      <section className="ceo-server-panel">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__copy">
            <small>PRODOTTO PUBBLICATO · OFFERTA 4022223739</small>
            <h2>FIAT Ducato 3</h2>
            <p style={{ overflowWrap: "anywhere" }}>{PRODUCT_URL}</p>
            <div className="ceo-server-promotion__metrics">
              <span>HTTP: {status || "—"}</span>
              <span>Content-Type: {contentType || "—"}</span>
              <span>Ricerca: “{HEADING}”</span>
            </div>
          </div>
        </article>
      </section>

      <section className="ceo-server-editor">
        <fieldset>
          <legend>HTML live attorno ai 3 box</legend>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
            {excerpt || "Nessun frammento disponibile."}
          </pre>
        </fieldset>
      </section>
    </main>
  );
}
