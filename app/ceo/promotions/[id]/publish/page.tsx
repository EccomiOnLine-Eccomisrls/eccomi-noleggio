/* eslint-disable @next/next/no-html-link-for-pages -- Server-side fallback intentionally uses native navigation. */
import { GET as getPromotion } from "../../../../api/promotions/[id]/edit/route";
import { getActor } from "../../../../lib/server/authz";
import { currentRequest } from "../../../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import CeoLoginFallback from "../../../ceo-login-fallback";
import "../../../ceo-server.css";

type PublishPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type Promotion = {
  id: string;
  offerNumber: string;
  brand: string;
  model: string;
  version: string;
  monthlyGrossCents: number;
  depositGrossCents: number;
  durationMonths: number;
  totalKm: number;
  validUntil: string;
  delivery: string;
  fuel: string;
  transmission: string;
  color: string;
  services: string[];
  warnings: string[];
  status: string;
  shopifyProductId: string | null;
  shopifyUrl: string | null;
};

function queryValue(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default async function CeoPromotionPublishPage({
  params,
  searchParams,
}: PublishPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const request = await currentRequest(`/api/promotions/${id}/edit`);
  const actor = await getActor(request);

  if (!actor) return <CeoLoginFallback />;

  const response = await getPromotion(request, {
    params: Promise.resolve({ id }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    promotion?: Promotion;
    error?: string;
    preview?: boolean;
  };

  if (!response.ok || !payload.promotion) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Offerta non disponibile</h1>
          <p>{payload.error || "La promozione richiesta non è stata trovata."}</p>
          <a className="ceo-server-primary" href="/ceo/promotions">Torna alle promozioni</a>
        </section>
      </main>
    );
  }

  const promotion = payload.promotion;
  const preview = payload.preview === true || isRenderPullRequestPreview(request);
  const published = queryValue(query, "published");
  const publishError = queryValue(query, "publishError");
  const canPublish =
    Boolean(promotion.shopifyProductId) &&
    ["PENDING_APPROVAL", "APPROVED"].includes(promotion.status);

  return (
    <main className="ceo-server-page" data-server-publish-ready="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href={`/ceo/promotions/${id}`}>← Torna all&apos;offerta</a>
      </header>

      <section className="ceo-server-heading">
        <small>{preview ? "PR24 · PREVIEW SICURA" : "SOLO CEO · PUBBLICAZIONE REALE"}</small>
        <h1>Conferma pubblicazione</h1>
        <p>Controlla i dati essenziali prima di rendere visibile l&apos;offerta online.</p>
      </section>

      {published ? (
        <div className="ceo-server-result">
          <strong>{published === "preview" ? "SIMULAZIONE PUBBLICAZIONE COMPLETATA" : "PUBBLICAZIONE COMPLETATA"}</strong>
          <div>{published === "preview" ? "Preview sicura: nessuna scrittura su Shopify o Supabase." : "L’offerta è stata approvata dal CEO e pubblicata online."}</div>
        </div>
      ) : null}
      {publishError ? <div className="ceo-server-result--error">{publishError}</div> : null}

      <section className="ceo-server-panel">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>{promotion.brand}</small>
            <strong>{promotion.model}</strong>
            <em className="ceo-server-status">{promotion.status}</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>OFFERTA {promotion.offerNumber}</small>
            <h2>{promotion.brand} {promotion.model}</h2>
            <p>{promotion.version}</p>
            <div className="ceo-server-promotion__metrics">
              <span>{money(promotion.monthlyGrossCents)}/mese</span>
              <span>{promotion.durationMonths} mesi</span>
              <span>{promotion.totalKm.toLocaleString("it-IT")} km</span>
              <span>Scadenza: {promotion.validUntil}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="ceo-server-editor">
        <fieldset>
          <legend>Controllo finale</legend>
          <div className="ceo-server-fields ceo-server-fields--four">
            <label><span>Canone</span><input readOnly value={money(promotion.monthlyGrossCents)} /></label>
            <label><span>Anticipo</span><input readOnly value={money(promotion.depositGrossCents)} /></label>
            <label><span>Durata</span><input readOnly value={`${promotion.durationMonths} mesi`} /></label>
            <label><span>Km totali</span><input readOnly value={promotion.totalKm.toLocaleString("it-IT")} /></label>
            <label><span>Alimentazione</span><input readOnly value={promotion.fuel} /></label>
            <label><span>Cambio</span><input readOnly value={promotion.transmission} /></label>
            <label><span>Colore</span><input readOnly value={promotion.color} /></label>
            <label><span>Scadenza</span><input readOnly value={promotion.validUntil} /></label>
            <label className="ceo-server-wide"><span>Consegna</span><input readOnly value={promotion.delivery} /></label>
          </div>
        </fieldset>

        <div className="ceo-server-shopify">
          <strong>PRODOTTO SHOPIFY COLLEGATO</strong>
          <code>{promotion.shopifyProductId || "Prodotto non ancora creato"}</code>
        </div>

        <footer className="ceo-server-actions">
          <a className="ceo-server-secondary" href={`/ceo/promotions/${id}`}>Annulla</a>
          {promotion.shopifyUrl ? (
            <a className="ceo-server-secondary" href={promotion.shopifyUrl} target="_blank" rel="noreferrer">Apri offerta online</a>
          ) : null}
          {canPublish ? (
            <form method="post" action={`/api/promotions/${encodeURIComponent(id)}/publish-form`}>
              <button className="ceo-server-primary" type="submit">
                {preview ? "SIMULA PUBBLICAZIONE ONLINE" : "🚀 CONFERMA PUBBLICAZIONE ONLINE"}
              </button>
            </form>
          ) : null}
        </footer>
      </section>
    </main>
  );
}
