"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Check,
  FileCheck2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type CustomerProfile = "" | "PRIVATE" | "PROFESSIONAL" | "COMPANY";

type PublicPromotion = {
  id: string;
  offerNumber: string;
  brand: string;
  model: string;
  version: string;
  provider: string;
  monthlyGrossCents: number;
  depositGrossCents: number;
  durationMonths: number;
  totalKm: number;
  validUntil: string;
  delivery: string;
  fuel: string;
  transmission: string;
  color: string;
  services: string[];
  warnings: string[];
  imageUrl: string;
};

type DocumentRequirement = {
  key: string;
  field: string;
  label: string;
};

const blankFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  province: "",
  businessName: "",
  vatNumber: "",
  accountHolder: "",
  iban: "",
  website: "",
};

function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Rome" })
    .format(new Date(`${value}T12:00:00Z`));
}

function profileLabel(profile: CustomerProfile) {
  if (profile === "PRIVATE") return "Privato";
  if (profile === "PROFESSIONAL") return "Professionista / ditta individuale";
  if (profile === "COMPANY") return "Azienda";
  return "";
}

function documentsFor(profile: CustomerProfile): DocumentRequirement[] {
  if (profile === "PRIVATE") return [
    { key: "identity", field: "document_identity", label: "Documento di identità" },
    { key: "tax_code", field: "document_tax_code", label: "Tessera sanitaria / codice fiscale" },
    { key: "income", field: "document_income", label: "Documentazione reddituale richiesta dal noleggiatore" },
  ];
  if (profile === "PROFESSIONAL") return [
    { key: "identity", field: "document_identity", label: "Documento di identità" },
    { key: "vat", field: "document_vat", label: "Attribuzione Partita IVA" },
    { key: "income", field: "document_income", label: "Ultima dichiarazione dei redditi" },
  ];
  return [
    { key: "identity", field: "document_identity", label: "Documento del legale rappresentante" },
    { key: "chamber", field: "document_chamber", label: "Visura camerale aggiornata" },
    { key: "financial", field: "document_financial", label: "Documentazione economica richiesta dal noleggiatore" },
  ];
}

function createSubmissionKey() {
  const browserCrypto = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === "function") {
    return `ecn_${browserCrypto.randomUUID()}`;
  }
  const randomPart = Math.random().toString(36).slice(2);
  return `ecn_${Date.now().toString(36)}_${randomPart}`;
}

function normalizeIban(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function looksLikeIban(value: string) {
  const iban = normalizeIban(value);
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban);
}

export default function RequestClient({ promotionId }: { promotionId: string }) {
  const [promotion, setPromotion] = useState<PublicPromotion | null>(null);
  const [loading, setLoading] = useState(Boolean(promotionId));
  const [loadError, setLoadError] = useState(promotionId ? "" : "Il collegamento non contiene un’offerta valida.");
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<CustomerProfile>("");
  const [fields, setFields] = useState(blankFields);
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [practiceCode, setPracticeCode] = useState("");
  const submissionKey = useRef(createSubmissionKey());

  useEffect(() => {
    if (!promotionId) return;
    let mounted = true;
    fetch(`/api/public/promotions/${encodeURIComponent(promotionId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Offerta non disponibile.");
        return payload.promotion as PublicPromotion;
      })
      .then((value) => { if (mounted) setPromotion(value); })
      .catch((error) => { if (mounted) setLoadError(error instanceof Error ? error.message : "Offerta non disponibile."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [promotionId]);

  const documentRequirements = useMemo(() => documentsFor(profile), [profile]);

  const contactComplete = useMemo(() => {
    const base = fields.firstName.trim().length >= 2
      && fields.lastName.trim().length >= 2
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
      && fields.phone.replace(/\D/g, "").length >= 8
      && fields.province.trim().length >= 2;
    return base && (profile === "PRIVATE" || (fields.businessName.trim().length >= 2 && fields.vatNumber.replace(/\D/g, "").length === 11));
  }, [fields, profile]);

  const documentsComplete = useMemo(
    () => documentRequirements.every((document) => documents[document.key] instanceof File),
    [documentRequirements, documents],
  );

  const financialComplete = fields.accountHolder.trim().length >= 3 && looksLikeIban(fields.iban);
  const canContinue = step === 1
    ? Boolean(profile)
    : step === 2
      ? contactComplete
      : step === 3
        ? documentsComplete && financialComplete
        : privacy;

  const updateField = (name: keyof typeof fields, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const setProfileAndResetDocuments = (value: CustomerProfile) => {
    setProfile(value);
    setDocuments({});
  };

  const setDocument = (key: string, file: File | null) => {
    if (file && file.size > 10 * 1024 * 1024) {
      setSubmitError("Ogni documento può avere una dimensione massima di 10 MB.");
      return;
    }
    setSubmitError("");
    setDocuments((current) => ({ ...current, [key]: file }));
  };

  const submit = async () => {
    if (!promotion || !privacy || !documentsComplete || !financialComplete) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const body = new FormData();
      body.set("promotionId", promotion.id);
      body.set("customerType", profile);
      Object.entries(fields).forEach(([name, value]) => body.set(name, name === "iban" ? normalizeIban(value) : value));
      body.set("privacyAccepted", String(privacy));
      body.set("marketingConsent", String(marketing));
      body.set("submissionKey", submissionKey.current);
      documentRequirements.forEach((document) => {
        const file = documents[document.key];
        if (file) body.set(document.field, file, file.name);
      });

      const response = await fetch("/api/public/applications", {
        method: "POST",
        headers: { "idempotency-key": submissionKey.current },
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Invio non riuscito.");
      setPracticeCode(payload.practiceCode);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Invio non riuscito. Riprova tra poco.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="public-request-state"><Loader2 className="spin" size={34} /><h1>Sto aprendo la tua offerta</h1><p>Verifica dei dati ECCOMI in corso…</p></main>;
  }

  if (loadError || !promotion) {
    return <main className="public-request-state public-request-state--error"><AlertTriangle size={36} /><h1>Offerta non disponibile</h1><p>{loadError}</p><a href="https://eccomionline.com">Torna su Eccomi Online</a></main>;
  }

  return (
    <main className="public-request-shell">
      <header className="public-request-header">
        <a href="https://eccomionline.com" aria-label="Torna a Eccomi Online"><span><CarFront size={21} /></span><strong>ECCOMI</strong><small>NOLEGGIO</small></a>
        <div><ShieldCheck size={17} /> Richiesta protetta e tracciata</div>
      </header>

      <div className="public-request-layout">
        <aside className="public-offer-card">
          <div className="public-offer-card__image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={promotion.imageUrl} alt={`${promotion.brand} ${promotion.model}`} />
          </div>
          <span>OFFERTA SELEZIONATA</span>
          <h1>{promotion.brand} {promotion.model}</h1>
          <p>{promotion.version}</p>
          <div className="public-offer-card__price"><strong>{euro(promotion.monthlyGrossCents)}</strong><span>/mese IVA inclusa</span></div>
          <div className="public-offer-card__terms"><span><small>Anticipo</small><strong>{euro(promotion.depositGrossCents)}</strong></span><span><small>Durata</small><strong>{promotion.durationMonths} mesi</strong></span><span><small>Km</small><strong>{promotion.totalKm.toLocaleString("it-IT")}</strong></span></div>
          <div className="public-offer-card__expiry">Valida fino al <strong>{date(promotion.validUntil)}</strong>, salvo disponibilità.</div>
          <small>Offerta {promotion.offerNumber} · {promotion.provider}</small>
        </aside>

        <section className="public-application-card" aria-labelledby="request-title">
          {!practiceCode ? <>
            <div className="public-application-card__heading">
              <span>RICHIESTA GUIDATA</span>
              <h2 id="request-title">Avvia la richiesta di noleggio</h2>
              <p>Auto e condizioni sono già collegate. Ti chiediamo solo ciò che serve.</p>
            </div>

            <div className="public-progress" aria-label={`Passaggio ${step} di 4`}>
              {["Profilo", "Dati", "Documenti", "Conferma"].map((label, index) => <span className={index + 1 <= step ? "public-progress--active" : ""} key={label}><i>{index + 1 < step ? <Check size={13} /> : index + 1}</i><small>{label}</small></span>)}
            </div>

            <div className="public-application-card__body">
              {step === 1 ? <div className="public-step">
                <span>PASSAGGIO 1 DI 4</span><h3>Per chi stai richiedendo il noleggio?</h3><p>Il percorso si adatta automaticamente al profilo.</p>
                <div className="public-profile-grid">
                  <button className={profile === "PRIVATE" ? "public-profile public-profile--active" : "public-profile"} type="button" onClick={() => setProfileAndResetDocuments("PRIVATE")}><UserRound size={25} /><strong>Privato</strong><small>Persona fisica</small><Check size={17} /></button>
                  <button className={profile === "PROFESSIONAL" ? "public-profile public-profile--active" : "public-profile"} type="button" onClick={() => setProfileAndResetDocuments("PROFESSIONAL")}><BriefcaseBusiness size={25} /><strong>Professionista</strong><small>P.IVA o ditta individuale</small><Check size={17} /></button>
                  <button className={profile === "COMPANY" ? "public-profile public-profile--active" : "public-profile"} type="button" onClick={() => setProfileAndResetDocuments("COMPANY")}><Building2 size={25} /><strong>Azienda</strong><small>Società o ente</small><Check size={17} /></button>
                </div>
              </div> : null}

              {step === 2 ? <div className="public-step">
                <span>PASSAGGIO 2 DI 4 · {profileLabel(profile).toUpperCase()}</span><h3>Inserisci i dati del richiedente</h3><p>Servono per aprire e assegnare correttamente la pratica.</p>
                <div className="public-fields">
                  <label><span>Nome</span><input value={fields.firstName} onChange={(event) => updateField("firstName", event.target.value)} autoComplete="given-name" required /></label>
                  <label><span>Cognome</span><input value={fields.lastName} onChange={(event) => updateField("lastName", event.target.value)} autoComplete="family-name" required /></label>
                  <label><span>Email</span><input type="email" value={fields.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" required /></label>
                  <label><span>Cellulare</span><input type="tel" value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" required /></label>
                  <label><span>Provincia</span><input value={fields.province} onChange={(event) => updateField("province", event.target.value)} placeholder="Es. Roma" required /></label>
                  {profile !== "PRIVATE" ? <><label><span>{profile === "COMPANY" ? "Ragione sociale" : "Denominazione attività"}</span><input value={fields.businessName} onChange={(event) => updateField("businessName", event.target.value)} required /></label><label><span>Partita IVA</span><input value={fields.vatNumber} onChange={(event) => updateField("vatNumber", event.target.value)} inputMode="numeric" maxLength={11} required /></label></> : null}
                  <label className="public-honeypot" aria-hidden="true"><span>Sito web</span><input value={fields.website} onChange={(event) => updateField("website", event.target.value)} tabIndex={-1} autoComplete="off" /></label>
                </div>
              </div> : null}

              {step === 3 ? <div className="public-step">
                <span>PASSAGGIO 3 DI 4 · DOCUMENTI E DATI BANCARI</span><h3>Completa la pratica</h3><p>Carica tutto ciò che viene richiesto. Potrai continuare solo quando la pratica sarà completa.</p>
                <div className="public-bank-fields">
                  <label><span>Intestatario del conto</span><input value={fields.accountHolder} onChange={(event) => updateField("accountHolder", event.target.value)} autoComplete="name" placeholder="Nome e cognome o ragione sociale" required /></label>
                  <label><span>IBAN</span><input value={fields.iban} onChange={(event) => updateField("iban", event.target.value.toUpperCase())} autoComplete="off" placeholder="IT00 X000 0000 0000 0000 0000 000" required /></label>
                </div>
                <div className="public-document-list public-document-list--upload">{documentRequirements.map((item) => {
                  const file = documents[item.key];
                  return <div key={item.key} className={file ? "public-document--complete" : ""}>
                    <span>{file ? <FileCheck2 size={19} /> : <UploadCloud size={19} />}</span>
                    <p><strong>{item.label}</strong><small>{file ? file.name : "PDF, JPG o PNG · massimo 10 MB"}</small></p>
                    <label className="public-upload-button">
                      <input className="public-upload-input" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setDocument(item.key, event.target.files?.[0] || null)} />
                      {file ? "Sostituisci" : "Carica"}
                    </label>
                  </div>;
                })}</div>
                <div className="public-safety"><LockKeyhole size={20} /><p><strong>Area protetta ECCOMI.</strong><small>I documenti e l’IBAN vengono conservati in modo riservato e resi disponibili soltanto agli operatori autorizzati.</small></p></div>
                {submitError ? <div className="public-error"><AlertTriangle size={18} /> {submitError}</div> : null}
              </div> : null}

              {step === 4 ? <div className="public-step">
                <span>PASSAGGIO 4 DI 4 · RIEPILOGO</span><h3>Controlla e invia</h3>
                <div className="public-summary"><div><span>Offerta</span><strong>{promotion.brand} {promotion.model}</strong><small>{euro(promotion.monthlyGrossCents)}/mese · anticipo {euro(promotion.depositGrossCents)}</small></div><div><span>Richiedente</span><strong>{fields.firstName} {fields.lastName}</strong><small>{profileLabel(profile)} · {fields.email}</small></div><div><span>Pratica completa</span><strong>{documentRequirements.length} documenti caricati</strong><small>IBAN terminante con {normalizeIban(fields.iban).slice(-4)}</small></div></div>
                <label className="public-consent"><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span>Ho letto l’<a href="https://eccomionline.com/policies/privacy-policy" target="_blank" rel="noreferrer">informativa privacy</a> e autorizzo il trattamento dei dati necessario alla gestione della richiesta.</span></label>
                <label className="public-consent public-consent--optional"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Desidero ricevere aggiornamenti e proposte commerciali ECCOMI. Consenso facoltativo.</span></label>
                <div className="public-safety"><ShieldCheck size={20} /><p><strong>ECCOMI governa la pratica.</strong><small>Il partner assegnato accede soltanto alla pratica e ai documenti di propria competenza.</small></p></div>
                {submitError ? <div className="public-error"><AlertTriangle size={18} /> {submitError}</div> : null}
              </div> : null}
            </div>

            <footer className="public-application-card__footer">
              <button className="public-button public-button--back" type="button" disabled={submitting} onClick={() => step === 1 ? history.back() : setStep((current) => current - 1)}><ArrowLeft size={17} /> {step === 1 ? "Torna all’offerta" : "Indietro"}</button>
              <span>{step === 3 && !canContinue ? "Completa IBAN e documenti per continuare." : "I dati vengono salvati solo all’invio finale."}</span>
              <button className="public-button public-button--primary" type="button" disabled={!canContinue || submitting} onClick={() => step < 4 ? setStep((current) => current + 1) : submit()}>{submitting ? <><Loader2 className="spin" size={18} /> Invio…</> : step < 4 ? <>Continua <ArrowRight size={17} /></> : <>Invia richiesta <Check size={17} /></>}</button>
            </footer>
          </> : <div className="public-success">
            <span><Check size={38} /></span><small>PRATICA COMPLETA REGISTRATA</small><h2>La tua richiesta è stata inviata</h2><p>Dati, IBAN e documenti sono stati collegati all’offerta e assegnati al responsabile competente.</p>
            <div><small>CODICE PRATICA</small><strong>{practiceCode}</strong></div>
            <ul><li><Check size={16} /> ECCOMI verifica la pratica</li><li><Check size={16} /> I documenti restano nell’area protetta</li><li><Check size={16} /> Il partner competente può iniziare la lavorazione</li></ul>
            <a className="public-button public-button--primary" href="https://eccomionline.com"><CarFront size={18} /> Torna su Eccomi Online</a>
          </div>}
        </section>
      </div>

      <footer className="public-request-footer"><div><ShieldCheck size={17} /><span><strong>Governato da ECCOMI</strong><small>I partner operano. ECCOMI conserva controllo, dati e rapporto cliente.</small></span></div><div><MessageCircle size={17} /><span><strong>Hai bisogno di aiuto?</strong><small>Torna alla pagina dell’offerta e usa il pulsante WhatsApp.</small></span></div></footer>
    </main>
  );
}
