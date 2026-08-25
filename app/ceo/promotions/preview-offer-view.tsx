/* eslint-disable @next/next/no-html-link-for-pages -- Preview view intentionally uses native links on iPad. */
import { notFound } from "next/navigation";
import { getActor } from "../../lib/server/authz";
import { currentRequest } from "../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../lib/server/preview-mode";
import { previewPromotionEditable } from "../../lib/server/preview-fixture";
import "../ceo-server.css";

type PreviewPromotion = typeof previewPromotionEditable;

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function dateOnly(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(date);
}

export default async function PreviewOfferView({ promotion }: { promotion: PreviewPromotion }) {
  const request = await currentRequest(`/ceo/promotions/${promotion.id}`);
  if (!isRenderPullRequestPreview(request)) notFound();

  const actor = await getActor(request);
  if (!actor || actor.role !== "CEO") notFound();

  return (
    <main className="ceo-server-page" data-preview-partner-offer-ready="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo/partners">← Gestione Partner</a>
      </header>

      <section className="ceo-server-heading">
        <small>PREVIEW SICURA · OFFERTA DIMOSTRATIVA</small>
        <h1>{promotion.brand} {promotion.model}</h1>
        <p>{promotion.version}</p>
      </section>

      <section className="ceo-server-kpis" aria-label="Riepilogo offerta demo">
        <article><small>CANONE</small><strong>{money(promotion.monthlyGrossCents)}</strong><span>al mese</span></article>
        <article><small>DURATA</small><strong>{promotion.durationMonths}</strong><span>mesi</span></article>
        <article><small>CHILOMETRI</small><strong>{promotion.totalKm.toLocaleString("it-IT")}</strong><span>totali</span></article>
      </section>

      <section className="ceo-server-panel">
        <article className="ceo-server-promotion">
          <div className="ceo-server-promotion__vehicle">
            <small>OFFERTA</small>
            <strong>{promotion.offerNumber}</strong>
            <em className="ceo-server-status ceo-server-status--online">ONLINE · DEMO</em>
          </div>
          <div className="ceo-server-promotion__copy">
            <small>{promotion.provider}</small>
            <h2>{promotion.brand} {promotion.model}</h2>
            <p>{promotion.version}</p>
            <div className="ceo-server-promotion__metrics">
              <span>Anticipo: {money(promotion.depositGrossCents)}</span>
              <span>Alimentazione: {promotion.fuel}</span>
              <span>Cambio: {promotion.transmission}</span>
              <span>Consegna: {promotion.delivery}</span>
              <span>Scadenza: {dateOnly(promotion.validUntil)}</span>
            </div>
          </div>
          <div className="ceo-server-promotion__actions">
            <a className="ceo-server-secondary" href="/ceo/partners">Torna ai partner</a>
          </div>
        </article>
      </section>
    </main>
  );
}
