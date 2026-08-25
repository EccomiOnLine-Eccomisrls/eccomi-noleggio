/* eslint-disable @next/next/no-html-link-for-pages -- This management view intentionally uses native links and forms on iPad. */
import { getActor } from "../../lib/server/authz";
import { getCeoPartnerOverview, type PartnerHealth } from "../../lib/server/ceo-partner-management";
import { currentRequest } from "../../lib/server/current-request";
import CeoLoginFallback from "../ceo-login-fallback";
import "../ceo-server.css";
import "./partners.css";
import "./final-touches.css";

type PartnerPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function shortDate(value: string | null) {
  if (!value) return "Nessuna attività";
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

function healthLabel(health: PartnerHealth) {
  if (health === "INTERVENTION") return "🔴 INTERVENTO CEO";
  if (health === "ATTENTION") return "🟠 DA ATTENZIONARE";
  return "🟢 REGOLARE";
}

function partnerStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "● ATTIVO",
    PAUSED: "IN PAUSA",
    INACTIVE: "DISATTIVATO",
  };
  return labels[status] || status.replaceAll("_", " ");
}

export default async function CeoPartnersPage({ searchParams }: PartnerPageProps) {
  const request = await currentRequest("/ceo/partners");
  const actor = await getActor(request);
  if (!actor) return <CeoLoginFallback />;

  if (actor.role !== "CEO") {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Area riservata al CEO</h1>
          <p>La gestione della rete partner non è disponibile per gli account partner.</p>
          <a className="ceo-server-primary" href="/partner">Vai all’Area Partner</a>
        </section>
      </main>
    );
  }

  const query = await searchParams;
  const q = (queryValue(query, "q") || "").trim().toLocaleLowerCase("it");
  const status = (queryValue(query, "status") || "ALL").trim().toUpperCase();
  const overview = await getCeoPartnerOverview(request);
  const pausedPartners = overview.partners.filter((partner) => partner.status === "PAUSED").length;
  const regularPartners = overview.partners.filter((partner) => partner.health === "REGULAR").length;
  const filteredPartners = overview.partners.filter((partner) => {
    const matchesQuery = !q || [
      partner.name,
      partner.legalName,
      partner.contactName || "",
      partner.contactEmail || "",
    ].join(" ").toLocaleLowerCase("it").includes(q);
    const matchesStatus = status === "ALL" || partner.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <main className="ceo-server-page" data-ceo-partners-ready="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo">← Dashboard CEO</a>
      </header>

      <section className="ceo-server-heading partner-heading">
        <div>
          <small>{overview.preview ? "PREVIEW SICURA · DATI DIMOSTRATIVI" : "GESTIONE RETE · DATI REALI"}</small>
          <h1>Partner Noleggio</h1>
          <p>Controlla rete, offerte, pratiche, accessi e commissioni senza entrare nell’area operativa del partner.</p>
        </div>
        <div className="partner-heading__badge">CEO CONTROL CENTER</div>
      </section>

      <section className="partner-network-summary" aria-label="Stato executive della rete">
        <div>
          <small>RETE PARTNER</small>
          <strong>{overview.stats.activePartners} attivi · {overview.stats.attentionPartners} da attenzionare · {pausedPartners} in pausa</strong>
        </div>
        <span>{regularPartners} regolari · {overview.stats.openPractices} pratiche aperte · {money(overview.stats.commissionCents)} maturato</span>
      </section>

      <section className="ceo-server-kpis partner-kpis" aria-label="Riepilogo rete partner">
        <article><small>PARTNER ATTIVI</small><strong>{overview.stats.activePartners}</strong><span>su {overview.stats.partners} presenti</span></article>
        <article><small>PRATICHE APERTE</small><strong>{overview.stats.openPractices}</strong><span>{overview.stats.practices} pratiche totali</span></article>
        <article><small>DA ATTENZIONARE</small><strong>{overview.stats.attentionPartners}</strong><span>partner con anomalie operative</span></article>
        <article><small>COMMISSIONI</small><strong>{money(overview.stats.commissionCents)}</strong><span>maturato registrato</span></article>
      </section>

      <form className="partner-filters" method="get" action="/ceo/partners">
        <label>
          <span>Cerca partner</span>
          <input name="q" defaultValue={queryValue(query, "q") || ""} placeholder="Nome, referente o email…" />
        </label>
        <label>
          <span>Stato</span>
          <select name="status" defaultValue={status}>
            <option value="ALL">Tutti</option>
            <option value="ACTIVE">Attivi</option>
            <option value="PAUSED">In pausa</option>
            <option value="INACTIVE">Disattivati</option>
          </select>
        </label>
        <button type="submit">Filtra</button>
        {(q || status !== "ALL") ? <a href="/ceo/partners">Azzera filtri</a> : null}
      </form>

      <section className="partner-network" aria-label="Elenco partner">
        {!filteredPartners.length ? (
          <article className="partner-empty">
            <strong>Nessun partner trovato</strong>
            <span>Modifica i filtri oppure azzera la ricerca.</span>
          </article>
        ) : null}

        {filteredPartners.map((partner) => {
          const active = partner.status === "ACTIVE";
          return (
            <article className={`partner-card partner-card--${partner.health.toLowerCase()}`} data-health={partner.health} key={partner.id}>
              <div className="partner-card__identity">
                <div className="partner-card__avatar">{partner.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <small>PARTNER · CONTROLLO CEO</small>
                  <h2>{partner.name}</h2>
                  <p>{partner.legalName}</p>
                </div>
              </div>

              <div className="partner-card__status-row">
                <span className={`partner-pill ${active ? "partner-pill--active" : "partner-pill--muted"}`}>
                  {partnerStatusLabel(partner.status)}
                </span>
                <span className={`partner-pill partner-health partner-health--${partner.health.toLowerCase()}`}>
                  {healthLabel(partner.health)}
                </span>
              </div>
              <p className="partner-health-reason">{partner.healthReason}</p>

              <dl className="partner-card__metrics">
                <div><dt>Pratiche aperte</dt><dd>{partner.openPractices}</dd></div>
                <div><dt>Ferme &gt;24h</dt><dd>{partner.stalePractices}</dd></div>
                <div><dt>Offerte online</dt><dd>{partner.onlinePromotions}</dd></div>
                <div><dt>Utenti attivi</dt><dd>{partner.activeUsers}</dd></div>
              </dl>

              <div className="partner-card__contact">
                <span className="partner-card__contact-item partner-card__contact-item--referent"><strong>Referente</strong><em>{partner.contactName || "Non indicato"}</em></span>
                <span className="partner-card__contact-item"><strong>Email</strong><em>{partner.contactEmail || "Non indicata"}</em></span>
                <span className="partner-card__contact-item"><strong>Ultima attività</strong><em>{shortDate(partner.lastActivityAt)}</em></span>
                <span className="partner-card__contact-item"><strong>Commissioni</strong><em>{money(partner.commissionCents)}</em></span>
              </div>

              <div className="partner-card__actions">
                <a className="ceo-server-primary" href={`/ceo/partners/${encodeURIComponent(partner.id)}`}>Apri scheda partner</a>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
