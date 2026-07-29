"use client";

import { FormEvent, useEffect, useState } from "react";
import { CarFront, CheckCircle2, FileText, Loader2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

type Lead = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  province: string;
  customerType: string;
  status: string;
  documentStatus: string;
  createdAt: string;
  vehicle: string;
  offerNumber: string;
  partnerName: string;
};

type PracticeDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  province: string | null;
  customerType: string | null;
  accountHolder: string | null;
  iban: string | null;
  status: string;
  promotion: {
    offerNumber: string;
    brand: string;
    model: string;
    version: string;
    provider: string;
    monthlyGrossCents: number;
    depositGrossCents: number;
    durationMonths: number;
    totalKm: number;
  };
  documents: Array<{ id: string; documentType: string; originalName: string; sizeBytes: number; status: string }>;
  timeline: Array<{ id: string; action: string; createdAt: string }>;
};

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export default function PartnerPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<PracticeDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const loadDashboard = async () => {
    const response = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
    if (response.status === 401) {
      setAuthorized(false);
      setChecking(false);
      return;
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Dati non disponibili.");
    setLeads(payload.leads || []);
    setAuthorized(true);
    setChecking(false);
  };

  useEffect(() => { void loadDashboard().catch(() => setChecking(false)); }, []);

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
      await loadDashboard();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Accesso non riuscito.");
    } finally {
      setBusy(false);
    }
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

  if (checking) {
    return <main style={styles.center}><Loader2 className="spin" size={28} /><strong>Verifica accesso partner…</strong></main>;
  }

  if (!authorized) {
    return (
      <main style={styles.loginPage}>
        <section style={styles.loginCard}>
          <div style={styles.brand}><span style={styles.brandIcon}><CarFront size={26} /></span><span><strong>ECCOMI</strong><small>NOLEGGIO · AREA PARTNER</small></span></div>
          <div><span style={styles.kicker}><ShieldCheck size={16} /> ACCESSO RISERVATO</span><h1 style={styles.loginTitle}>Entra nella dashboard partner</h1><p style={styles.muted}>Visualizza esclusivamente le pratiche assegnate alla tua struttura.</p></div>
          <form onSubmit={login} style={styles.form}>
            <label style={styles.label}><span>Email partner</span><input style={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
            <label style={styles.label}><span>Password</span><input style={styles.input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
            {error ? <div style={styles.error}>{error}</div> : null}
            <button style={styles.primaryButton} type="submit" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}{busy ? "Accesso…" : "Accedi"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}><span style={styles.brandIcon}><CarFront size={25} /></span><span><strong>ECCOMI</strong><small>NOLEGGIO · AREA PARTNER</small></span></div>
        <span style={styles.secure}><ShieldCheck size={17} /> Accesso protetto</span>
      </header>
      <div style={styles.content}>
        <section style={styles.heading}><span style={styles.kicker}>PRATICHE ASSEGNATE</span><h1 style={styles.title}>Le tue richieste di noleggio</h1><p style={styles.muted}>Dati e documenti sono disponibili soltanto per le pratiche di tua competenza.</p></section>
        {error ? <div style={styles.error}>{error}</div> : null}
        {!leads.length ? <section style={styles.empty}><UserRound size={34} /><h2>Nessuna pratica assegnata</h2><p style={styles.muted}>Le nuove richieste inviate da ECCOMI compariranno qui.</p></section> : null}
        <section style={styles.grid}>
          {leads.map((lead) => (
            <article key={lead.id} style={styles.card}>
              <div style={styles.cardTop}><span style={styles.code}>{lead.id}</span><span style={styles.status}>{lead.status.replaceAll("_", " ")}</span></div>
              <h2 style={styles.cardTitle}>{lead.vehicle}</h2>
              <p style={styles.muted}>Offerta {lead.offerNumber}</p>
              <div style={styles.customer}><strong>{lead.customerName}</strong><span>{lead.province} · {lead.email}</span><span>{lead.phone}</span></div>
              <button style={styles.primaryButton} type="button" onClick={() => void openPractice(lead.id)} disabled={detailBusy}>{detailBusy ? <Loader2 className="spin" size={17} /> : <FileText size={17} />} Apri pratica</button>
            </article>
          ))}
        </section>
      </div>
      {selected ? (
        <div style={styles.overlay} onClick={() => setSelected(null)}>
          <section style={styles.drawer} onClick={(event) => event.stopPropagation()}>
            <button style={styles.close} type="button" onClick={() => setSelected(null)}>×</button>
            <span style={styles.kicker}>PRATICA {selected.id}</span>
            <h2 style={styles.drawerTitle}>{selected.promotion.brand} {selected.promotion.model}</h2>
            <p style={styles.muted}>{selected.promotion.version}</p>
            <div style={styles.summaryGrid}>
              <div><span>Canone</span><strong>{money.format(selected.promotion.monthlyGrossCents / 100)}</strong></div>
              <div><span>Durata</span><strong>{selected.promotion.durationMonths} mesi</strong></div>
              <div><span>Chilometri</span><strong>{selected.promotion.totalKm.toLocaleString("it-IT")}</strong></div>
            </div>
            <section style={styles.section}><h3>Cliente</h3><p><strong>{selected.firstName} {selected.lastName}</strong><br />{selected.email}<br />{selected.phone}<br />{selected.province}</p></section>
            <section style={styles.section}><h3>Dati bancari</h3><p><strong>{selected.accountHolder || "Intestatario non indicato"}</strong><br />{selected.iban || "IBAN non disponibile"}</p></section>
            <section style={styles.section}><h3>Documenti</h3><div style={styles.documents}>{selected.documents.map((document) => <a key={document.id} style={styles.documentLink} href={`/api/practices/${selected.id}/documents/${document.id}`} target="_blank" rel="noreferrer"><FileText size={17} /><span><strong>{document.documentType.replaceAll("_", " ")}</strong><small>{document.originalName}</small></span><CheckCircle2 size={17} /></a>)}</div></section>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { minHeight: "100vh", display: "grid", placeItems: "center", gap: 12, background: "#f4f7fb", color: "#073f73" },
  loginPage: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(135deg,#073f73,#0c5597)" },
  loginCard: { width: "100%", maxWidth: 460, display: "grid", gap: 24, padding: 30, borderRadius: 22, background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,.22)" },
  brand: { display: "flex", alignItems: "center", gap: 12, color: "#073f73" },
  brandIcon: { width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", background: "#0c74bb" },
  kicker: { display: "inline-flex", alignItems: "center", gap: 7, color: "#0c5597", fontSize: 12, fontWeight: 900, letterSpacing: ".1em" },
  loginTitle: { margin: "10px 0 8px", fontSize: 30, color: "#102033" },
  title: { margin: "8px 0", fontSize: 36, color: "#102033" },
  muted: { margin: 0, color: "#66768a", lineHeight: 1.55 },
  form: { display: "grid", gap: 16 },
  label: { display: "grid", gap: 7, color: "#102033", fontWeight: 800 },
  input: { minHeight: 48, border: "1px solid #dce6f1", borderRadius: 12, padding: "11px 13px", fontSize: 16 },
  primaryButton: { minHeight: 46, border: 0, borderRadius: 11, padding: "11px 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1478bd", color: "#fff", fontWeight: 900, cursor: "pointer" },
  error: { padding: 13, borderRadius: 11, background: "#fff1f2", color: "#b42318", fontWeight: 800 },
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#102033" },
  header: { minHeight: 78, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px clamp(20px,5vw,72px)", background: "#fff", borderBottom: "1px solid #e4eaf0" },
  secure: { display: "inline-flex", alignItems: "center", gap: 7, color: "#267352", fontWeight: 800 },
  content: { maxWidth: 1240, margin: "0 auto", padding: "46px 24px 80px" },
  heading: { marginBottom: 30 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 18 },
  card: { display: "grid", gap: 14, padding: 22, borderRadius: 18, background: "#fff", border: "1px solid #e0e8f0", boxShadow: "0 12px 28px rgba(20,52,83,.06)" },
  cardTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  code: { fontSize: 12, fontWeight: 900, color: "#0c5597" },
  status: { padding: "6px 8px", borderRadius: 999, background: "#e9f7ef", color: "#25734f", fontSize: 11, fontWeight: 900 },
  cardTitle: { margin: 0, fontSize: 22 },
  customer: { display: "grid", gap: 4, padding: 14, borderRadius: 12, background: "#f6f9fc", color: "#526274" },
  empty: { padding: 50, display: "grid", placeItems: "center", textAlign: "center", borderRadius: 18, background: "#fff", border: "1px solid #e0e8f0" },
  overlay: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(8,24,40,.46)", display: "flex", justifyContent: "flex-end" },
  drawer: { position: "relative", width: "min(620px,96vw)", height: "100%", overflowY: "auto", padding: 30, background: "#fff", boxShadow: "-20px 0 60px rgba(8,24,40,.2)" },
  close: { position: "absolute", top: 18, right: 18, width: 42, height: 42, borderRadius: 12, border: "1px solid #dce6f1", background: "#fff", fontSize: 24, cursor: "pointer" },
  drawerTitle: { margin: "10px 54px 5px 0", fontSize: 29 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, margin: "22px 0" },
  section: { marginTop: 24, paddingTop: 20, borderTop: "1px solid #e4eaf0" },
  documents: { display: "grid", gap: 10 },
  documentLink: { display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: 13, borderRadius: 12, border: "1px solid #dce6f1", color: "#073f73", textDecoration: "none" },
};
