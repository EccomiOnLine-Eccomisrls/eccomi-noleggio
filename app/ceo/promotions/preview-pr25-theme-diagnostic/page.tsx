/* eslint-disable @next/next/no-html-link-for-pages -- Dedicated PR preview uses native navigation. */
import { shopifyAdminFetch } from "../../../lib/server/shopify";
import "../../ceo-server.css";

type ThemeList = {
  themes: {
    nodes: Array<{ id: string; name: string; role: string }>;
  };
};

type ThemeFiles = {
  theme: {
    files: {
      nodes: Array<{
        filename: string;
        checksumMd5: string | null;
        body:
          | { content?: string | null }
          | { contentBase64?: string | null }
          | { url?: string | null }
          | null;
      }>;
      userErrors: Array<{ code?: string | null; filename?: string | null }>;
    };
  } | null;
};

function excerptAround(source: string, needle: string) {
  const normalized = source || "";
  const index = normalized.toLocaleLowerCase("it").indexOf(needle.toLocaleLowerCase("it"));
  if (index < 0) return "La frase non è presente nel file live letto da Shopify.";
  const start = Math.max(0, index - 2200);
  const end = Math.min(normalized.length, index + needle.length + 3200);
  return normalized.slice(start, end);
}

export default async function Pr25ThemeDiagnosticPreview() {
  let themeName = "Non disponibile";
  let themeId = "";
  let sectionChecksum = "";
  let templateChecksum = "";
  let excerpt = "";
  let error = "";

  try {
    const themeList = await shopifyAdminFetch<ThemeList>(
      `query Pr25MainTheme {
        themes(first: 5, roles: [MAIN]) {
          nodes { id name role }
        }
      }`,
    );

    const mainTheme = themeList.themes.nodes.find((theme) => theme.role === "MAIN") || themeList.themes.nodes[0];
    if (!mainTheme) throw new Error("Tema Shopify MAIN non trovato.");

    themeName = mainTheme.name;
    themeId = mainTheme.id;

    const fileResult = await shopifyAdminFetch<ThemeFiles>(
      `query Pr25ThemeFiles($themeId: ID!, $filenames: [String!]!) {
        theme(id: $themeId) {
          files(filenames: $filenames) {
            nodes {
              filename
              checksumMd5
              body {
                ... on OnlineStoreThemeFileBodyText { content }
                ... on OnlineStoreThemeFileBodyBase64 { contentBase64 }
                ... on OnlineStoreThemeFileBodyUrl { url }
              }
            }
            userErrors { code filename }
          }
        }
      }`,
      {
        themeId,
        filenames: [
          "sections/eccomi-noleggio-product.liquid",
          "templates/product.eccomi-noleggio.json",
        ],
      },
    );

    const files = fileResult.theme?.files.nodes || [];
    const section = files.find((file) => file.filename === "sections/eccomi-noleggio-product.liquid");
    const template = files.find((file) => file.filename === "templates/product.eccomi-noleggio.json");
    sectionChecksum = section?.checksumMd5 || "—";
    templateChecksum = template?.checksumMd5 || "—";

    const content = section?.body && "content" in section.body ? section.body.content || "" : "";
    excerpt = excerptAround(content, "Perché scegliere ECCOMI NOLEGGIO");

    if (fileResult.theme?.files.userErrors?.length) {
      error = fileResult.theme.files.userErrors
        .map((item) => `${item.code || "THEME_FILE_ERROR"}${item.filename ? ` · ${item.filename}` : ""}`)
        .join(" · ");
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Diagnostica Shopify non disponibile.";
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
        <small>TEMA SHOPIFY LIVE · NESSUNA SCRITTURA</small>
        <h1>Controllo dei 3 box vuoti</h1>
        <p>Leggiamo solo il frammento del tema pubblicato relativo a “Perché scegliere ECCOMI NOLEGGIO”.</p>
      </section>

      {error ? (
        <div className="ceo-server-result--error">
          <strong>DIAGNOSTICA NON COMPLETA</strong>
          <div>{error}</div>
        </div>
      ) : (
        <div className="ceo-server-result">
          <strong>TEMA LIVE LETTO CORRETTAMENTE</strong>
          <div>Nessun dato o file Shopify è stato modificato.</div>
        </div>
      )}

      <section className="ceo-server-panel">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__copy">
            <small>TEMA PUBBLICATO</small>
            <h2>{themeName}</h2>
            <p>{themeId || "ID non disponibile"}</p>
            <div className="ceo-server-promotion__metrics">
              <span>Section checksum: {sectionChecksum || "—"}</span>
              <span>Template checksum: {templateChecksum || "—"}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="ceo-server-editor">
        <fieldset>
          <legend>Frammento live attorno ai 3 box</legend>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
            {excerpt || "Nessun frammento disponibile."}
          </pre>
        </fieldset>
      </section>
    </main>
  );
}
