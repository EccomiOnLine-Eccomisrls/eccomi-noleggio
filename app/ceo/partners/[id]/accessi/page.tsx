/* eslint-disable @next/next/no-html-link-for-pages -- pagina server-safe per iPad */
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditLogs } from "../../../../../db/schema";
import { getActor } from "../../../../lib/server/authz";
import { getCeoPartnerDetail } from "../../../../lib/server/ceo-partner-management";
import { currentRequest } from "../../../../lib/server/current-request";
import { isInternalEccomiPartner } from "../../../../lib/server/partner-control-rules";
import CeoLoginFallback from "../../../ceo-login-fallback";
import "../../../ceo-server.css";
import "../../partners.css";
import "../../premium.css";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || "" : value || ""; }
function shortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value); if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }).format(date);
}

export default async function PartnerAccessPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const request = await currentRequest(`/ceo/partners/${id}/accessi`);
  const actor = await getActor(request);
  if (!actor) return <CeoLoginFallback />;
  if (actor.role !== "CEO") return <main className="ceo-server-login"><section className="ceo-server-login__card"><h1>Area riservata al CEO</h1><a className="ceo-server-primary" href="/partner">Vai all’Area Partner</a></section></main>;

  const detail = await getCeoPartnerDetail(request, id);
  if (!detail) return <main className="ceo-server-login"><section className="ceo-server-login__card"><h1>Partner non trovato</h1><a className="ceo-server-primary" href="/ceo/partners">Torna ai Partner</a></section></main>;

  const partner = detail.partner;
  const internal = isInternalEccomiPartner(partner.name, partner.legalName);
  const accessEvents = detail.preview ? [] : await getDb().select({ actorEmail: auditLogs.actorEmail, action: auditLogs.action, entityId: auditLogs.entityId, createdAt: auditLogs.createdAt }).from(auditLogs).where(eq(auditLogs.entityType, "partner_user")).orderBy(desc(auditLogs.createdAt)).limit(1000);
  const accessState = new Map<string, { status: string; lastLogin: string | null }>();
  for (const user of detail.users) {
    const events = accessEvents.filter((event) => event.entityId.trim().toLowerCase() === user.email.trim().toLowerCase());
    const lastLogin = events.find((event) => event.action === "PARTNER_LOGIN")?.createdAt || null;
    const latestLifecycle = events.find((event) => ["PARTNER_ACCESS_DISABLED", "PARTNER_ADMIN_INVITED", "PARTNER_ADMIN_INVITE_RESENT", "PARTNER_ACCOUNT_ACTIVATED", "PARTNER_ACCOUNT_REACTIVATED"].includes(event.action));
    const status = user.active ? "ATTIVO" : latestLifecycle?.action === "PARTNER_ACCESS_DISABLED" ? "DISATTIVATO" : latestLifecycle?.action?.includes("INVITE") ? "INVITO INVIATO" : "NON ATTIVO";
    accessState.set(user.email, { status, lastLogin });
  }

  const inviteSent = first(query.inviteSent) === "1";
  const invitePreview = first(query.invitePreview) === "1";
  const disabled = first(query.accessDisabled) === "1";
  const accessError = first(query.accessError);
  const eventEmail = first(query.inviteEmail) || first(query.accessEmail);

  return <main className="ceo-server-page partner-premium-page">
    <header className="ceo-server-bar"><div className="ceo-server-bar__brand"><span>🚙</span><div><strong>ECCOMI</strong><small>NOLEGGIO</small></div></div><a href={`/ceo/partners/${encodeURIComponent(id)}#accessi`}>← Scheda Partner</a></header>
    <section className="partner-premium-hero"><div className="partner-premium-identity"><div className="partner-premium-monogram">🔐</div><div><small>CEO · GESTIONE ACCESSI</small><h1>Accessi · {partner.name}</h1><p>{partner.legalName}</p></div></div><div className="partner-premium-state"><span className="partner-premium-eyebrow">ACCOUNT ATTIVI</span><span className="partner-pill partner-pill--active">{internal ? "INTERNO" : partner.activeUsers}</span></div></section>

    {inviteSent || invitePreview || disabled ? <section className="partner-attention-panel partner-attention-panel--regular"><div className="partner-attention-panel__icon">✓</div><div className="partner-attention-panel__copy"><small>OPERAZIONE COMPLETATA</small><strong>{invitePreview ? "Simulazione preview: invito pronto" : disabled ? "Accesso disattivato" : "Invito inviato con Resend"}</strong><span>{eventEmail || "Account Partner aggiornato"}</span></div></section> : null}
    {accessError ? <section className="partner-attention-panel partner-attention-panel--intervention"><div className="partner-attention-panel__icon">!</div><div className="partner-attention-panel__copy"><small>OPERAZIONE NON COMPLETATA</small><strong>{accessError}</strong></div></section> : null}

    {internal ? <section className="partner-detail-section"><div className="partner-detail-section__head"><div><h2>Struttura interna ECCOMI</h2><p>Nessun account Area Partner necessario.</p></div></div></section> : <div className="partner-detail-stack">
      <section className="partner-detail-section"><div className="partner-detail-section__head"><div><h2>Invita Partner Admin</h2><p>Supabase Auth genera un token sicuro; Resend invia l’email ECCOMI. Il destinatario sceglie la propria password.</p></div><span className="partner-premium-section-number">01</span></div>
        <form method="post" action={`/api/ceo/partners/${encodeURIComponent(id)}/invite`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>Nome e cognome<input name="displayName" required minLength={2} defaultValue={partner.contactName || ""} style={{ minHeight: 46, border: "1px solid #cbd8e6", borderRadius: 10, padding: "10px 12px", fontSize: 16 }} /></label>
          <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>Email<input name="email" type="email" required defaultValue={partner.contactEmail || ""} style={{ minHeight: 46, border: "1px solid #cbd8e6", borderRadius: 10, padding: "10px 12px", fontSize: 16 }} /></label>
          <button className="ceo-server-primary" type="submit" style={{ minHeight: 46, border: 0, cursor: "pointer" }}>Invia invito Partner Admin</button>
        </form><p style={{ marginTop: 12, color: "#66768a" }}>L’account resta non attivo finché il destinatario non apre il link e imposta la password. Se l’invito scade, reinserisci la stessa email per generare un nuovo link.</p>
      </section>

      <section className="partner-detail-section"><div className="partner-detail-section__head"><div><h2>Account della società</h2><p>Stato reale: INVITO INVIATO, ATTIVO o DISATTIVATO. L’ultimo accesso deriva dall’audit di login, non dalla semplice modifica dell’account.</p></div><span className="partner-premium-section-number">02</span></div>
        <div className="partner-table-wrap"><table className="partner-table"><thead><tr><th>Nome</th><th>Email</th><th>Stato</th><th>Ultimo accesso</th><th></th></tr></thead><tbody>
          {detail.users.length ? detail.users.map((user) => { const state = accessState.get(user.email) || { status: user.active ? "ATTIVO" : "NON ATTIVO", lastLogin: null }; return <tr key={user.email}><td>{user.displayName}</td><td>{user.email}</td><td>{state.status}</td><td>{shortDate(state.lastLogin)}</td><td>{user.active ? <form method="post" action={`/api/ceo/partners/${encodeURIComponent(id)}/access`}><input type="hidden" name="email" value={user.email} /><input type="hidden" name="action" value="DISABLE" /><button type="submit" style={{ border: "1px solid #efb7b7", background: "#fff", color: "#9f1d1d", borderRadius: 9, padding: "8px 10px", fontWeight: 800 }}>Disattiva</button></form> : <span style={{ color: "#66768a" }}>Reinvia dal modulo sopra</span>}</td></tr>; }) : <tr><td className="partner-empty-row" colSpan={5}>Nessun account configurato. Invita il primo Partner Admin.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="partner-detail-section"><div className="partner-detail-section__head"><div><h2>Flusso di attivazione</h2><p>CEO → Supabase Auth → Resend → Partner imposta password → account attivo → accesso a /partner.</p></div><span className="partner-premium-section-number">03</span></div><div className="partner-attention-panel partner-attention-panel--regular" style={{ margin: 0 }}><div className="partner-attention-panel__icon">✓</div><div className="partner-attention-panel__copy"><small>ISOLAMENTO</small><strong>Nessuna password condivisa</strong><span>Ogni persona ha credenziali proprie; ruolo e partner_id restano governati da ECCOMI. La sessione CEO non abilita l’Area Partner.</span></div></div></section>
    </div>}
  </main>;
}
