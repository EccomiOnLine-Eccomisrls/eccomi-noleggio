/* eslint-disable @next/next/no-html-link-for-pages -- This management view intentionally uses native links and forms on iPad. */
import { getActor } from "../../lib/server/authz";
import { getCeoPartnerOverview } from "../../lib/server/ceo-partner-management";
import { currentRequest } from "../../lib/server/current-request";
import CeoLoginFallback from "../ceo-login-fallback";
import "../ceo-server.css";
import "./partners.css";

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

      <section className="ceo-server-kpis partner-kpis" aria-label="Riepilogo rete partner">
        <article><small>PARTNER ATTIVI</small><strong>{overview.stats.activePartners}</strong><span>su {overview.stats.partners} presenti</span></article>
        <article><small>PRATICHE APERTE</small><strong>{overview.stats.openPractices}</strong><span>{overview.stats.practices} pratiche totali</span></article>
        <article><small>PARTNER OPERATIVI</small><strong>{overview.stats.partnersWithOpenPractices}</strong><span>con pratiche aperte</span></article>
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
          const needsAttention = partner.openPractices > 0 && partner.activeUsers === 0;
          return (
            <article className="partner-card" key={partner.id}>
              <div className="partner-card__identity">
                <div className="partner-card__avatar">{partner.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <small>PARTNER</small>
                  <h2>{partner.name}</h2>
                  <p>{partner.legalName}</p>
                </div>
              </div>

              <div className="partner-card__status-row">
                <span className={`partner-pill ${active ? "partner-pill--active" : "partner-pill--muted"}`}>
                  {active ? "● ATTIVO" : partner.status}
                </span>
                {needsAttention ? <span className="partner-pill partner-pill--attention">ATTENZIONE ACCESSI</span> : null}
              </div>

              <dl className="partner-card__metrics">
                <div><dt>Pratiche aperte</dt><dd>{partner.openPractices}</dd></div>
                <div><dt>Concluse</dt><dd>{partner.completedPractices}</dd></div>
                <div><dt>Offerte online</dt><dd>{partner.onlinePromotions}</dd></div>
                <div><dt>Utenti attivi</dt><dd>{partner.activeUsers}</dd></div>
              </dl>

              <div className="partner-card__contact">
                <span><strong>Referente</strong>{partner.contactName || "Non indicato"}</span>
                <span><strong>Email</strong>{partner.contactEmail || "Non indicata"}</span>
                <span><strong>Ultima attività</strong>{shortDate(partner.lastActivityAt)}</span>
                <span><strong>Commissioni</strong>{money(partner.commissionCents)}</span>
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
