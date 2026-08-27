"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  CalendarDays,
  CarFront,
  CheckCircle2,
  FileText,
  Gauge,
  Loader2,
  LockKeyhole,
  LogOut,
  PauseCircle,
  ShieldCheck,
  Upload,
  UsersRound,
  WalletCards,
} from "lucide-react";

type Actor = { email: string; displayName: string; role: "PARTNER" | "PARTNER_ADMIN"; partnerId: string };
type SessionPayload = {
  actor: Actor;
  partner: { id: string; name: string; legalName: string; status: string; contactName: string | null; contactEmail: string | null };
  team: Array<{ email: string; displayName: string; role: string; active: boolean }>;
  capabilities: { manageTeam: boolean };
};
type Promotion = {
  id: string;
  offerNumber: string;
  brand: string;
  model: string;
  version: string;
  price: string;
  status: string;
  statusLabel: string;
  validUntil: string;
  days: string;
  automationStatus?: string | null;
  shopifyPrepared?: boolean;
};
type Lead = { id: string; customerName: string; email: string; phone: string; province: string; status: string; documentStatus: string; documentCount: number; vehicle: string; offerNumber: string; createdAt: string };
type DashboardPayload = {
  user: Actor;
  promotions: Promotion[];
  leads: Lead[];
  stats: { promotions: number; active: number; pendingApproval: number; expired: number; leads: number; newLeads: number; commissionCents: number };
};
type PracticeDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  province: string | null;
  status: string;
  iban: string | null;
  promotion: { offerNumber: string; brand: string; model: string; version: string; monthlyGrossCents: number; depositGrossCents: number; durationMonths: number; totalKm: number };
  documents: Array<{ id: string; documentType: string; originalName: string; sizeBytes: number; status: string }>;
};
type Section = "overview" | "offers" | "practices" | "commissions" | "team";
type OfferAction = "SUSPEND" | "ARCHIVE" | "EXTEND" | "REACTIVATE";

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Rome" });
const onlineStatuses = new Set(["ONLINE", "ACTIVE", "EXPIRING"]);
const extendableStatuses = new Set(["ONLINE", "ACTIVE", "EXPIRING", "EXPIRED", "SUSPENDED"]);

function partnerStatusLabel(status: string) {
  return ({
    DRAFT: "BOZZA",
    PENDING_APPROVAL: "IN VERIFICA ECCOMI",
    APPROVED: "APPROVATA ECCOMI",
    ONLINE: "PUBBLICATA",
    ACTIVE: "PUBBLICATA",
    EXPIRING: "IN SCADENZA",
    EXPIRED: "SCADUTA",
    SUSPENDED: "SOSPESA",
    ARCHIVED: "ARCHIVIATA",
  } as Record<string, string>)[status] || status.replaceAll("_", " ");
}

export default function PartnerPortalClient() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [selected, setSelected] = useState<PracticeDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [offerBusyId, setOfferBusyId] = useState("");
  const [extendDates, setExtendDates] = useState<Record<string, string>>({});

  const loadPortal = async () => {
    const sessionResponse = await fetch("/api/partner/session", { cache: "no-store", credentials: "same-origin" });
    if (sessionResponse.status === 401 || sessionResponse.status === 403) {
      setAuthorized(false);
      setSession(null);
      setDashboard(null);
      setChecking(false);
      return;
    }
    const sessionPayload = await sessionResponse.json() as SessionPayload & { error?: string };
    if (!sessionResponse.ok) throw new Error(sessionPayload.error || "Sessione Partner non disponibile.");

    const dashboardResponse = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
    const dashboardPayload = await dashboardResponse.json() as DashboardPayload & { error?: string };
    if (!dashboardResponse.ok) throw new Error(dashboardPayload.error || "Dati Partner non disponibili.");

    setSession(sessionPayload);
    setDashboard(dashboardPayload);
    setExtendDates(Object.fromEntries(dashboardPayload.promotions.map((item) => [item.id, item.validUntil])));
    setAuthorized(true);
    setChecking(false);
  };

  useEffect(() => {
    void loadPortal().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Accesso non disponibile.");
      setChecking(false);
    });
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/partner-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Accesso non riuscito.");
      await loadPortal();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Accesso non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    await fetch("/api/auth/partner-logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    setAuthorized(false);
    setSession(null);
    setDashboard(null);
    setSelected(null);
    setBusy(false);
  };

  const openPractice = async (id: string) => {
    setDetailBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/practices/${id}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Pratica non disponibile.");
      setSelected(payload.practice as PracticeDetail);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Pratica non disponibile.");
    } finally {
      setDetailBusy(false);
    }
  };

  const uploadQuotation = async (event: FormEvent) => {
    event.preventDefault();
    if (!quoteFile) {
      setError("Seleziona prima la quotazione PDF.");
      return;
    }
    setQuoteBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("quote", quoteFile);
      const response = await fetch("/api/partner/offers", { method: "POST", credentials: "same-origin", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Quotazione non caricata.");
      setNotice("Quotazione acquisita. ECCOMI la sta verificando prima della pubblicazione.");
      setQuoteFile(null);
      await loadPortal();
      setSection("offers");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Quotazione non caricata.");
    } finally {
      setQuoteBusy(false);
    }
  };

  const manageOffer = async (promotion: Promotion, action: OfferAction) => {
    if (action === "ARCHIVE" && !window.confirm(`Archiviare definitivamente l'offerta ${promotion.offerNumber}?`)) return;
    const validUntil = action === "EXTEND" ? extendDates[promotion.id] : undefined;
    setOfferBusyId(promotion.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/promotions/${promotion.id}/manage`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, validUntil }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Operazione non riuscita.");
      setNotice(action === "SUSPEND"
        ? "Offerta sospesa: non è più visibile al pubblico."
        : action === "REACTIVATE"
          ? "Offerta riattivata: è tornata disponibile al pubblico."
          : action === "ARCHIVE"
            ? "Offerta archiviata e mantenuta nello storico."
            : "Scadenza aggiornata correttamente.");
      await loadPortal();
      setSection("offers");
    } catch (manageError) {
      setError(manageError instanceof Error ? manageError.message : "Operazione non riuscita.");
    } finally {
      setOfferBusyId("");
    }
  };

  const openPractices = useMemo(() => dashboard?.leads.filter((lead) => !["DELIVERED", "ARCHIVED"].includes(lead.status)).length || 0, [dashboard]);

  if (checking) return <main style={styles.center}><Loader2 className="spin" size={28} /><strong>Verifica Area Partner…</strong></main>;

  if (!authorized || !session || !dashboard) {
    return (
      <main style={styles.loginPage}>
        <section style={styles.loginCard}>
          <div style={styles.brand}><span style={styles.brandIcon}><CarFront size={26} /></span><span><strong>ECCOMI</strong><small>NOLEGGIO · AREA PARTNER</small></span></div>
          <div><span style={styles.kicker}><ShieldCheck size={16} /> ACCESSO PARTNER</span><h1 style={styles.loginTitle}>Entra nel tuo spazio operativo</h1><p style={styles.muted}>Accedi per gestire offerte, pratiche, documenti e condizioni economiche della tua società.</p></div>
          <form onSubmit={login} style={styles.form}>
            <label style={styles.label}><span>Email Partner</span><input style={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
            <label style={styles.label}><span>Password</span><input style={styles.input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
            {error ? <div style={styles.error}>{error}</div> : null}
            <button style={styles.primaryButton} type="submit" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}{busy ? "Accesso…" : "Accedi all’Area Partner"}</button>
          </form>
          <div style={styles.securityNote}><ShieldCheck size={18} /><span>Accesso riservato ai Partner ECCOMI · Un servizio dell’ecosistema Eccomi OnLine.</span></div>
        </section>
      </main>
    );
  }

  const isAdmin = session.actor.role === "PARTNER_ADMIN";
  const nav: Array<{ id: Section; label: string }> = [
    { id: "overview", label: "Panoramica" },
    { id: "offers", label: "Offerte" },
    { id: "practices", label: "Pratiche" },
    { id: "commissions", label: "Commissioni" },
  ];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}><span style={styles.brandIcon}><CarFront size={25} /></span><span><strong>ECCOMI</strong><small>NOLEGGIO · AREA PARTNER</small></span></div>
        <div style={styles.headerActions}><span style={styles.secure}><ShieldCheck size={17} /> Perimetro protetto</span><button style={styles.logoutButton} type="button" onClick={() => void logout()}><LogOut size={16} /> Esci</button></div>
      </header>

      <div style={styles.content}>
        <section style={styles.hero}>
          <div><span style={styles.kicker}>{isAdmin ? "PARTNER ADMIN" : "PARTNER"}</span><h1 style={styles.title}>{session.partner.name}</h1><p style={styles.muted}>{session.partner.legalName} · {session.actor.displayName}</p></div>
          <div style={styles.scopeBadge}><Building2 size={18} /><span><strong>Area protetta</strong><small>Accesso riservato alla tua organizzazione</small></span></div>
        </section>

        <section style={styles.kpiGrid}>
          <button style={styles.kpiCard} onClick={() => setSection("offers")}><CarFront size={20} /><span>Offerte online</span><strong>{dashboard.stats.active}</strong><small>{dashboard.stats.pendingApproval} in verifica</small></button>
          <button style={styles.kpiCard} onClick={() => setSection("practices")}><Gauge size={20} /><span>Pratiche aperte</span><strong>{openPractices}</strong><small>{dashboard.stats.leads} totali</small></button>
          <button style={styles.kpiCard} onClick={() => setSection("commissions")}><WalletCards size={20} /><span>Provvigioni dovute</span><strong>{money.format(dashboard.stats.commissionCents / 100)}</strong><small>maturate</small></button>
          <button style={styles.kpiCard} onClick={() => isAdmin && setSection("team")}><UsersRound size={20} /><span>Collaboratori</span><strong>{isAdmin ? session.team.filter((item) => item.active).length : "—"}</strong><small>{isAdmin ? "gestibili dal Partner Admin" : "riservato al Partner Admin"}</small></button>
        </section>

        <nav style={styles.nav}>
          {nav.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} style={{ ...styles.navButton, ...(section === item.id ? styles.navButtonActive : {}) }}>{item.label}</button>)}
          <a href="/partner/provvigioni" style={styles.navLink}>Extra Gara</a>
          {isAdmin ? <button type="button" onClick={() => setSection("team")} style={{ ...styles.navButton, ...(section === "team" ? styles.navButtonActive : {}) }}>Collaboratori</button> : null}
        </nav>
        {error ? <div style={styles.error}>{error}</div> : null}
        {notice ? <div style={styles.notice}>{notice}</div> : null}

        {section === "overview" ? <section style={styles.twoCol}>
          <article style={styles.panel}><span style={styles.kicker}>OPERATIVITÀ</span><h2 style={styles.panelTitle}>Cosa richiede attenzione</h2>{openPractices ? <p style={styles.muted}>Hai {openPractices} pratiche aperte da lavorare. Apri la sezione Pratiche per i dettagli.</p> : <div style={styles.okBox}><CheckCircle2 size={20} /> Nessuna pratica aperta.</div>}</article>
          <article style={styles.panel}><span style={styles.kicker}>SICUREZZA</span><h2 style={styles.panelTitle}>Perimetro della società</h2><p style={styles.muted}>Offerte, clienti, documenti e provvigioni restano filtrati server-side sulla tua organizzazione.</p></article>
        </section> : null}

        {section === "offers" ? <section style={styles.offerStack}>
          <article style={styles.panel}>
            <div style={styles.sectionHead}><div><span style={styles.kicker}>NUOVA QUOTAZIONE</span><h2 style={styles.panelTitle}>Carica il PDF del noleggiatore</h2><p style={styles.muted}>ECCOMI estrae i dati, prepara la scheda e la mette in verifica. Il Partner non pubblica direttamente.</p></div></div>
            <form onSubmit={uploadQuotation} style={styles.uploadForm}>
              <label style={styles.fileBox}><Upload size={22} /><span><strong>{quoteFile ? quoteFile.name : "Seleziona quotazione PDF"}</strong><small>PDF · massimo 15 MB</small></span><input type="file" accept="application/pdf,.pdf" onChange={(event) => setQuoteFile(event.target.files?.[0] || null)} style={styles.hiddenInput} /></label>
              <button style={styles.primaryButton} type="submit" disabled={quoteBusy}>{quoteBusy ? <Loader2 className="spin" size={18} /> : <Upload size={18} />}{quoteBusy ? "Elaborazione…" : "Invia a verifica ECCOMI"}</button>
            </form>
          </article>

          <article style={styles.panel}>
            <div style={styles.sectionHead}><div><span style={styles.kicker}>LE TUE OFFERTE</span><h2 style={styles.panelTitle}>Quotazioni e pubblicazioni</h2></div><span style={styles.countBadge}>{dashboard.promotions.length}</span></div>
            <div style={styles.offerGrid}>{dashboard.promotions.map((item) => {
              const offerBusy = offerBusyId === item.id;
              const canSuspend = onlineStatuses.has(item.status);
              const canReactivate = item.status === "SUSPENDED";
              const canExtend = extendableStatuses.has(item.status);
              const canArchive = !["ARCHIVED", "TRASHED"].includes(item.status);
              return <article key={item.id} style={styles.offerCard}>
                <div style={styles.cardTop}><span style={styles.code}>OFFERTA {item.offerNumber}</span><span style={styles.statusBadge}>{partnerStatusLabel(item.status)}</span></div>
                <h3 style={styles.cardTitle}>{item.brand} {item.model}</h3>
                <p style={styles.muted}>{item.version}</p>
                <div style={styles.offerMeta}><div><span>Canone</span><strong>{item.price}</strong></div><div><span>Scadenza</span><strong>{date.format(new Date(`${item.validUntil}T12:00:00Z`))}</strong></div></div>
                {item.status === "PENDING_APPROVAL" ? <div style={styles.infoBox}>ECCOMI sta verificando la quotazione. Non devi fare altro.</div> : null}
                {canExtend ? <div style={styles.extendRow}><label><span>Nuova scadenza</span><input style={styles.dateInput} type="date" value={extendDates[item.id] || item.validUntil} onChange={(event) => setExtendDates((current) => ({ ...current, [item.id]: event.target.value }))} /></label><button style={styles.secondaryButton} type="button" disabled={offerBusy} onClick={() => void manageOffer(item, "EXTEND")}><CalendarDays size={16} /> Aggiorna scadenza</button></div> : null}
                <div style={styles.offerActions}>
                  {canSuspend ? <button style={styles.secondaryButton} type="button" disabled={offerBusy} onClick={() => void manageOffer(item, "SUSPEND")}><PauseCircle size={16} /> Sospendi</button> : null}
                  {canReactivate ? <button style={styles.secondaryButton} type="button" disabled={offerBusy} onClick={() => void manageOffer(item, "REACTIVATE")}><CheckCircle2 size={16} /> Riattiva</button> : null}
                  {canArchive ? <button style={styles.dangerButton} type="button" disabled={offerBusy} onClick={() => void manageOffer(item, "ARCHIVE")}><Archive size={16} /> Archivia</button> : null}
                  {offerBusy ? <span style={styles.working}><Loader2 className="spin" size={16} /> Salvataggio…</span> : null}
                </div>
              </article>;
            })}</div>
            {!dashboard.promotions.length ? <div style={styles.emptyBox}>Nessuna offerta ancora caricata. Usa il modulo sopra per inviare la prima quotazione.</div> : null}
          </article>
        </section> : null}

        {section === "practices" ? <section style={styles.panel}><div style={styles.sectionHead}><div><span style={styles.kicker}>LE TUE PRATICHE</span><h2 style={styles.panelTitle}>Richieste clienti</h2></div><span style={styles.countBadge}>{dashboard.leads.length}</span></div><div style={styles.practiceGrid}>{dashboard.leads.map((lead) => <article key={lead.id} style={styles.practiceCard}><div style={styles.cardTop}><span style={styles.code}>{lead.id}</span><span style={styles.statusBadge}>{lead.status.replaceAll("_", " ")}</span></div><h3 style={styles.cardTitle}>{lead.vehicle}</h3><p style={styles.muted}>Offerta {lead.offerNumber}</p><div style={styles.customer}><strong>{lead.customerName}</strong><span>{lead.province} · {lead.email}</span><span>{lead.phone}</span><small>{lead.documentCount} documenti</small></div><button style={styles.primaryButton} type="button" onClick={() => void openPractice(lead.id)} disabled={detailBusy}>{detailBusy ? <Loader2 className="spin" size={17} /> : <FileText size={17} />} Apri pratica</button></article>)}</div>{!dashboard.leads.length ? <p style={styles.muted}>Nessuna pratica associata alla tua società.</p> : null}</section> : null}

        {section === "commissions" ? <section style={styles.panel}><span style={styles.kicker}>PROVVIGIONI DOVUTE</span><h2 style={styles.panelTitle}>{money.format(dashboard.stats.commissionCents / 100)} maturate</h2><p style={{ ...styles.muted, fontWeight: 850, color: "#102033", marginBottom: 6 }}>CONTRATTO ACQUISITO</p><p style={styles.muted}>La provvigione ECCOMI matura quando il contratto viene acquisito.</p></section> : null}
        {section === "team" && isAdmin ? <section style={styles.panel}><div style={styles.sectionHead}><div><span style={styles.kicker}>PARTNER ADMIN</span><h2 style={styles.panelTitle}>Collaboratori della tua società</h2></div><span style={styles.countBadge}>{session.team.length}</span></div><div style={styles.teamGrid}>{session.team.map((member) => <article key={member.email} style={styles.memberCard}><strong>{member.displayName}</strong><span>{member.email}</span><small>{member.role} · {member.active ? "ATTIVO" : "DISATTIVATO"}</small></article>)}</div><p style={styles.muted}>Invito e disattivazione collaboratori saranno il prossimo modulo operativo del Partner Admin.</p></section> : null}
      </div>

      {selected ? <div style={styles.overlay} onClick={() => setSelected(null)}><section style={styles.drawer} onClick={(event) => event.stopPropagation()}><button style={styles.close} type="button" onClick={() => setSelected(null)}>×</button><span style={styles.kicker}>PRATICA {selected.id}</span><h2 style={styles.drawerTitle}>{selected.promotion.brand} {selected.promotion.model}</h2><p style={styles.muted}>{selected.promotion.version}</p><div style={styles.summaryGrid}><div><span>Canone</span><strong>{money.format(selected.promotion.monthlyGrossCents / 100)}</strong></div><div><span>Durata</span><strong>{selected.promotion.durationMonths} mesi</strong></div><div><span>Chilometri</span><strong>{selected.promotion.totalKm.toLocaleString("it-IT")}</strong></div></div><section style={styles.detailSection}><h3>Cliente</h3><p><strong>{selected.firstName} {selected.lastName}</strong><br />{selected.email}<br />{selected.phone}<br />{selected.province}</p></section><section style={styles.detailSection}><h3>Dati bancari</h3><p>{selected.iban || "IBAN non disponibile"}</p></section><section style={styles.detailSection}><h3>Documenti</h3><div style={styles.documents}>{selected.documents.map((document) => <a key={document.id} style={styles.documentLink} href={`/api/practices/${selected.id}/documents/${document.id}`} target="_blank" rel="noreferrer"><FileText size={17} /><span><strong>{document.documentType.replaceAll("_", " ")}</strong><small>{document.originalName}</small></span><CheckCircle2 size={17} /></a>)}</div></section></section></div> : null}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { minHeight: "100vh", display: "grid", placeItems: "center", gap: 12, background: "#f4f7fb", color: "#073f73" },
  loginPage: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(135deg,#073f73,#0c5597)" },
  loginCard: { width: "100%", maxWidth: 500, display: "grid", gap: 24, padding: 30, borderRadius: 22, background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,.22)" },
  brand: { display: "flex", alignItems: "center", gap: 12, color: "#073f73" }, brandIcon: { width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", background: "#0c74bb" },
  kicker: { display: "inline-flex", alignItems: "center", gap: 7, color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".1em" }, loginTitle: { margin: "10px 0 8px", fontSize: 30, color: "#102033" }, title: { margin: "7px 0", fontSize: 38, color: "#102033" }, muted: { margin: 0, color: "#66768a", lineHeight: 1.55 },
  form: { display: "grid", gap: 16 }, label: { display: "grid", gap: 7, color: "#102033", fontWeight: 800 }, input: { minHeight: 48, border: "1px solid #dce6f1", borderRadius: 12, padding: "11px 13px", fontSize: 16 },
  primaryButton: { minHeight: 46, border: 0, borderRadius: 11, padding: "11px 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1478bd", color: "#fff", fontWeight: 900, cursor: "pointer" },
  secondaryButton: { minHeight: 40, borderRadius: 10, border: "1px solid #cbd8e6", padding: "8px 12px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#fff", color: "#0c5597", fontWeight: 850, cursor: "pointer" },
  dangerButton: { minHeight: 40, borderRadius: 10, border: "1px solid #fecaca", padding: "8px 12px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#fff", color: "#b42318", fontWeight: 850, cursor: "pointer" },
  error: { margin: "10px 0", padding: 13, borderRadius: 11, background: "#fff1f2", color: "#b42318", fontWeight: 800 }, notice: { margin: "10px 0", padding: 13, borderRadius: 11, background: "#ecfdf3", color: "#166534", fontWeight: 800 }, securityNote: { display: "flex", gap: 9, padding: 13, borderRadius: 12, background: "#eff6ff", color: "#0c5597", fontSize: 13, lineHeight: 1.45 },
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#102033" }, header: { minHeight: 78, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px clamp(20px,5vw,72px)", background: "#fff", borderBottom: "1px solid #e4eaf0" }, headerActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, secure: { display: "inline-flex", alignItems: "center", gap: 7, color: "#267352", fontWeight: 800 }, logoutButton: { minHeight: 38, display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, border: "1px solid #dce6f1", background: "#fff", color: "#334155", fontWeight: 800 },
  content: { maxWidth: 1320, margin: "0 auto", padding: "34px 24px 80px" }, hero: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", padding: 26, background: "#fff", border: "1px solid #dce6f1", borderRadius: 20 }, scopeBadge: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#ecfdf3", color: "#166534" },
  kpiGrid: { marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }, kpiCard: { textAlign: "left", display: "grid", gap: 5, padding: 18, borderRadius: 17, border: "1px solid #dce6f1", background: "#fff", color: "#102033" }, nav: { margin: "18px 0", display: "flex", gap: 8, flexWrap: "wrap" }, navButton: { padding: "9px 13px", borderRadius: 999, border: "1px solid #cbd8e6", background: "#fff", color: "#0c5597", fontWeight: 850, cursor: "pointer" }, navLink: { padding: "9px 13px", borderRadius: 999, border: "1px solid #cbd8e6", background: "#fff", color: "#0c5597", fontWeight: 850, textDecoration: "none", display: "inline-flex", alignItems: "center" }, navButtonActive: { background: "#0c5597", color: "#fff", borderColor: "#0c5597" },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }, panel: { padding: 22, borderRadius: 19, background: "#fff", border: "1px solid #dce6f1" }, panelTitle: { margin: "7px 0 12px", fontSize: 23 }, okBox: { display: "flex", gap: 9, alignItems: "center", padding: 14, borderRadius: 13, background: "#ecfdf3", color: "#166534", fontWeight: 850 }, sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 14, flexWrap: "wrap" }, countBadge: { minWidth: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 999, background: "#eff6ff", color: "#0c5597", fontWeight: 900 },
  offerStack: { display: "grid", gap: 14 }, uploadForm: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "stretch" }, fileBox: { minHeight: 68, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 13, border: "1px dashed #9db7cf", background: "#f8fbff", color: "#0c5597", cursor: "pointer" }, hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }, offerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 13 }, offerCard: { display: "grid", gap: 11, padding: 18, borderRadius: 16, background: "#fbfdff", border: "1px solid #e0e8f0" }, offerMeta: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }, extendRow: { display: "grid", gridTemplateColumns: "minmax(170px,1fr) auto", gap: 10, alignItems: "end", paddingTop: 8, borderTop: "1px solid #e5edf5" }, dateInput: { width: "100%", minHeight: 40, marginTop: 5, borderRadius: 9, border: "1px solid #cbd8e6", padding: "7px 9px", fontSize: 14 }, offerActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, working: { display: "inline-flex", alignItems: "center", gap: 6, color: "#66768a", fontSize: 13 }, infoBox: { padding: 11, borderRadius: 10, background: "#eff6ff", color: "#0c5597", fontSize: 13, fontWeight: 700 }, emptyBox: { padding: 18, borderRadius: 13, background: "#f8fafc", color: "#66768a", textAlign: "center" },
  statusBadge: { display: "inline-block", padding: "6px 8px", borderRadius: 999, background: "#e9f7ef", color: "#25734f", fontSize: 11, fontWeight: 900 }, practiceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14 }, practiceCard: { display: "grid", gap: 12, padding: 18, borderRadius: 16, background: "#fbfdff", border: "1px solid #e0e8f0" }, cardTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }, code: { fontSize: 12, fontWeight: 900, color: "#0c5597" }, cardTitle: { margin: 0, fontSize: 21 }, customer: { display: "grid", gap: 4, padding: 13, borderRadius: 12, background: "#f1f5f9", color: "#526274" }, teamGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginBottom: 14 }, memberCard: { display: "grid", gap: 5, padding: 14, borderRadius: 13, background: "#f8fafc", border: "1px solid #e2e8f0" },
  overlay: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(8,24,40,.46)", display: "flex", justifyContent: "flex-end" }, drawer: { position: "relative", width: "min(620px,96vw)", height: "100%", overflowY: "auto", padding: 30, background: "#fff", boxShadow: "-20px 0 60px rgba(8,24,40,.2)" }, close: { position: "absolute", top: 18, right: 18, width: 42, height: 42, borderRadius: 12, border: "1px solid #dce6f1", background: "#fff", fontSize: 24, cursor: "pointer" }, drawerTitle: { margin: "10px 54px 5px 0", fontSize: 29 }, summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, margin: "22px 0" }, detailSection: { marginTop: 24, paddingTop: 20, borderTop: "1px solid #e4eaf0" }, documents: { display: "grid", gap: 10 }, documentLink: { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: 13, borderRadius: 12, border: "1px solid #dce6f1", color: "#073f73", textDecoration: "none" },
};
