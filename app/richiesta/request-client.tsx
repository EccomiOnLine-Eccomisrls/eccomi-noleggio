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
  hint: string;
  maxFiles: number;
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
    { key: "identity", field: "document_identity", label: "Documento di identità", hint: "PDF unico oppure fronte e retro", maxFiles: 2 },
    { key: "tax_code", field: "document_tax_code", label: "Tessera sanitaria / codice fiscale", hint: "PDF unico oppure fronte e retro", maxFiles: 2 },
    { key: "income", field: "document_income", label: "Documentazione reddituale richiesta dal noleggiatore", hint: "Puoi caricare più buste paga, CU o dichiarazioni", maxFiles: 10 },
  ];
  if (profile === "PROFESSIONAL") return [
    { key: "identity", field: "document_identity", label: "Documento di identità", hint: "PDF unico oppure fronte e retro", maxFiles: 2 },
    { key: "vat", field: "document_vat", label: "Attribuzione Partita IVA", hint: "PDF o immagini", maxFiles: 3 },
    { key: "income", field: "document_income", label: "Ultima dichiarazione dei redditi", hint: "Puoi caricare più allegati", maxFiles: 10 },
  ];
  return [
    { key: "identity", field: "document_identity", label: "Documento del legale rappresentante", hint: "PDF unico oppure fronte e retro", maxFiles: 2 },
    { key: "chamber", field: "document_chamber", label: "Visura camerale aggiornata", hint: "PDF o immagini", maxFiles: 5 },
    { key: "financial", field: "document_financial", label: "Documentazione economica richiesta dal noleggiatore", hint: "Puoi caricare più allegati", maxFiles: 10 },
  ];
}

function createSubmissionKey() {
  const browserCrypto = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === "function") return `ecn_${browserCrypto.randomUUID()}`;
  return `ecn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function normalizeIban(value: string) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function looksLikeIban(value: string) {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalizeIban(value));
}

export default function RequestClient({ promotionId }: { promotionId: string }) {
  const [promotion, setPromotion] = useState<PublicPromotion | null>(null);
  const [loading, setLoading] = useState(Boolean(promotionId));
  const [loadError, setLoadError] = useState(promotionId ? "" : "Il collegamento non contiene un’offerta valida.");
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<CustomerProfile>("");
  const [fields, setFields] = useState(blankFields);
  const [documents, setDocuments] = useState<Record<string, File[]>>({});
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
  const totalDocumentFiles = useMemo(() => Object.values(documents).reduce((total, files) => total + files.length, 0), [documents]);

  const contactComplete = useMemo(() => {
    const base = fields.firstName.trim().length >= 2
      && fields.lastName.trim().length >= 2
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
      && fields.phone.replace(/\D/g, "").length >= 8
      && fields.province.trim().length >= 2;
    return base && (profile === "PRIVATE" || (fields.businessName.trim().length >= 2 && fields.vatNumber.replace(/\D/g, "").length === 11));
  }, [fields, profile]);

  const documentsComplete = useMemo(
    () => documentRequirements.every((document) => (documents[document.key] || []).length > 0),
    [documentRequirements, documents],
  );

  const financialComplete = fields.accountHolder.trim().length >= 3 && looksLikeIban(fields.iban);
  const canContinue = step === 1 ? Boolean(profile) : step === 2 ? contactComplete : step === 3 ? documentsComplete && financialComplete : privacy;

  const updateField = (name: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [name]: value }));

  const setProfileAndResetDocuments = (value: CustomerProfile) => {
    setProfile(value);
    setDocuments({});
  };

  const addDocuments = (requirement: DocumentRequirement, selected: FileList | null) => {
    const incoming = Array.from(selected || []);
    if (!incoming.length) return;
    if (incoming.some((file) => file.size > 10 * 1024 * 1024)) {
      setSubmitError("Ogni file può avere una dimensione massima di 10 MB.");
      return;
    }
    setSubmitError("");
    setDocuments((current) => {
      const existing = current[requirement.key] || [];
      const merged = [...existing, ...incoming].slice(0, requirement.maxFiles);
      return { ...current, [requirement.key]: merged };
    });
  };

  const removeDocument = (key: string, index: number) => {
    setDocuments((current) => ({ ...current, [key]: (current[key] || []).filter((_, fileIndex) => fileIndex !== index) }));
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
        (documents[document.key] || []).forEach((file) => body.append(document.field, file, file.name));
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

  if (loading) return <main className="public-request-state"><Loader2 className="spin" size={34} /><h1>Sto aprendo la tua offerta</h1><p>Verifica dei dati ECCOMI in corso…</p></main>;
  if (loadError || !promotion) return <main className="public-request-state public-request-state--error"><AlertTriangle size={36} /><h1>Offerta non disponibile</h1><p>{loadError}</p><a href="https://eccomionline.com">Torna su Eccomi Online</a></main>;

  return (
    <main className="public-request-shell">
      <header className="public-request-header">
        <a href="https://eccomionline.com" aria-label="Torna a Eccomi Online"><span><CarFront size={21} /></span><strong>ECCOMI</strong><small>NOLEGGIO</small></a>
        <div><ShieldCheck size={17} /> Richiesta protetta e tracciata</div>
      </header>

      <div className="public-request-layout">
        <aside className="public-offer-card">
          <div className="public-offer-card__image"><img src={promotion.imageUrl} alt={`${promotion.brand} ${promotion.model}`} /></div>
          <span>OFFERTA SELEZIONATA</span><h1>{promotion.brand} {promotion.model}</h1><p>{promotion.version}</p>
          <div className="public-offer-card__price"><strong>{euro(promotion.monthlyGrossCents)}</strong><span>/mese IVA inclusa</span></div>
          <div className="public-offer-card__terms"><span><small>Anticipo</small><strong>{euro(promotion.depositGrossCents)}</strong></span><span><small>Durata</small><strong>{promotion.durationMonths} mesi</strong></span><span><small>Km</small><strong>{promotion.totalKm.toLocaleString("it-IT")}</strong></span></div>
          <div className="public-offer-card__expiry">Valida fino al <strong>{date(promotion.validUntil)}</strong>, salvo disponibilità.</div>
          <small>Offerta {promotion.offerNumber} · {promotion.provider}</small>
        </aside>

        <section className="public-application-card" aria-labelledby="request-title">
          {!practiceCode ? <>
            <div className="public-application-card__heading"><span>RICHIESTA GUIDATA</span><h2 id="request-title">Avvia la richiesta di noleggio</h2><p>Auto e condizioni sono già collegate. Ti chiediamo solo ciò che serve.</p></div>
            <div className="public-progress" aria-label={`Passaggio ${step} di 4`}>{["Profilo", "Dati", "Documenti", "Conferma"].map((label, index) => <span className={index + 1 <= step ? "public-progress--active" : ""} key={label}><i>{index + 1 < step ? <Check size={13} /> : index + 1}</i><small>{label}</small></span>)}</div>

            <div className="public-application-card__body">
              {step === 1 ? <div className="public-step"><span>PASSAGGIO 1 DI 4</span><h3>Per chi stai richiedendo il noleggio?</h3><p>Il percorso si adatta automaticamente al profilo.</p><div className="public-profile-grid">
                <button className={profile === "PRIVATE" ? "public-profile public-profile--active" : "public-profile"} type="button" onClick={() => setProfileAndResetDocuments("PRIVATE")}><UserRound size={25} /><strong>Privato</strong><small>Persona fisica</small><Check size={17} /></button>
                <button className={profile === "PROFESSIONAL" ? "public-profile public-profile--active" : "public-profile"} type="button" onClick={() => setProfileAndResetDocuments("PROFESSIONAL")}><BriefcaseBusiness size={25} /><strong>Professionista</strong><small>P.IVA o ditta individuale</small><Check size={17} /></button>
                <button className={profile === "COMPANY" ? "public-profile public-profile--active" : "public-profile"} type="button" onClick={() => setProfileAndResetDocuments("COMPANY")}><Building2 size={25} /><strong>Azienda</strong><small>Società o ente</small><Check size={17} /></button>
              </div></div> : null}

              {step === 2 ? <div className="public-step"><span>PASSAGGIO 2 DI 4 · {profileLabel(profile).toUpperCase()}</span><h3>Inserisci i dati del richiedente</h3><p>Servono per aprire e assegnare correttamente la pratica.</p><div className="public-fields">
                <label><span>Nome</span><input value={fields.firstName} onChange={(event) => updateField("firstName", event.target.value)} required /></label>
                <label><span>Cognome</span><input value={fields.lastName} onChange={(event) => updateField("lastName", event.target.value)} required /></label>
                <label><span>Email</span><input type="email" value={fields.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
                <label><span>Cellulare</span><input type="tel" value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} required /></label>
                <label><span>Provincia</span><input value={fields.province} onChange={(event) => updateField("province", event.target.value)} placeholder="Es. Roma" required /></label>
                {profile !== "PRIVATE" ? <><label><span>{profile === "COMPANY" ? "Ragione sociale" : "Denominazione attività"}</span><input value={fields.businessName} onChange={(event) => updateField("businessName", event.target.value)} required /></label><label><span>Partita IVA</span><input value={fields.vatNumber} onChange={(event) => updateField("vatNumber", event.target.value)} inputMode="numeric" maxLength={11} required /></label></> : null}
                <label className="public-honeypot" aria-hidden="true"><span>Sito web</span><input value={fields.website} onChange={(event) => updateField("website", event.target.value)} tabIndex={-1} /></label>
              </div></div> : null}

              {step === 3 ? <div className="public-step"><span>PASSAGGIO 3 DI 4 · DOCUMENTI E DATI BANCARI</span><h3>Completa la pratica</h3><p>Per ogni voce puoi usare un PDF unico oppure più foto e allegati.</p>
                <div className="public-bank-fields"><label><span>Intestatario del conto</span><input value={fields.accountHolder} onChange={(event) => updateField("accountHolder", event.target.value)} required /></label><label><span>IBAN</span><input value={fields.iban} onChange={(event) => updateField("iban", event.target.value.toUpperCase())} placeholder="IT00 X000 0000 0000 0000 0000 000" required /></label></div>
                <div className="public-document-list public-document-list--upload">{documentRequirements.map((item) => {
                  const files = documents[item.key] || [];
                  return <div key={item.key} className={files.length ? "public-document--complete" : ""}>
                    <span>{files.length ? <FileCheck2 size={19} /> : <UploadCloud size={19} />}</span>
                    <p><strong>{item.label}</strong><small>{files.length ? `${files.length} file caricati · ${files.map((file) => file.name).join(", ")}` : `${item.hint} · massimo 10 MB per file`}</small></p>
                    <label className="public-upload-button"><input className="public-upload-input" type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={(event) => { addDocuments(item, event.target.files); event.currentTarget.value = ""; }} />{files.length ? "+ Aggiungi" : "Carica"}</label>
                    {files.length ? <div>{files.map((file, index) => <button type="button" key={`${file.name}-${index}`} onClick={() => removeDocument(item.key, index)} aria-label={`Rimuovi ${file.name}`}>×</button>)}</div> : null}
                  </div>;
                })}</div>
                <div className="public-safety"><LockKeyhole size={20} /><p><strong>Area protetta ECCOMI.</strong><small>I documenti e l’IBAN vengono conservati in modo riservato e resi disponibili soltanto agli operatori autorizzati.</small></p></div>
                {submitError ? <div className="public-error"><AlertTriangle size={18} /> {submitError}</div> : null}
              </div> : null}

              {step === 4 ? <div className="public-step"><span>PASSAGGIO 4 DI 4 · RIEPILOGO</span><h3>Controlla e invia</h3>
                <div className="public-summary"><div><span>Offerta</span><strong>{promotion.brand} {promotion.model}</strong><small>{euro(promotion.monthlyGrossCents)}/mese · anticipo {euro(promotion.depositGrossCents)}</small></div><div><span>Richiedente</span><strong>{fields.firstName} {fields.lastName}</strong><small>{profileLabel(profile)} · {fields.email}</small></div><div><span>Pratica completa</span><strong>{totalDocumentFiles} file caricati</strong><small>IBAN terminante con {normalizeIban(fields.iban).slice(-4)}</small></div></div>
                <label className="public-consent"><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span>Ho letto l’<a href="https://eccomionline.com/policies/privacy-policy" target="_blank" rel="noreferrer">informativa privacy</a> e autorizzo il trattamento dei dati necessario alla gestione della richiesta.</span></label>
                <label className="public-consent public-consent--optional"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Desidero ricevere aggiornamenti e proposte commerciali ECCOMI. Consenso facoltativo.</span></label>
                <div className="public-safety"><ShieldCheck size={20} /><p><strong>ECCOMI governa la pratica.</strong><small>Il partner assegnato accede soltanto alla pratica e ai documenti di propria competenza.</small></p></div>
                {submitError ? <div className="public-error"><AlertTriangle size={18} /> {submitError}</div> : null}
              </div> : null}
            </div>

            <footer className="public-application-card__footer"><button className="public-button public-button--back" type="button" disabled={submitting} onClick={() => step === 1 ? history.back() : setStep((current) => current - 1)}><ArrowLeft size={17} /> {step === 1 ? "Torna all’offerta" : "Indietro"}</button><span>{step === 3 && !canContinue ? "Completa IBAN e documenti per continuare." : "I dati vengono salvati solo all’invio finale."}</span><button className="public-button public-button--primary" type="button" disabled={!canContinue || submitting} onClick={() => step < 4 ? setStep((current) => current + 1) : submit()}>{submitting ? <><Loader2 className="spin" size={18} /> Invio…</> : step < 4 ? <>Continua <ArrowRight size={17} /></> : <>Invia richiesta <Check size={17} /></>}</button></footer>
          </> : <div className="public-success"><span><Check size={38} /></span><small>PRATICA COMPLETA REGISTRATA</small><h2>La tua richiesta è stata inviata</h2><p>Dati, IBAN e documenti sono stati collegati all’offerta e assegnati al responsabile competente.</p><div><small>CODICE PRATICA</small><strong>{practiceCode}</strong></div><ul><li><Check size={16} /> ECCOMI verifica la pratica</li><li><Check size={16} /> I documenti restano nell’area protetta</li><li><Check size={16} /> Il partner competente può iniziare la lavorazione</li></ul><a className="public-button public-button--primary" href="https://eccomionline.com"><CarFront size={18} /> Torna su Eccomi Online</a></div>}
        </section>
      </div>
      <footer className="public-request-footer"><div><ShieldCheck size={17} /><span><strong>Governato da ECCOMI</strong><small>I partner operano. ECCOMI conserva controllo, dati e rapporto cliente.</small></span></div><div><MessageCircle size={17} /><span><strong>Hai bisogno di aiuto?</strong><small>Torna alla pagina dell’offerta e usa il pulsante WhatsApp.</small></span></div></footer>
    </main>
  );
}
