/* eslint-disable @next/next/no-html-link-for-pages -- This route intentionally works without client-side JavaScript. */
import type { DashboardBootstrapPayload } from "../../dashboard-client";
import { GET as getDashboard } from "../../api/dashboard/route";
import { getActor } from "../../lib/server/authz";
import { currentRequest } from "../../lib/server/current-request";
import CeoLoginFallback from "../ceo-login-fallback";
import "../ceo-server.css";

function attentionLabel(status: string, days: string) {
  if (status === "EXPIRED") return "SCADUTA · DA DECIDERE";
  const parsed = Number(days.replace(/[^0-9-]/g, ""));
  if (Number.isFinite(parsed) && parsed <= 1) return "URGENTE";
  if (Number.isFinite(parsed) && parsed <= 3) return "PRIORITÀ ALTA";
  if (Number.isFinite(parsed) && parsed <= 7) return "DA ATTENZIONARE";
  return status;
}

export default async function CeoPromotionsPage() {
  const request = await currentRequest("/api/dashboard");
  const actor = await getActor(request);

  if (!actor) return <CeoLoginFallback />;

  const response = await getDashboard(request);
  if (!response.ok) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Promozioni non disponibili</h1>
          <p>Non è stato possibile caricare l’elenco in questo momento.</p>
          <a className="ceo-server-primary" href="/ceo/promotions">Riprova</a>
        </section>
      </main>
    );
  }

  const payload = (await response.json()) as DashboardBootstrapPayload;
  const promotions = payload.promotions.filter(
    (promotion) => String(promotion.status) !== "TRASHED",
  );
  const attentionCount = promotions.filter((promotion) =>
    ["EXPIRED", "EXPIRING"].includes(promotion.status),
  ).length;
  const onlineCount = promotions.filter((promotion) =>
    ["ONLINE", "ACTIVE", "EXPIRING"].includes(promotion.status),
  ).length;
  const expiredCount = promotions.filter(
    (promotion) => promotion.status === "EXPIRED",
  ).length;

  return (
    <main className="ceo-server-page" data-server-promotions-ready="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo">← Dashboard CEO</a>
      </header>

      <section className="ceo-server-heading">
        <small>GESTIONE SERVER-SIDE · COMPATIBILE IPAD</small>
        <h1>Promozioni</h1>
        <p>
          Questa pagina usa collegamenti e moduli HTML reali: funziona anche se
          il caricamento React del browser non parte.
        </p>
      </section>

      <section className="ceo-server-kpis" aria-label="Riepilogo promozioni">
        <article><small>DA ATTENZIONARE</small><strong>{attentionCount}</strong><span>Scadenze e decisioni</span></article>
        <article><small>ONLINE</small><strong>{onlineCount}</strong><span>Offerte operative</span></article>
        <article><small>SCADUTE</small><strong>{expiredCount}</strong><span>Da riattivare o archiviare</span></article>
      </section>

      <section className="ceo-server-panel">
        {promotions.map((promotion) => {
          const label = attentionLabel(promotion.status, promotion.days);
          const statusClass = promotion.status === "EXPIRED"
            ? "expired"
            : ["ONLINE", "ACTIVE"].includes(promotion.status)
              ? "online"
              : "";

          return (
            <article className="ceo-server-promotion" key={promotion.id}>
              <div className="ceo-server-promotion__vehicle">
                <small>{promotion.brand}</small>
                <strong>{promotion.model}</strong>
                <em className={`ceo-server-status ceo-server-status--${statusClass}`}>{label}</em>
              </div>
              <div className="ceo-server-promotion__copy">
                <small>OFFERTA {promotion.offerNumber}</small>
                <h2>{promotion.brand} {promotion.model}</h2>
                <p>{promotion.version}</p>
                <div className="ceo-server-promotion__metrics">
                  <span>{promotion.price}/mese</span>
                  <span>{promotion.term}</span>
                  <span>{promotion.mileage}</span>
                  <span>Scadenza: {promotion.expires}</span>
                </div>
              </div>
              <div className="ceo-server-promotion__actions">
                <a className="ceo-server-primary" href={`/ceo/promotions/${encodeURIComponent(promotion.id)}`}>
                  Modifica offerta
                </a>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
