/* eslint-disable @next/next/no-html-link-for-pages -- This detail view intentionally uses native navigation on iPad. */
import { getActor } from "../../../lib/server/authz";
import { getCeoPartnerDetail } from "../../../lib/server/ceo-partner-management";
import { currentRequest } from "../../../lib/server/current-request";
import CeoLoginFallback from "../../ceo-login-fallback";
import "../../ceo-server.css";
import "../partners.css";

type PartnerDetailPageProps = {
  params: Promise<{ id: string }>;
};

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function shortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(date);
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    NEW: "Nuova",
    ECCOMI_REVIEW: "In verifica ECCOMI",
    NEEDS_INFO: "Integrazione richiesta",
    SENT_TO_PARTNER: "Inviata al partner",
    PARTNER_REVIEW: "In lavorazione partner",
    QUOTE: "Preventivo",
    CONTRACT: "Contratto",
    DELIVERED: "Consegnata",
    ARCHIVED: "Archiviata",
    ONLINE: "Online",
    ACTIVE: "Attiva",
    EXPIRING: "In scadenza",
    EXPIRED: "Scaduta",
    PAUSED: "In pausa",
  };
  return labels[value] || value.replaceAll("_", " ");
}

export default async function CeoPartnerDetailPage({ params }: PartnerDetailPageProps) {
  const { id } = await params;
  const request = await currentRequest(`/ceo/partners/${id}`);
  const actor = await getActor(request);
  if (!actor) return <CeoLoginFallback />;

  if (actor.role !== "CEO") {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Area riservata al CEO</h1>
          <p>La scheda amministrativa del partner non è disponibile agli account partner.</p>
          <a className="ceo-server-primary" href="/partner">Vai all’Area Partner</a>
        </section>
      </main>
    );
  }

  const detail = await getCeoPartnerDetail(request, id);
  if (!detail) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Partner non trovato</h1>
          <p>La scheda richiesta non esiste o non è più disponibile.</p>
          <a className="ceo-server-primary" href="/ceo/partners">Torna alla rete partner</a>
        </section>
      </main>
    );
  }

  const partner = detail.partner;

  return (
    <main className="ceo-server-page" data-ceo-partner-detail-ready="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo/partners">← Gestione Partner</a>
      </header>

      <section className="ceo-server-heading partner-heading">
        <div>
          <small>{detail.preview ? "PREVIEW SICURA · DATI DIMOSTRATIVI" : "SCHEDA PARTNER · DATI REALI"}</small>
          <h1>{partner.name}</h1>
          <p>{partner.legalName} · {partner.contactName || "Referente non indicato"} · {partner.contactEmail || "Email non indicata"}</p>
        </div>
        <span className={`partner-pill ${partner.status === "ACTIVE" ? "partner-pill--active" : "partner-pill--muted"}`}>
          {partner.status === "ACTIVE" ? "● ATTIVO" : statusLabel(partner.status)}
        </span>
      </section>

      <section className="ceo-server-kpis partner-kpis" aria-label="Riepilogo partner">
        <article><small>PRATICHE APERTE</small><strong>{partner.openPractices}</strong><span>{partner.practices} totali</span></article>
        <article><small>OFFERTE ONLINE</small><strong>{partner.onlinePromotions}</strong><span>{partner.promotions} collegate</span></article>
        <article><small>UTENTI ATTIVI</small><strong>{partner.activeUsers}</strong><span>accessi partner</span></article>
        <article><small>COMMISSIONI</small><strong>{money(partner.commissionCents)}</strong><span>maturato registrato</span></article>
      </section>

      <nav className="partner-detail-nav" aria-label="Sezioni partner">
        <a href="#panoramica">Panoramica</a>
        <a href="#pratiche">Pratiche</a>
        <a href="#offerte">Offerte</a>
        <a href="#commissioni">Commissioni</a>
        <a href="#accessi">Accessi</a>
      </nav>

      <div className="partner-detail-stack">
        <section className="partner-detail-section" id="panoramica">
          <div className="partner-detail-section__head">
            <div><h2>Panoramica</h2><p>Informazioni operative principali della struttura.</p></div>
          </div>
          <div className="partner-detail-grid">
            <div><small>Nome partner</small><strong>{partner.name}</strong></div>
            <div><small>Ragione sociale</small><strong>{partner.legalName}</strong></div>
            <div><small>Referente</small><strong>{partner.contactName || "Non indicato"}</strong></div>
            <div><small>Email</small><strong>{partner.contactEmail || "Non indicata"}</strong></div>
            <div><small>Stato</small><strong>{statusLabel(partner.status)}</strong></div>
            <div><small>Ultima attività</small><strong>{shortDate(partner.lastActivityAt)}</strong></div>
            <div><small>Pratiche concluse</small><strong>{partner.completedPractices}</strong></div>
            <div><small>Offerte collegate</small><strong>{partner.promotions}</strong></div>
          </div>
        </section>

        <section className="partner-detail-section" id="pratiche">
          <div className="partner-detail-section__head">
            <div><h2>Pratiche</h2><p>Richieste clienti collegate a questo partner.</p></div>
            <span className="partner-pill partner-pill--attention">{partner.openPractices} APERTE</span>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Pratica</th><th>Cliente</th><th>Veicolo</th><th>Stato</th><th>Documenti</th><th>Aggiornata</th></tr></thead>
              <tbody>
                {detail.practices.length ? detail.practices.map((practice) => (
                  <tr key={practice.id}>
                    <td><strong>{practice.id}</strong><br /><small>Offerta {practice.offerNumber}</small></td>
                    <td>{practice.customerName}</td>
                    <td>{practice.vehicle}</td>
                    <td>{statusLabel(practice.status)}</td>
                    <td>{statusLabel(practice.documentStatus)}</td>
                    <td>{shortDate(practice.updatedAt)}</td>
                  </tr>
                )) : <tr><td className="partner-empty-row" colSpan={6}>Nessuna pratica collegata.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="partner-detail-section" id="offerte">
          <div className="partner-detail-section__head">
            <div><h2>Offerte</h2><p>Promozioni originate o gestite da questo partner.</p></div>
            <span className="partner-pill partner-pill--active">{partner.onlinePromotions} ONLINE</span>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Offerta</th><th>Vettura</th><th>Versione</th><th>Stato</th><th>Scadenza</th><th></th></tr></thead>
              <tbody>
                {detail.promotions.length ? detail.promotions.map((promotion) => (
                  <tr key={promotion.id}>
                    <td><strong>{promotion.offerNumber}</strong></td>
                    <td>{promotion.brand} {promotion.model}</td>
                    <td>{promotion.version || "—"}</td>
                    <td>{statusLabel(promotion.status)}</td>
                    <td>{promotion.validUntil}</td>
                    <td><a href={`/ceo/promotions/${encodeURIComponent(promotion.id)}`}>Apri offerta →</a></td>
                  </tr>
                )) : <tr><td className="partner-empty-row" colSpan={6}>Nessuna offerta collegata.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="partner-detail-section" id="commissioni">
          <div className="partner-detail-section__head">
            <div><h2>Commissioni</h2><p>Storico economico collegato alle pratiche del partner.</p></div>
            <strong>{money(partner.commissionCents)}</strong>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Pratica</th><th>Importo</th><th>Stato</th><th>Maturata</th><th>Fatturata</th><th>Pagata</th></tr></thead>
              <tbody>
                {detail.commissions.length ? detail.commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td>{commission.leadId}</td>
                    <td><strong>{money(commission.amountCents)}</strong></td>
                    <td>{statusLabel(commission.status)}</td>
                    <td>{shortDate(commission.accruedAt)}</td>
                    <td>{shortDate(commission.invoicedAt)}</td>
                    <td>{shortDate(commission.paidAt)}</td>
                  </tr>
                )) : <tr><td className="partner-empty-row" colSpan={6}>Nessuna commissione registrata.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="partner-detail-section" id="accessi">
          <div className="partner-detail-section__head">
            <div><h2>Accessi Partner</h2><p>Account autorizzati ad accedere all’Area Partner.</p></div>
            <span className="partner-pill partner-pill--active">{partner.activeUsers} ATTIVI</span>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Nome</th><th>Email</th><th>Stato</th></tr></thead>
              <tbody>
                {detail.users.length ? detail.users.map((user) => (
                  <tr key={user.email}>
                    <td>{user.displayName}</td>
                    <td>{user.email}</td>
                    <td>{user.active ? "Attivo" : "Disabilitato"}</td>
                  </tr>
                )) : <tr><td className="partner-empty-row" colSpan={3}>Nessun account partner configurato.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
