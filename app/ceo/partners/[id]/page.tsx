/* eslint-disable @next/next/no-html-link-for-pages -- This detail view intentionally uses native navigation on iPad. */
import { getActor } from "../../../lib/server/authz";
import { getCeoPartnerDetail, type PartnerHealth } from "../../../lib/server/ceo-partner-management";
import { currentRequest } from "../../../lib/server/current-request";
import { getPracticeSla, isInternalEccomiPartner } from "../../../lib/server/partner-control-rules";
import CeoLoginFallback from "../../ceo-login-fallback";
import "../../ceo-server.css";
import "../partners.css";
import "../premium.css";

type PartnerDetailPageProps = {
  params: Promise<{ id: string }>;
};

type ActivityItem = {
  at: string;
  label: string;
  detail: string;
  kind: "practice" | "commission" | "access" | "system";
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

function dateOnly(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(date);
}

function healthLabel(health: PartnerHealth) {
  if (health === "INTERVENTION") return "🔴 INTERVENTO CEO";
  if (health === "ATTENTION") return "🟠 DA ATTENZIONARE";
  return "🟢 REGOLARE";
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
    COMPLETE: "Completi",
    PENDING_UPLOAD: "Da caricare",
    UPLOADED: "Caricati",
    ACCRUED: "Maturata",
    INVOICED: "Fatturata",
    PAID: "Pagata",
  };
  return labels[value] || value.replaceAll("_", " ");
}

function latestDate(values: Array<string | null>) {
  const dates = values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return dates[0] || null;
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
  const internalEccomi = isInternalEccomiPartner(partner.name, partner.legalName);
  const shownPractices = detail.practices.length;
  const monogram = partner.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "P";

  const visiblePromotions = detail.promotions.filter((promotion) => promotion.status !== "TRASHED");
  const onlinePromotions = visiblePromotions.filter((promotion) =>
    ["ONLINE", "ACTIVE", "EXPIRING"].includes(promotion.status),
  );
  const nextExpiry = onlinePromotions
    .map((promotion) => promotion.validUntil)
    .filter(Boolean)
    .sort()[0] || null;

  const practicesWithSla = detail.practices.map((practice) => ({
    practice,
    sla: getPracticeSla(practice.status, practice.updatedAt),
  }));
  const accountableStale = practicesWithSla.filter(({ sla }) =>
    sla.stale && (internalEccomi ? sla.owner === "ECCOMI" : sla.owner === "PARTNER"),
  );
  const maxStaleHours = accountableStale.reduce((max, row) => Math.max(max, row.sla.hours), 0);

  let displayHealth: PartnerHealth = partner.health;
  let displayHealthReason = partner.healthReason;
  if (partner.status !== "ACTIVE") {
    displayHealth = "ATTENTION";
    displayHealthReason = partner.status === "PAUSED" ? "Partner attualmente in pausa" : "Partner non operativo";
  } else if (!internalEccomi && partner.openPractices > 0 && partner.activeUsers === 0) {
    displayHealth = "INTERVENTION";
    displayHealthReason = "Pratiche aperte senza account partner attivi";
  } else if (accountableStale.length >= 2 || maxStaleHours >= 72) {
    displayHealth = "INTERVENTION";
    displayHealthReason = internalEccomi
      ? `${accountableStale.length} pratica${accountableStale.length === 1 ? "" : "he"} ECCOMI fuori SLA`
      : `${accountableStale.length} pratica${accountableStale.length === 1 ? "" : "he"} partner fuori SLA`;
  } else if (accountableStale.length === 1) {
    displayHealth = "ATTENTION";
    displayHealthReason = internalEccomi ? "1 pratica ECCOMI fuori SLA" : "1 pratica partner fuori SLA";
  } else {
    displayHealth = "REGULAR";
    displayHealthReason = internalEccomi ? "Operatività interna sotto controllo" : "Nessuna anomalia operativa rilevata";
  }

  const lastAccessAt = latestDate(detail.users.map((user) => user.lastAccessAt));
  const accruedCents = detail.commissions
    .filter((commission) => commission.status === "ACCRUED")
    .reduce((sum, commission) => sum + commission.amountCents, 0);
  const invoicedCents = detail.commissions
    .filter((commission) => commission.status === "INVOICED")
    .reduce((sum, commission) => sum + commission.amountCents, 0);
  const paidCents = detail.commissions
    .filter((commission) => commission.status === "PAID")
    .reduce((sum, commission) => sum + commission.amountCents, 0);

  const activities: ActivityItem[] = [
    ...detail.practices.map((practice) => ({
      at: practice.updatedAt,
      label: `Pratica ${practice.id} aggiornata`,
      detail: `${practice.customerName} · ${statusLabel(practice.status)}`,
      kind: "practice" as const,
    })),
    ...detail.commissions.map((commission) => ({
      at: commission.paidAt || commission.invoicedAt || commission.accruedAt,
      label: `Commissione ${statusLabel(commission.status).toLowerCase()}`,
      detail: `${money(commission.amountCents)} · ${commission.leadId}`,
      kind: "commission" as const,
    })),
    ...detail.users
      .filter((user) => Boolean(user.lastAccessAt))
      .map((user) => ({
        at: user.lastAccessAt as string,
        label: "Accesso Area Partner",
        detail: `${user.displayName} · ${user.email}`,
        kind: "access" as const,
      })),
  ]
    .filter((activity) => !Number.isNaN(new Date(activity.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  if (!activities.length && partner.lastActivityAt) {
    activities.push({
      at: partner.lastActivityAt,
      label: "Attività partner aggiornata",
      detail: displayHealthReason,
      kind: "system",
    });
  }

  const partnerReturn = `/ceo/partners/${encodeURIComponent(partner.id)}#offerte`;
  const offerContext = `?partnerId=${encodeURIComponent(partner.id)}&partnerName=${encodeURIComponent(partner.name)}`;

  return (
    <main className="ceo-server-page partner-premium-page" data-ceo-partner-detail-ready="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo/partners">← Gestione Partner</a>
      </header>

      <section className="partner-premium-hero">
        <div className="partner-premium-identity">
          <div className="partner-premium-monogram" aria-hidden="true">{monogram}</div>
          <div>
            <small>{detail.preview ? "PREVIEW SICURA · DATI DIMOSTRATIVI" : "ECCOMI PARTNER CONTROL CENTER · DATI REALI"}</small>
            <h1>{partner.name}</h1>
            <p>{partner.legalName} · {partner.contactName || "Referente non indicato"}</p>
            {partner.contactEmail ? <a href={`mailto:${partner.contactEmail}`}>{partner.contactEmail}</a> : null}
          </div>
        </div>
        <div className="partner-premium-state">
          <span className="partner-premium-eyebrow">STATO RETE</span>
          <span className={`partner-pill ${partner.status === "ACTIVE" ? "partner-pill--active" : "partner-pill--muted"}`}>
            {partner.status === "ACTIVE" ? "● ATTIVO" : statusLabel(partner.status)}
          </span>
          <span className={`partner-pill partner-health partner-health--${displayHealth.toLowerCase()}`}>
            {healthLabel(displayHealth)}
          </span>
        </div>
      </section>

      <section className={`partner-attention-panel partner-attention-panel--${displayHealth.toLowerCase()}`}>
        <div className="partner-attention-panel__icon">{displayHealth === "REGULAR" ? "✓" : displayHealth === "ATTENTION" ? "!" : "⚠"}</div>
        <div className="partner-attention-panel__copy">
          <small>COSA RICHIEDE LA TUA ATTENZIONE</small>
          <strong>{displayHealth === "REGULAR" ? "Nessuna azione richiesta" : displayHealthReason}</strong>
          <span>
            {displayHealth === "REGULAR"
              ? internalEccomi
                ? "Struttura interna ECCOMI: nessun account Partner richiesto e SLA sotto controllo."
                : "Operatività regolare, accessi disponibili e SLA sotto controllo."
              : accountableStale.length
                ? `${accountableStale.length} ${accountableStale.length === 1 ? "pratica è fuori" : "pratiche sono fuori"} SLA operativo.`
                : "Verifica lo stato operativo del partner e gli accessi disponibili."}
          </span>
        </div>
        <div className="partner-attention-panel__meta">
          <small>ULTIMA ATTIVITÀ</small>
          <strong>{shortDate(partner.lastActivityAt)}</strong>
        </div>
      </section>

      <section className="ceo-server-kpis partner-kpis partner-premium-kpis" aria-label="Riepilogo partner">
        <article>
          <small>PRATICHE</small>
          <strong>{partner.openPractices}</strong>
          <span>{accountableStale.length ? `${accountableStale.length} fuori SLA` : "0 fuori SLA"} · {partner.completedPractices} concluse</span>
        </article>
        <article>
          <small>OFFERTE ONLINE</small>
          <strong>{onlinePromotions.length}</strong>
          <span>{nextExpiry ? `Prossima scadenza ${dateOnly(nextExpiry)}` : "Nessuna scadenza attiva"}</span>
        </article>
        <article>
          <small>ACCESSI PARTNER</small>
          <strong>{internalEccomi ? "—" : partner.activeUsers}</strong>
          <span>{internalEccomi ? "Non richiesto per struttura interna" : lastAccessAt ? `Ultimo accesso ${shortDate(lastAccessAt)}` : "Nessun accesso registrato"}</span>
        </article>
        <article>
          <small>COMMISSIONI</small>
          <strong>{money(partner.commissionCents)}</strong>
          <span>{money(accruedCents)} maturate · {money(invoicedCents)} fatturate · {money(paidCents)} pagate</span>
        </article>
      </section>

      <div className="partner-premium-sticky">
        <section className="partner-quick-actions partner-premium-actions" aria-label="Azioni rapide CEO">
          <span className="partner-premium-actions__label">AZIONI CEO</span>
          <a href="#pratiche">Gestisci pratiche</a>
          {!internalEccomi ? <a href="#accessi">Gestisci accessi</a> : null}
          {partner.contactEmail ? <a href={`mailto:${partner.contactEmail}`}>Contatta partner</a> : null}
        </section>

        <nav className="partner-detail-nav partner-premium-nav" aria-label="Sezioni partner">
          <a href="#panoramica">Panoramica</a>
          <a href="#attivita">Attività</a>
          <a href="#pratiche">Pratiche</a>
          <a href="#offerte">Offerte</a>
          <a href="#commissioni">Commissioni</a>
          <a href="#accessi">Accessi</a>
        </nav>
      </div>

      <div className="partner-detail-stack">
        <section className="partner-detail-section" id="panoramica">
          <div className="partner-detail-section__head">
            <div><h2>Panoramica</h2><p>Identità e quadro operativo della struttura.</p></div>
            <span className="partner-premium-section-number">01</span>
          </div>
          <div className="partner-detail-grid">
            <div><small>Nome partner</small><strong>{partner.name}</strong></div>
            <div><small>Ragione sociale</small><strong>{partner.legalName}</strong></div>
            <div><small>Referente</small><strong>{partner.contactName || "Non indicato"}</strong></div>
            <div><small>Email</small><strong>{partner.contactEmail || "Non indicata"}</strong></div>
            <div><small>Stato</small><strong>{statusLabel(partner.status)}</strong></div>
            <div><small>Ultima attività</small><strong>{shortDate(partner.lastActivityAt)}</strong></div>
            <div><small>Pratiche concluse</small><strong>{partner.completedPractices}</strong></div>
            <div><small>Offerte collegate</small><strong>{visiblePromotions.length}</strong></div>
          </div>
        </section>

        <section className="partner-detail-section partner-activity-section" id="attivita">
          <div className="partner-detail-section__head">
            <div><h2>Ultime attività</h2><p>Gli ultimi movimenti utili per capire cosa sta succedendo senza aprire ogni pratica.</p></div>
            <span className="partner-premium-section-number">02</span>
          </div>
          <div className="partner-activity-list">
            {activities.length ? activities.map((activity, index) => (
              <article className="partner-activity-item" key={`${activity.kind}-${activity.at}-${index}`}>
                <span className={`partner-activity-dot partner-activity-dot--${activity.kind}`} />
                <div>
                  <strong>{activity.label}</strong>
                  <span>{activity.detail}</span>
                </div>
                <time>{shortDate(activity.at)}</time>
              </article>
            )) : (
              <div className="partner-activity-empty">Nessuna attività recente disponibile.</div>
            )}
          </div>
        </section>

        <section className="partner-detail-section" id="pratiche">
          <div className="partner-detail-section__head">
            <div>
              <h2>Pratiche</h2>
              <p>Richieste clienti collegate a questo partner. Mostrate {shownPractices} di {partner.practices}.</p>
            </div>
            <div className="partner-section-badges">
              <span className="partner-premium-section-number">03</span>
              <span className="partner-pill partner-pill--attention">{partner.openPractices} APERTE</span>
              {accountableStale.length ? <span className="partner-pill partner-health--intervention">{accountableStale.length} FUORI SLA</span> : null}
            </div>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Pratica</th><th>Cliente</th><th>Veicolo</th><th>Stato</th><th>SLA</th><th>Documenti</th><th>Aggiornata</th><th></th></tr></thead>
              <tbody>
                {practicesWithSla.length ? practicesWithSla.map(({ practice, sla }) => (
                  <tr key={practice.id} className={sla.stale ? "partner-table-row--stale" : undefined}>
                    <td><strong>{practice.id}</strong><br /><small>Offerta {practice.offerNumber}</small></td>
                    <td>{practice.customerName}</td>
                    <td>{practice.vehicle}</td>
                    <td>{statusLabel(practice.status)}</td>
                    <td><span className={`partner-sla ${sla.stale ? "partner-sla--late" : "partner-sla--ok"}`}>{sla.limitHours === null ? "CONCLUSA" : sla.stale ? `${sla.hours}h · ${sla.owner}` : `${sla.hours}h · ${sla.owner} OK`}</span></td>
                    <td>{statusLabel(practice.documentStatus)}</td>
                    <td>{shortDate(practice.updatedAt)}</td>
                    <td><a href={`/ceo/practices/${encodeURIComponent(practice.id)}`}>Apri pratica →</a></td>
                  </tr>
                )) : <tr><td className="partner-empty-row" colSpan={8}>Nessuna pratica collegata.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="partner-detail-section" id="offerte">
          <div className="partner-detail-section__head">
            <div><h2>Offerte</h2><p>Promozioni operative originate o gestite da questo partner. Le offerte nel cestino non sono mostrate.</p></div>
            <div className="partner-section-badges">
              <span className="partner-premium-section-number">04</span>
              <span className="partner-pill partner-pill--active">{onlinePromotions.length} ONLINE</span>
            </div>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Offerta</th><th>Vettura</th><th>Versione</th><th>Stato</th><th>Scadenza</th><th></th></tr></thead>
              <tbody>
                {visiblePromotions.length ? visiblePromotions.map((promotion) => (
                  <tr key={promotion.id}>
                    <td><strong>{promotion.offerNumber}</strong></td>
                    <td>{promotion.brand} {promotion.model}</td>
                    <td>{promotion.version || "—"}</td>
                    <td>{statusLabel(promotion.status)}</td>
                    <td>{dateOnly(promotion.validUntil)}</td>
                    <td><a href={`/ceo/promotions/${encodeURIComponent(promotion.id)}${offerContext}`}>Apri offerta →</a></td>
                  </tr>
                )) : <tr><td className="partner-empty-row" colSpan={6}>Nessuna offerta operativa collegata.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="partner-detail-section" id="commissioni">
          <div className="partner-detail-section__head">
            <div><h2>Commissioni</h2><p>Storico economico collegato alle pratiche del partner.</p></div>
            <div className="partner-section-badges">
              <span className="partner-premium-section-number">05</span>
              <strong>{money(partner.commissionCents)}</strong>
            </div>
          </div>
          <div className="partner-commission-summary">
            <div><small>MATURATE</small><strong>{money(accruedCents)}</strong></div>
            <div><small>FATTURATE</small><strong>{money(invoicedCents)}</strong></div>
            <div><small>PAGATE</small><strong>{money(paidCents)}</strong></div>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Pratica</th><th>Importo</th><th>Stato</th><th>Maturata</th><th>Fatturata</th><th>Pagata</th></tr></thead>
              <tbody>
                {detail.commissions.length ? detail.commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td><a href={`/ceo/practices/${encodeURIComponent(commission.leadId)}`}>{commission.leadId}</a></td>
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
            <div><h2>Accessi Partner</h2><p>{internalEccomi ? "ECCOMI è una struttura interna: l’account Area Partner non è richiesto." : "Account autorizzati ad accedere all’Area Partner."}</p></div>
            <div className="partner-section-badges">
              <span className="partner-premium-section-number">06</span>
              <span className="partner-pill partner-pill--active">{internalEccomi ? "INTERNO" : `${partner.activeUsers} ATTIVI`}</span>
            </div>
          </div>
          {internalEccomi ? (
            <div className="partner-activity-empty">Nessun account Partner necessario per ECCOMI.</div>
          ) : (
            <div className="partner-table-wrap">
              <table className="partner-table">
                <thead><tr><th>Nome</th><th>Email</th><th>Stato</th><th>Ultimo accesso</th></tr></thead>
                <tbody>
                  {detail.users.length ? detail.users.map((user) => (
                    <tr key={user.email}>
                      <td>{user.displayName}</td>
                      <td>{user.email}</td>
                      <td>{user.active ? "Attivo" : "Disabilitato"}</td>
                      <td>{shortDate(user.lastAccessAt)}</td>
                    </tr>
                  )) : <tr><td className="partner-empty-row" colSpan={4}>Nessun account partner configurato.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <footer className="partner-premium-footer">
        <span>ECCOMI NOLEGGIO · PARTNER CONTROL CENTER</span>
        <span>Ultimo aggiornamento dati: {shortDate(partner.lastActivityAt)}</span>
        <a href={partnerReturn}>Torna alle offerte di {partner.name}</a>
      </footer>
    </main>
  );
}
