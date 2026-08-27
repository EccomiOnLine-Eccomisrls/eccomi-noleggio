/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation kept for iPad stability. */
import { getActor } from "../../../../lib/server/authz";
import { currentRequest } from "../../../../lib/server/current-request";
import { getPartnerDeleteState } from "../../../../lib/server/partner-delete-policy";
import { isRenderPullRequestPreview } from "../../../../lib/server/preview-mode";
import CeoLoginFallback from "../../../ceo-login-fallback";
import "../../../ceo-server.css";
import "../../partners.css";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CeoPartnerDeletePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const request = await currentRequest(`/ceo/partners/${id}/delete`);
  const preview = isRenderPullRequestPreview(request);

  if (!preview) {
    const actor = await getActor(request);
    if (!actor) return <CeoLoginFallback />;
    if (actor.role !== "CEO") {
      return (
        <main className="ceo-server-login">
          <section className="ceo-server-login__card">
            <h1>Area riservata al CEO</h1>
            <p>La cancellazione delle aziende Partner è disponibile solo al CEO.</p>
            <a className="ceo-server-primary" href="/partner">Vai all’Area Partner</a>
          </section>
        </main>
      );
    }
  }

  const state = await getPartnerDeleteState(id, preview);
  if (!state) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Partner non trovato</h1>
          <p>La struttura richiesta non esiste o non è disponibile.</p>
          <a className="ceo-server-primary" href="/ceo/partners">Torna alla rete Partner</a>
        </section>
      </main>
    );
  }

  const error = queryValue(query, "error");
  const simulated = queryValue(query, "simulated") === "1";
  const blockerRows = [
    { label: "Offerte collegate", value: state.blockers.offers },
    { label: "Pratiche collegate", value: state.blockers.practices },
    { label: "Utenti / accessi Partner", value: state.blockers.users },
    { label: "Commissioni collegate", value: state.blockers.commissions },
  ];

  return (
    <main className="ceo-server-page" data-pr32-partner-delete="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href={`/ceo/partners/${encodeURIComponent(id)}`}>← Scheda Partner</a>
      </header>

      <section className="ceo-server-heading">
        <small>{preview ? "PR32 · PREVIEW SICURA · NESSUNA CANCELLAZIONE REALE" : "SOLO CEO · CONTROLLO CANCELLAZIONE"}</small>
        <h1>Elimina Partner</h1>
        <p>La cancellazione è consentita solo quando la struttura non ha più alcun collegamento operativo o storico.</p>
      </section>

      {simulated ? (
        <section className="ceo-server-result">
          <strong>SIMULAZIONE COMPLETATA</strong>
          <div>{state.partner.name} sarebbe eliminabile.</div>
          <div>Nessuna scrittura su Supabase.</div>
        </section>
      ) : null}
      {error ? <section className="ceo-server-result--error">{error}</section> : null}

      <section className="ceo-server-editor">
        <div className="ceo-server-editor__summary">
          <small>AZIENDA PARTNER</small>
          <strong>{state.partner.name}</strong>
          <span>{state.partner.legalName}</span>
        </div>

        <section>
          <fieldset>
            <legend>01 · Verifica collegamenti</legend>
            <div className="ceo-server-fields ceo-server-fields--four">
              {blockerRows.map((row) => (
                <label key={row.label}>
                  <span>{row.label}</span>
                  <input value={String(row.value)} readOnly />
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section>
          <fieldset>
            <legend>02 · Esito controllo</legend>
            {state.internalEccomi ? (
              <div className="ceo-server-result--error">
                <strong>STRUTTURA PROTETTA</strong>
                <div>ECCOMI DIRETTO non può essere eliminato dal sistema.</div>
              </div>
            ) : state.canDelete ? (
              <div className="ceo-server-result">
                <strong>PARTNER ELIMINABILE</strong>
                <div>Non risultano offerte, pratiche, utenti o commissioni collegate.</div>
                <div>La cancellazione rimuoverà solo l’anagrafica Partner. Shopify non viene toccato.</div>
              </div>
            ) : (
              <div className="ceo-server-result--error">
                <strong>ELIMINAZIONE BLOCCATA</strong>
                <div>Prima devi azzerare tutti i collegamenti indicati sopra.</div>
                {state.blockers.offers ? <div>Le offerte possono essere riassegnate dal CEO a un altro Partner o a ECCOMI DIRETTO.</div> : null}
                {state.blockers.users ? <div>Rimuovi prima gli accessi dal Centro Accessi Partner.</div> : null}
                {(state.blockers.practices || state.blockers.commissions) ? <div>Pratiche e commissioni storiche impediscono la cancellazione definitiva del Partner.</div> : null}
              </div>
            )}
          </fieldset>
        </section>

        {state.canDelete ? (
          <form method="post" action={`/api/ceo/partners/${encodeURIComponent(id)}/delete-form`}>
            <section>
              <fieldset>
                <legend>03 · Conferma CEO</legend>
                <div className="ceo-server-fields">
                  <label className="ceo-server-wide">
                    <span>Scrivi ELIMINA per confermare</span>
                    <input name="confirm" autoComplete="off" placeholder="ELIMINA" required />
                  </label>
                </div>
              </fieldset>
            </section>
            <footer className="ceo-server-actions">
              <a className="ceo-server-secondary" href={`/ceo/partners/${encodeURIComponent(id)}`}>Annulla</a>
              <button className="ceo-server-primary" type="submit">{preview ? "SIMULA ELIMINAZIONE" : "ELIMINA PARTNER"}</button>
            </footer>
          </form>
        ) : (
          <footer className="ceo-server-actions">
            <a className="ceo-server-secondary" href={`/ceo/partners/${encodeURIComponent(id)}`}>Torna alla scheda Partner</a>
            {state.blockers.users ? <a className="ceo-server-primary" href={`/ceo/partners/${encodeURIComponent(id)}/accessi`}>Gestisci accessi</a> : null}
            {state.blockers.offers ? <a className="ceo-server-primary" href={`/ceo/partners/${encodeURIComponent(id)}#offerte`}>Gestisci offerte</a> : null}
          </footer>
        )}
      </section>
    </main>
  );
}
