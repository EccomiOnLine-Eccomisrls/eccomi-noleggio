/* eslint-disable @next/next/no-html-link-for-pages -- This CEO practice view intentionally uses native navigation on iPad. */
import { getActor } from "../../../lib/server/authz";
import { getCeoPracticeDetail } from "../../../lib/server/ceo-partner-management";
import { getCeoPracticeControlState } from "../../../lib/server/ceo-practice-control-state";
import { currentRequest } from "../../../lib/server/current-request";
import { getPracticeSla, isClosedPractice, isInternalEccomiPartner } from "../../../lib/server/partner-control-rules";
import { getPracticeWorkflowClosedAt } from "../../../lib/server/practice-workflow-closure";
import CeoLoginFallback from "../../ceo-login-fallback";
import CeoPracticeActions from "./ceo-practice-actions";
import "../../ceo-server.css";
import "../../partners/partners.css";
import "../../partners/final-touches.css";
import "./ceo-practice-actions.css";

type PracticePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
    NEW: "Richiesta ricevuta",
    ECCOMI_REVIEW: "In verifica ECCOMI",
    NEEDS_INFO: "Integrazione richiesta",
    SENT_TO_PARTNER: "Inviata al partner",
    PARTNER_REVIEW: "In lavorazione partner",
    QUOTE: "Preventivo predisposto",
    CONTRACT: "Contratto acquisito",
    DELIVERED: "Veicolo consegnato",
    ARCHIVED: "Pratica archiviata",
    COMPLETE: "Completi",
    PENDING_UPLOAD: "Da caricare",
    UPLOADED: "Caricato",
    PRIVATE: "Privato",
    BUSINESS: "Azienda",
    COMPANY: "Azienda",
    INCOME: "Reddito",
    TAX_CODE: "Codice fiscale",
    "TAX CODE": "Codice fiscale",
    IDENTITY: "Documento d’identità",
    DOCUMENTO_IDENTITA: "Documento d’identità",
    PAYSLIP: "Busta paga",
  };
  return labels[value] || value.replaceAll("_", " ");
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function CeoPracticePage({ params, searchParams }: PracticePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const request = await currentRequest(`/ceo/practices/${id}`);
  const actor = await getActor(request);
  if (!actor) return <CeoLoginFallback />;

  if (actor.role !== "CEO") {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Area riservata al CEO</h1>
          <p>La scheda amministrativa della pratica non è disponibile agli account partner.</p>
          <a className="ceo-server-primary" href="/partner">Vai all’Area Partner</a>
        </section>
      </main>
    );
  }

  const detail = await getCeoPracticeDetail(request, id);
  if (!detail) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Pratica non trovata</h1>
          <p>La pratica richiesta non esiste o non è più disponibile.</p>
          <a className="ceo-server-primary" href="/ceo/partners">Torna alla Gestione Partner</a>
        </section>
      </main>
    );
  }

  const controlState = await getCeoPracticeControlState(request, id);
  const practice = detail.practice;
  const partnerId = encodeURIComponent(detail.partner.id);
  const offerHref = `/ceo/promotions/${encodeURIComponent(detail.promotion.id)}?partner=${partnerId}`;
  const vehicle = `${detail.promotion.brand} ${detail.promotion.model}`.trim();
  const internalEccomi = isInternalEccomiPartner(detail.partner.name, detail.partner.legalName);
  const sla = getPracticeSla(practice.status, practice.updatedAt, internalEccomi);
  const completedAt = isClosedPractice(practice.status)
    ? detail.preview
      ? practice.completedAt
      : await getPracticeWorkflowClosedAt(practice.id, practice.status, practice.completedAt)
    : null;
  const slaBadge = sla.limitHours === null
    ? "✓ CONCLUSA"
    : sla.stale
      ? `🔴 ${sla.hours}h · SLA ${sla.owner} SCADUTO`
      : `🟢 ${sla.hours}h · SLA ${sla.owner} OK`;
  const slaDetail = sla.limitHours === null
    ? "Pratica conclusa · nessun SLA aperto"
    : sla.stale
      ? `${sla.hours} ore · fuori SLA ${sla.owner} (limite ${sla.limitHours}h)`
      : `${sla.hours} ore · SLA ${sla.owner} regolare (limite ${sla.limitHours}h)`;
  const feedbackStatus = one(query.ceoAction) === "error" ? "error" as const : one(query.ceoAction) === "ok" ? "ok" as const : null;
  const feedbackMessage = one(query.message) || null;

  return (
    <main className="ceo-server-page" data-ceo-practice-ready="true" data-ceo-practice-server-only="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href={`/ceo/partners/${partnerId}#pratiche`}>← Scheda partner</a>
      </header>

      <section className="ceo-server-heading partner-heading practice-ceo-heading">
        <div>
          <small>{detail.preview ? "PREVIEW SICURA · DATI DIMOSTRATIVI" : "PRATICA CEO · DATI REALI"}</small>
          <h1 className="practice-ceo-title">{practice.customerName} · {vehicle}</h1>
          <p className="practice-ceo-id">Pratica #{practice.id}</p>
          <p className="practice-ceo-context">{detail.partner.name} · {statusLabel(practice.status)}</p>
        </div>
        <span className={`partner-sla partner-sla--large ${sla.stale ? "partner-sla--late" : "partner-sla--ok"}`}>
          {slaBadge}
        </span>
      </section>

      <section className="practice-ceo-actions" aria-label="Azioni rapide pratica">
        <a href={`/ceo/partners/${partnerId}`}>Apri partner</a>
        <a href={offerHref}>Apri offerta</a>
        <a href={`mailto:${practice.email}`}>Email cliente</a>
        <a href={`tel:${practice.phone}`}>Chiama cliente</a>
      </section>

      <CeoPracticeActions
        practiceId={practice.id}
        initialStatus={practice.status}
        initialPriority={controlState.priority}
        initialAssignedTo={controlState.assignedTo}
        preview={detail.preview}
        partnerName={detail.partner.name}
        partnerLegalName={detail.partner.legalName}
        partnerContactEmail={detail.partner.contactEmail}
        feedbackStatus={feedbackStatus}
        feedbackMessage={feedbackMessage}
      />

      <section className="partner-detail-stack">
        <article className="partner-detail-section">
          <div className="partner-detail-section__head">
            <div><h2>Stato pratica</h2><p>Riepilogo operativo e tempi della richiesta.</p></div>
            <span className="partner-pill partner-pill--active">{statusLabel(practice.status)}</span>
          </div>
          <div className="partner-detail-grid">
            <div><small>Cliente</small><strong>{practice.customerName}</strong></div>
            <div><small>Stato</small><strong>{statusLabel(practice.status)}</strong></div>
            <div><small>Documenti</small><strong>{statusLabel(practice.documentStatus)}</strong></div>
            <div><small>Ultimo aggiornamento</small><strong>{shortDate(practice.updatedAt)}</strong></div>
            <div><small>Creata</small><strong>{shortDate(practice.createdAt)}</strong></div>
            <div><small>Inviata al partner</small><strong>{shortDate(practice.sentToPartnerAt)}</strong></div>
            <div><small>Conclusa</small><strong>{shortDate(completedAt)}</strong></div>
            <div><small>SLA · {sla.phase}</small><strong>{slaDetail}</strong></div>
          </div>
        </article>

        <article className="partner-detail-section">
          <div className="partner-detail-section__head">
            <div><h2>Cliente</h2><p>Contatti essenziali della pratica.</p></div>
          </div>
          <div className="partner-detail-grid">
            <div><small>Email</small><strong>{practice.email}</strong></div>
            <div><small>Telefono</small><strong>{practice.phone}</strong></div>
            <div><small>Provincia</small><strong>{practice.province || "—"}</strong></div>
            <div><small>Tipo cliente</small><strong>{practice.customerType ? statusLabel(practice.customerType) : "—"}</strong></div>
          </div>
        </article>

        <article className="partner-detail-section">
          <div className="partner-detail-section__head">
            <div><h2>Partner e offerta</h2><p>Collegamenti commerciali della pratica.</p></div>
          </div>
          <div className="partner-detail-grid">
            <div><small>Partner</small><strong>{detail.partner.name}</strong></div>
            <div><small>Referente</small><strong>{detail.partner.contactName || "Non indicato"}</strong></div>
            <div><small>Offerta</small><strong>{detail.promotion.offerNumber}</strong></div>
            <div><small>Veicolo</small><strong>{vehicle}</strong></div>
            <div className="partner-detail-grid__wide"><small>Versione</small><strong>{detail.promotion.version || "—"}</strong></div>
          </div>
        </article>

        <article className="partner-detail-section">
          <div className="partner-detail-section__head">
            <div><h2>Documenti</h2><p>Documenti registrati per questa pratica.</p></div>
            <span className="partner-pill partner-pill--active">{detail.documents.length} PRESENTI</span>
          </div>
          <div className="partner-table-wrap">
            <table className="partner-table">
              <thead><tr><th>Tipo</th><th>File</th><th>Stato</th><th>Caricato</th></tr></thead>
              <tbody>
                {detail.documents.length ? detail.documents.map((document) => (
                  <tr key={document.id}>
                    <td>{statusLabel(document.documentType)}</td>
                    <td>{document.originalName}</td>
                    <td>{statusLabel(document.status)}</td>
                    <td>{shortDate(document.createdAt)}</td>
                  </tr>
                )) : <tr><td className="partner-empty-row" colSpan={4}>Nessun documento registrato.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
