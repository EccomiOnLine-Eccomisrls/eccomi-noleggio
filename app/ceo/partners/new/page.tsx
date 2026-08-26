/* eslint-disable @next/next/no-html-link-for-pages -- server-safe CEO form */
import { getActor } from "../../../lib/server/authz";
import { currentRequest } from "../../../lib/server/current-request";
import CeoLoginFallback from "../../ceo-login-fallback";
import "../../ceo-server.css";
import "../partners.css";
import "../premium.css";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || "" : value || ""; }

export default async function NewPartnerPage({ searchParams }: Props) {
  const request = await currentRequest("/ceo/partners/new");
  const actor = await getActor(request);
  if (!actor) return <CeoLoginFallback />;
  if (actor.role !== "CEO") return <main className="ceo-server-login"><section className="ceo-server-login__card"><h1>Area riservata al CEO</h1><a className="ceo-server-primary" href="/partner">Vai all’Area Partner</a></section></main>;
  const query = searchParams ? await searchParams : {};
  const error = first(query.error);

  return <main className="ceo-server-page partner-premium-page">
    <header className="ceo-server-bar"><div className="ceo-server-bar__brand"><span>🚙</span><div><strong>ECCOMI</strong><small>NOLEGGIO</small></div></div><a href="/ceo/partners">← Gestione Partner</a></header>

    <section className="partner-premium-hero"><div className="partner-premium-identity"><div className="partner-premium-monogram">＋</div><div><small>CEO · NUOVO PARTNER</small><h1>Crea Partner</h1><p>La società nasce senza utenti, offerte o pratiche. Dopo il salvataggio potrai invitare il Partner Admin.</p></div></div><div className="partner-premium-state"><span className="partner-premium-eyebrow">FLUSSO</span><span className="partner-pill partner-pill--active">CREA → INVITA</span></div></section>

    {error ? <section className="partner-attention-panel partner-attention-panel--intervention"><div className="partner-attention-panel__icon">!</div><div className="partner-attention-panel__copy"><small>CREAZIONE NON COMPLETATA</small><strong>{error}</strong></div></section> : null}

    <section className="partner-detail-section">
      <div className="partner-detail-section__head"><div><h2>Dati della società</h2><p>Servono solo i dati essenziali. Potrai completarli e modificarli dalla scheda Partner.</p></div><span className="partner-premium-section-number">01</span></div>
      <form method="post" action="/api/ceo/partners/create" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Nome Partner<input name="name" required minLength={2} maxLength={80} placeholder="Es. ECCOMI TEST PARTNER" style={{ minHeight: 48, border: "1px solid #cbd8e6", borderRadius: 10, padding: "10px 12px", fontSize: 16 }} /></label>
          <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Ragione sociale<input name="legalName" required minLength={2} maxLength={120} placeholder="Es. ECCOMI Test Partner S.r.l." style={{ minHeight: 48, border: "1px solid #cbd8e6", borderRadius: 10, padding: "10px 12px", fontSize: 16 }} /></label>
          <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Referente<input name="contactName" maxLength={100} placeholder="Nome e cognome" style={{ minHeight: 48, border: "1px solid #cbd8e6", borderRadius: 10, padding: "10px 12px", fontSize: 16 }} /></label>
          <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Email referente<input name="contactEmail" type="email" maxLength={160} placeholder="referente@azienda.it" style={{ minHeight: 48, border: "1px solid #cbd8e6", borderRadius: 10, padding: "10px 12px", fontSize: 16 }} /></label>
          <label style={{ display: "grid", gap: 7, fontWeight: 800 }}>Stato iniziale<select name="status" defaultValue="ACTIVE" style={{ minHeight: 48, border: "1px solid #cbd8e6", borderRadius: 10, padding: "10px 12px", fontSize: 16 }}><option value="ACTIVE">Attivo</option><option value="PAUSED">In pausa</option></select></label>
        </div>
        <div className="partner-attention-panel partner-attention-panel--regular" style={{ margin: 0 }}><div className="partner-attention-panel__icon">✓</div><div className="partner-attention-panel__copy"><small>DOPO IL SALVATAGGIO</small><strong>Si apre automaticamente la scheda del nuovo Partner</strong><span>Da Accessi potrai invitare il primo Partner Admin tramite Supabase Auth + Resend.</span></div></div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button className="ceo-server-primary" type="submit" style={{ minHeight: 48, border: 0, cursor: "pointer" }}>＋ Crea Partner</button><a href="/ceo/partners" style={{ alignSelf: "center", fontWeight: 800 }}>Annulla</a></div>
      </form>
    </section>
  </main>;
}
