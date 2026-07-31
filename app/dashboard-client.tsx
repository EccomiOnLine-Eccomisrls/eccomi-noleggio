"use client";

import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  BadgeEuro,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  CircleGauge,
  Clock3,
  Download,
  Eye,
  FileText,
  FileCheck2,
  Filter,
  Handshake,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  LockKeyhole,
  Menu,
  MessageCircle,
  Plus,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { extractQuoteFromPdf, type QuoteDraft } from "./lib/quote-parser";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Promozioni", icon: CarFront, count: 2 },
  { label: "Lead e pratiche", icon: UsersRound },
  { label: "Partner", icon: Handshake },
  { label: "Commissioni", icon: BadgeEuro },
];

type PromotionStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "ONLINE" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "ARCHIVED";

type Promotion = {
  id: string;
  offerNumber: string;
  brand: string;
  model: string;
  owner: string;
  source: string;
  rental: string;
  price: string;
  deposit: string;
  term: string;
  mileage: string;
  expires: string;
  validUntil: string;
  days: string;
  image: string | null;
  accent: string;
  version: string;
  fuel: string;
  transmission: string;
  color: string;
  delivery: string;
  services: string[];
  warnings: string[];
  status: PromotionStatus;
  statusLabel: string;
  quoteStored: boolean;
  shopifyProductId: string | null;
  shopifyPrepared: boolean;
  shopifyUrl: string | null;
  shopifyCollectionId?: string | null;
  automationStatus?: string;
  automationError?: string | null;
  extractionMethod?: string;
  coverSourceKind?: string | null;
  coverAttribution?: string | null;
};

type ShopifyConnectionState = {
  connected: boolean;
  publishingReady: boolean;
  shopDomain: string | null;
  shopName: string | null;
  storefrontUrl: string | null;
  publicationLabel: string | null;
  clientIdHint: string | null;
  verifiedAt: string | null;
};

type AiConnectionState = {
  connected: boolean;
  textModel: string;
  imageModel: string;
  verifiedAt: string | null;
  source: "environment" | "encrypted" | null;
};

type HubEvent = {
  id: string;
  eventType: string;
  title: string;
  actorEmail: string;
  createdAt: string;
};

type LeadSummary = {
  id: string;
  promotionId: string;
  partnerId: string;
  customerName: string;
  email: string;
  phone: string;
  province: string;
  customerType: string;
  businessName: string | null;
  status: string;
  documentStatus: string;
  createdAt: string;
  vehicle: string;
  offerNumber: string;
  partnerName: string;
};

const disconnectedShopify: ShopifyConnectionState = {
  connected: false,
  publishingReady: false,
  shopDomain: null,
  shopName: null,
  storefrontUrl: null,
  publicationLabel: null,
  clientIdHint: null,
  verifiedAt: null,
};

const disconnectedAi: AiConnectionState = {
  connected: false,
  textModel: "gpt-5.6-terra",
  imageModel: "gpt-image-2",
  verifiedAt: null,
  source: null,
};

const initialPromotions: Promotion[] = [
  {
    id: "promo-kia-66678832-001",
    offerNumber: "66678832/001",
    brand: "KIA",
    model: "Picanto 1.0 GDi AMT Urban",
    owner: "ECCOMI diretto",
    source: "Caricata dal CEO",
    rental: "Ayvens / ALD",
    price: "354,74 €",
    deposit: "0 €",
    term: "48 mesi",
    mileage: "120.000 km",
    expires: "09 ago 2026",
    validUntil: "2026-08-09",
    days: "18 giorni",
    image: "/offers/kia-picanto.png",
    accent: "blue",
    version: "KIA PICANTO 1.0 GDi AMT Urban Hatchback 5-door (Euro 6E)",
    fuel: "Benzina",
    transmission: "Automatico",
    color: "Clear White",
    delivery: "Circa 9 settimane",
    services: ["RCA", "Infortuni conducente", "Tutela legale", "Manutenzione", "Veicolo sostitutivo", "4 pneumatici estivi", "Telematica"],
    warnings: ["Bollo auto escluso dal canone", "Offerta valida salvo venduto"],
    status: "PENDING_APPROVAL",
    statusLabel: "DA APPROVARE",
    quoteStored: false,
    shopifyProductId: null,
    shopifyPrepared: false,
    shopifyUrl: null,
  },
  {
    id: "promo-fiat-4022049326",
    offerNumber: "4022049326",
    brand: "FIAT",
    model: "Pandina 3 Icon Hybrid",
    owner: "Goal Rent SRL",
    source: "Partner operativo",
    rental: "Leasys",
    price: "493,26 €",
    deposit: "0 €",
    term: "36 mesi",
    mileage: "80.000 km",
    expires: "27 lug 2026",
    validUntil: "2026-07-27",
    days: "5 giorni",
    image: null,
    accent: "yellow",
    version: "PANDINA 1.0 FireFly 65cv SS 6m Hybrid",
    fuel: "Ibrido benzina",
    transmission: "Manuale",
    color: "Giallo Positano",
    delivery: "Entro 24 settimane",
    services: ["RCA", "PAI conducente", "Manutenzione", "Copertura danni", "Incendio e furto", "Traino standard", "I-Care Smart"],
    warnings: ["Bollo auto con riaddebito periodico", "Penali e franchigie previste"],
    status: "PENDING_APPROVAL",
    statusLabel: "DA APPROVARE",
    quoteStored: false,
    shopifyProductId: null,
    shopifyPrepared: false,
    shopifyUrl: null,
  },
];

type ViewName = (typeof navigation)[number]["label"];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`}>
      <span className="brand-mark__symbol">
        <CarFront size={compact ? 20 : 24} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="brand-mark__copy">
          <strong>ECCOMI</strong>
          <small>NOLEGGIO</small>
        </span>
      )}
    </div>
  );
}

function PromotionThumb({ promotion }: { promotion: Promotion }) {
  if (promotion.image) {
    return (
      <div className="promotion-thumb promotion-thumb--image">
        {/* The source is a local, fixed-size product cover; direct rendering avoids a runtime image proxy. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={promotion.image} alt={`${promotion.brand} ${promotion.model}`} />
      </div>
    );
  }

  return (
    <div className="promotion-thumb promotion-thumb--pandina" aria-label="Fiat Pandina">
      <span>FIAT</span>
      <strong>PANDINA</strong>
      <small>HYBRID</small>
    </div>
  );
}

function ViewHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading section-heading">
      <div>
        <p className="eyebrow">ECCOMI HUB <span>/</span> {eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="page-heading__actions">{action}</div> : null}
    </div>
  );
}

function PromotionsView({
  query,
  promotions,
  shopify,
  onUpload,
  onSelect,
}: {
  query: string;
  promotions: Promotion[];
  shopify: ShopifyConnectionState;
  onUpload: () => void;
  onSelect: (promotion: Promotion) => void;
}) {
  const pendingCount = promotions.filter((promotion) => promotion.status === "PENDING_APPROVAL").length;
  const approvedCount = promotions.filter((promotion) => promotion.status === "APPROVED").length;
  const activeCount = promotions.filter((promotion) => promotion.status === "ONLINE" || promotion.status === "ACTIVE" || promotion.status === "EXPIRING").length;
  const expiredCount = promotions.filter((promotion) => promotion.status === "EXPIRED" || promotion.status === "ARCHIVED").length;
  const normalizedQuery = query.trim().toLocaleLowerCase("it");
  const filtered = promotions.filter((promotion) =>
    [promotion.brand, promotion.model, promotion.owner, promotion.rental, promotion.id]
      .join(" ")
      .toLocaleLowerCase("it")
      .includes(normalizedQuery),
  );

  return (
    <div className="dashboard workspace-view">
      <ViewHeading
        eyebrow="NOLEGGIO / PROMOZIONI"
        title="Promozioni"
        description="Quotazioni, anteprime Shopify, scadenze e approvazioni CEO."
        action={(
          <button className="button button--primary" type="button" onClick={onUpload}>
            <UploadCloud size={18} /> Carica quotazione PDF
          </button>
        )}
      />

      <section className="view-kpis view-kpis--three">
        <article><span>DA APPROVARE</span><strong>{pendingCount}</strong><small>Richiedono controllo CEO</small></article>
        <article><span>APPROVATE</span><strong>{approvedCount}</strong><small>Pronte per Shopify</small></article>
        <article><span>ONLINE SU SHOPIFY</span><strong>{activeCount}</strong><small>{shopify.publishingReady ? "Pubblicazione operativa" : shopify.connected ? "Collegato · pubblicazione protetta" : "Collegamento da completare"}</small></article>
      </section>

      <section className="panel data-panel">
        <div className="data-toolbar">
          <div className="filter-tabs" aria-label="Filtri promozioni">
            <button className="filter-tab filter-tab--active" type="button">Tutte <span>{promotions.length}</span></button>
            <button className="filter-tab" type="button">Da approvare <span>{pendingCount}</span></button>
            <button className="filter-tab" type="button">Attive <span>{activeCount}</span></button>
            <button className="filter-tab" type="button">Scadute <span>{expiredCount}</span></button>
          </div>
          <button className="button button--secondary button--small" type="button">
            <Filter size={15} /> Filtri
          </button>
        </div>

        <div className="data-table" role="table" aria-label="Promozioni">
          <div className="data-table__header" role="row">
            <span>Promozione</span><span>Proprietà e gestione</span><span>Condizioni</span><span>Scadenza</span><span>Stato</span><span />
          </div>
          {filtered.map((promotion) => {
            const approved = promotion.status === "APPROVED" || promotion.status === "ONLINE" || promotion.status === "ACTIVE" || promotion.status === "EXPIRING";
            return (
              <article className="data-table__row" role="row" key={promotion.id}>
                <div className="table-promotion"><PromotionThumb promotion={promotion} /><div><strong>{promotion.brand} {promotion.model}</strong><span>Offerta {promotion.offerNumber} · {promotion.rental}</span></div></div>
                <div className="table-owner"><strong>{promotion.owner}</strong><span>{promotion.source}</span></div>
                <div className="table-terms"><strong>{promotion.price}<small>/mese</small></strong><span>{promotion.deposit} anticipo · {promotion.term}</span></div>
                <div className="table-expiry"><strong>{promotion.expires}</strong><span>{promotion.days} rimanenti</span></div>
                <div><span className={`status-badge ${approved ? "status-badge--approved" : ""}`}>{promotion.statusLabel}</span></div>
                <button className="table-action" type="button" onClick={() => onSelect(promotion)} aria-label={`Apri ${promotion.model}`}><Eye size={17} /> <span>Apri</span></button>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 ? <div className="table-empty"><Search size={25} /><strong>Nessuna promozione trovata</strong><span>Prova a modificare la ricerca.</span></div> : null}
      </section>

      <div className="integrity-note"><ShieldCheck size={21} /><div><strong>Integrità ECCOMI</strong><span>I partner non possono pubblicare, riattivare o archiviare offerte. Queste azioni restano riservate al CEO.</span></div></div>
    </div>
  );
}

function LeadsView({ leads }: { leads: LeadSummary[] }) {
  const stages = [
    { label: "Nuovo", statuses: ["NEW"] },
    { label: "Verifica ECCOMI", statuses: ["ECCOMI_REVIEW", "NEEDS_INFO"] },
    { label: "Inviato al partner", statuses: ["SENT_TO_PARTNER"] },
    { label: "Preventivo", statuses: ["QUOTE"] },
    { label: "Contratto", statuses: ["CONTRACT"] },
    { label: "Consegnato", statuses: ["DELIVERED"] },
  ];
  const newCount = leads.filter((lead) => lead.status === "NEW").length;
  const workCount = leads.filter((lead) => !["NEW", "CONTRACT", "DELIVERED", "REJECTED", "ARCHIVED"].includes(lead.status)).length;
  const contractCount = leads.filter((lead) => ["CONTRACT", "DELIVERED"].includes(lead.status)).length;
  const profile = (value: string) => ({ PRIVATE: "Privato", PROFESSIONAL: "Professionista", COMPANY: "Azienda" } as Record<string, string>)[value] || value;
  const leadStatus = (value: string) => ({ NEW: "NUOVA", ECCOMI_REVIEW: "IN VERIFICA", NEEDS_INFO: "DA INTEGRARE", SENT_TO_PARTNER: "AL PARTNER", QUOTE: "PREVENTIVO", CONTRACT: "CONTRATTO", DELIVERED: "CONSEGNATA" } as Record<string, string>)[value] || value;
  return (
    <div className="dashboard workspace-view">
      <ViewHeading eyebrow="NOLEGGIO / LEAD E PRATICHE" title="Lead e pratiche" description="Ogni richiesta resta collegata all’offerta e al partner competente." action={<button className="button button--secondary" type="button"><Download size={17} /> Esporta</button>} />
      <section className="view-kpis view-kpis--four">
        <article><span>NUOVI</span><strong>{newCount}</strong><small>Da verificare</small></article><article><span>IN LAVORAZIONE</span><strong>{workCount}</strong><small>ECCOMI e partner</small></article><article><span>CONTRATTI</span><strong>{contractCount}</strong><small>Conclusi</small></article><article><span>TOTALE PRATICHE</span><strong>{leads.length}</strong><small>Storico conservato</small></article>
      </section>
      <section className="pipeline-panel panel">
        <div className="panel__heading"><div><span className="section-kicker">PIPELINE</span><h2>Stato delle richieste</h2><p>Il partner aggiorna solo le pratiche di propria competenza.</p></div></div>
        <div className="pipeline-track">{stages.map((stage, index) => <div className="pipeline-stage" key={stage.label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage.label}</strong><em>{leads.filter((lead) => stage.statuses.includes(lead.status)).length}</em></div>)}</div>
        {leads.length ? <div className="lead-register"><div className="lead-register__heading"><span>CODICE PRATICA</span><span>CLIENTE</span><span>OFFERTA</span><span>ASSEGNAZIONE</span><span>STATO</span></div>{leads.map((lead) => <article className="lead-register__row" key={lead.id}><div><strong>{lead.id}</strong><small>{new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Rome" }).format(new Date(lead.createdAt))}</small></div><div><strong>{lead.customerName}</strong><small>{profile(lead.customerType)} · {lead.province}</small><small>{lead.email} · {lead.phone}</small></div><div><strong>{lead.vehicle}</strong><small>Offerta {lead.offerNumber}</small></div><div><strong>{lead.partnerName}</strong><small>Assegnata automaticamente</small></div><div><span className={`lead-status lead-status--${lead.status.toLowerCase()}`}>{leadStatus(lead.status)}</span><small>{lead.documentStatus === "PENDING_EMAIL_VERIFICATION" ? "Email da verificare" : "Documenti protetti"}</small></div></article>)}</div> : <div className="empty-state"><span className="empty-state__icon"><UsersRound size={30} /></span><h2>Nessun lead ricevuto</h2><p>Le richieste compariranno qui quando il modulo ECCOMI NOLEGGIO sarà collegato alle pagine Shopify.</p><span className="empty-state__rule"><ShieldCheck size={15} /> Il lead segue sempre il proprietario dell’offerta</span></div>}
      </section>
    </div>
  );
}

function PartnersView({ leads }: { leads: LeadSummary[] }) {
  const directLeads = leads.filter((lead) => lead.partnerId === "eccomi-direct").length;
  const goalRentLeads = leads.filter((lead) => lead.partnerId === "goal-rent").length;
  return (
    <div className="dashboard workspace-view">
      <ViewHeading eyebrow="NOLEGGIO / PARTNER" title="Partner operativi" description="Accessi isolati: ciascun partner vede esclusivamente offerte e pratiche proprie." action={<button className="button button--primary" type="button"><Plus size={18} /> Nuovo partner</button>} />
      <section className="partner-grid">
        <article className="partner-card partner-card--direct"><div className="partner-card__top"><span className="partner-logo">E</span><span className="status-dot"><i /> DIRETTO</span></div><h2>ECCOMI</h2><p>Gestione diretta delle offerte caricate dal CEO o ricevute dai noleggiatori.</p><div className="partner-card__stats"><span><strong>1</strong><small>Offerta</small></span><span><strong>{directLeads}</strong><small>Lead</small></span><span><strong>{leads.filter((lead) => lead.partnerId === "eccomi-direct" && ["CONTRACT", "DELIVERED"].includes(lead.status)).length}</strong><small>Contratti</small></span></div><div className="partner-card__permissions"><ShieldCheck size={16} /> Accesso completo riservato al CEO</div></article>
        <article className="partner-card"><div className="partner-card__top"><span className="partner-logo partner-logo--violet">GR</span><span className="status-dot"><i /> ATTIVO</span></div><h2>Goal Rent SRL</h2><p>Partner operativo associato alle offerte e pratiche di propria competenza.</p><div className="partner-card__stats"><span><strong>1</strong><small>Offerta</small></span><span><strong>{goalRentLeads}</strong><small>Lead</small></span><span><strong>{leads.filter((lead) => lead.partnerId === "goal-rent" && ["CONTRACT", "DELIVERED"].includes(lead.status)).length}</strong><small>Contratti</small></span></div><div className="partner-card__permissions"><LockKeyhole size={16} /> Visibilità limitata ai propri dati</div></article>
        <button className="partner-card partner-card--new" type="button"><span><Plus size={24} /></span><strong>Aggiungi partner</strong><small>Il nuovo accesso sarà autorizzato dal CEO</small></button>
      </section>
      <section className="panel permission-panel">
        <div className="panel__heading"><div><span className="section-kicker">MATRICE PERMESSI</span><h2>Chi può fare cosa</h2></div><ShieldCheck size={20} /></div>
        <div className="permission-grid"><div className="permission-grid__header"><span>Attività</span><span>CEO</span><span>Partner</span></div>{[["Vedere tutte le promozioni", true, false],["Caricare una propria quotazione", true, true],["Approvare e pubblicare su Shopify", true, false],["Gestire lead e documenti assegnati", true, true],["Vedere margini e accordi ECCOMI", true, false],["Sospendere o archiviare offerte", true, false]].map(([label, ceo, partner]) => <div className="permission-grid__row" key={String(label)}><span>{label}</span><span className="permission-yes">{ceo ? <Check size={16} /> : "—"}</span><span className={partner ? "permission-yes" : "permission-no"}>{partner ? <Check size={16} /> : <X size={15} />}</span></div>)}</div>
      </section>
    </div>
  );
}

function CommissionsView() {
  return (
    <div className="dashboard workspace-view">
      <ViewHeading eyebrow="NOLEGGIO / COMMISSIONI" title="Contratti e commissioni" description="Controllo economico riservato al CEO: maturato, fatturato e pagato." action={<button className="button button--secondary" type="button"><Download size={17} /> Esporta report</button>} />
      <section className="view-kpis view-kpis--four commission-kpis"><article><span>MATURATE</span><strong>0,00 €</strong><small>Contratti confermati</small></article><article><span>DA FATTURARE</span><strong>0,00 €</strong><small>Nessuna scadenza</small></article><article><span>FATTURATE</span><strong>0,00 €</strong><small>Nel mese corrente</small></article><article><span>PAGATE</span><strong>0,00 €</strong><small>Incassate da ECCOMI</small></article></section>
      <section className="panel commission-panel"><div className="data-toolbar"><div><span className="section-kicker">REGISTRO ECONOMICO</span><h2>Commissioni</h2></div><button className="button button--secondary button--small" type="button"><CalendarDays size={15} /> Luglio 2026</button></div><div className="commission-empty empty-state"><span className="empty-state__icon empty-state__icon--green"><BadgeEuro size={30} /></span><h2>Nessuna commissione registrata</h2><p>Quando un partner confermerà un contratto, la commissione entrerà qui e resterà soggetta al controllo del CEO.</p></div></section>
    </div>
  );
}

function UploadQuoteModal({ open, onClose, onDraftReady }: {
  open: boolean;
  onClose: () => void;
  onDraftReady: (draft: QuoteDraft | null, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reset = () => {
    setFileName("");
    setError("");
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };
  const close = () => { reset(); onClose(); };
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Carica un file PDF valido.");
      return;
    }
    setFileName(file.name);
    setError("");
    setLoading(true);
    try {
      let fallback: QuoteDraft | null = null;
      try {
        fallback = await extractQuoteFromPdf(file);
      } catch {
        fallback = null;
      }
      await onDraftReady(fallback, file);
      reset();
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "Preparazione automatica non riuscita.");
      setLoading(false);
    }
  };
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation"><section className="modal upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <header className="modal__header"><div><span className="section-kicker">NUOVA PROMOZIONE</span><h2 id="upload-title">Carica quotazione PDF</h2></div><button className="icon-button" type="button" aria-label="Chiudi caricamento" onClick={close}><X size={21} /></button></header>
      <div className="modal-steps"><span className="modal-step modal-step--active"><i>1</i> Quotazione</span><em /><span className={loading ? "modal-step modal-step--active" : "modal-step"}><i>2</i> AI + foto</span><em /><span className={loading ? "modal-step modal-step--active" : "modal-step"}><i>3</i> Bozza Shopify</span><em /><span className="modal-step"><i>4</i> Verifica CEO</span></div>
      <div className="modal__body">
        {!loading ? <div className="upload-zone"><input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={readFile} /><span className="upload-zone__icon"><UploadCloud size={30} /></span><h3>Seleziona la quotazione</h3><p>L’AI estrae i dati, trova la foto e crea automaticamente il prodotto Shopify in bozza.</p><button className="button button--primary" type="button" onClick={() => inputRef.current?.click()}>Scegli PDF</button><small>Al termine dovrai soltanto controllare l’anteprima e pubblicare</small></div> : null}
        {loading ? <div className="analysis-state"><span><Loader2 size={31} /></span><h3>Sto preparando l’offerta completa</h3><p>{fileName}</p><div className="analysis-bar"><i /></div><small>Estrazione AI → foto veicolo → prodotto Shopify in bozza → registrazione HUB</small></div> : null}
        {error ? <div className="modal-error"><AlertTriangle size={18} /> {error}</div> : null}
      </div>
      <footer className="modal__footer"><button className="button button--secondary" type="button" onClick={close} disabled={loading}>{loading ? "Automazione in corso…" : "Chiudi"}</button></footer>
    </section></div>
  );
}

function PromotionModal({ promotion, shopify, busy, onClose, onPrepare, onPublish, onCustomerPreview }: {
  promotion: Promotion | null;
  shopify: ShopifyConnectionState;
  busy: boolean;
  onClose: () => void;
  onPrepare: (promotion: Promotion) => Promise<void>;
  onPublish: (promotion: Promotion) => Promise<void>;
  onCustomerPreview: (promotion: Promotion) => void;
}) {
  if (!promotion) return null;
  const approved = promotion.status === "APPROVED" || promotion.status === "ONLINE" || promotion.status === "ACTIVE" || promotion.status === "EXPIRING";
  const active = promotion.status === "ONLINE" || promotion.status === "ACTIVE" || promotion.status === "EXPIRING";
  const awaitingPublication = promotion.status === "PENDING_APPROVAL" || promotion.status === "APPROVED";
  const numericProductId = promotion.shopifyProductId?.split("/").pop();
  const shopifyAdminUrl = shopify.shopDomain && numericProductId
    ? `https://${shopify.shopDomain}/admin/products/${numericProductId}`
    : null;
  return (
    <div className="modal-backdrop" role="presentation"><section className="modal promotion-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
      <header className="modal__header promotion-modal__header"><button className="back-button" type="button" onClick={onClose}><ArrowLeft size={18} /> Torna alle promozioni</button><span className={`status-badge ${approved ? "status-badge--approved" : ""}`}>{promotion.statusLabel}</span><button className="icon-button" type="button" aria-label="Chiudi promozione" onClick={onClose}><X size={21} /></button></header>
      <div className="promotion-modal__body"><div className="promotion-preview"><div className="promotion-preview__image"><PromotionThumb promotion={promotion} /></div><span className="section-kicker">ANTEPRIMA SHOPIFY</span><h2 id="promotion-title">{promotion.brand} {promotion.model}</h2><div className="promotion-preview__price"><strong>{promotion.price}</strong><span>al mese IVA inclusa</span></div><div className="hero-terms"><span><small>ANTICIPO</small><strong>{promotion.deposit}</strong></span><span><small>DURATA</small><strong>{promotion.term}</strong></span><span><small>CHILOMETRI</small><strong>{promotion.mileage}</strong></span></div><button className="shopify-cta" type="button" onClick={() => onCustomerPreview(promotion)}>AVVIA LA RICHIESTA DI NOLEGGIO</button><span className="shopify-help"><MessageCircle size={13} /> HAI BISOGNO DI AIUTO? SCRIVICI SU WHATSAPP</span><small className="illustrative-note">Immagine illustrativa · Offerta soggetta a disponibilità e approvazione</small></div>
        <div className="promotion-check"><div className="promotion-check__title"><div><span className="section-kicker">CONTROLLO CEO</span><h2>Dati della promozione</h2></div><span className="offer-code">Offerta {promotion.offerNumber}</span></div><section className="check-section"><h3>Proprietà e assegnazione</h3><div className="assignment-card"><span className="access-list__avatar access-list__avatar--ceo">{promotion.owner === "ECCOMI diretto" ? "CEO" : "P"}</span><div><strong>{promotion.owner}</strong><small>{promotion.source} · Lead assegnati automaticamente</small></div><ShieldCheck size={18} /></div></section><section className="check-section"><h3>Dati principali</h3><div className="check-grid"><label><span>Noleggiatore</span><strong>{promotion.rental}</strong></label><label><span>Scadenza</span><strong>{promotion.expires}</strong></label><label><span>Consegna</span><strong>{promotion.delivery}</strong></label><label><span>Colore</span><strong>{promotion.color}</strong></label></div></section><section className="check-section check-section--small"><h3>Versione e condizioni <small>— mostrate in piccolo su Shopify</small></h3><p>{promotion.version} · {promotion.fuel} · Cambio {promotion.transmission}</p><div className="service-pills">{promotion.services.map((service) => <span key={service}><Check size={12} /> {service}</span>)}</div><div className="condition-list">{promotion.warnings.map((warning) => <span key={warning}><AlertTriangle size={13} /> {warning}</span>)}</div>{promotion.quoteStored ? <a className="document-link" href={`/api/promotions/${promotion.id}/quote`} target="_blank" rel="noreferrer"><FileText size={15} /> Apri quotazione originale</a> : <span className="document-link document-link--muted"><FileText size={15} /> Quotazione storica non ancora archiviata</span>}</section></div>
      </div>
      <footer className="modal__footer promotion-modal__footer">
        <div className="ceo-only"><LockKeyhole size={16} /><span><strong>Azione riservata al CEO</strong><small>{promotion.automationStatus === "FAILED" ? promotion.automationError || "Preparazione automatica da riprovare" : promotion.shopifyPrepared ? "Bozza Shopify pronta e invisibile al pubblico" : "Preparazione automatica in attesa"}</small></span></div>
        <button className="button button--secondary" type="button" disabled={busy} onClick={() => onCustomerPreview(promotion)}><Eye size={17} /> Anteprima cliente</button>
        {shopifyAdminUrl && awaitingPublication ? <a className="button button--secondary" href={shopifyAdminUrl} target="_blank" rel="noreferrer"><Eye size={17} /> Apri bozza Shopify</a> : null}
        {awaitingPublication && !promotion.shopifyPrepared ? <button className="button button--primary" type="button" disabled={busy || !shopify.connected} onClick={() => onPrepare(promotion)}><FileCheck2 size={17} /> {busy ? "Preparazione…" : shopify.connected ? "Riprova preparazione automatica" : "Collega prima Shopify"}</button> : null}
        {awaitingPublication && promotion.shopifyPrepared ? <button className="button button--primary" type="button" disabled={busy || !shopify.publishingReady} onClick={() => onPublish(promotion)}><ShieldCheck size={17} /> {busy ? "Pubblicazione completa…" : shopify.publishingReady ? "🚀 Pubblica online" : "Pubblicazione ancora protetta"}</button> : null}
        {active && promotion.shopifyUrl ? <a className="button button--primary" href={promotion.shopifyUrl} target="_blank" rel="noreferrer"><Eye size={17} /> Apri offerta online</a> : null}
      </footer>
    </section></div>
  );
}

type CustomerProfile = "" | "PRIVATE" | "PROFESSIONAL" | "COMPANY";

function CustomerOfferPreview({ promotion, onClose, onStartRequest }: {
  promotion: Promotion | null;
  onClose: () => void;
  onStartRequest: (promotion: Promotion) => void;
}) {
  if (!promotion) return null;
  return (
    <div className="customer-preview-backdrop" role="presentation">
      <section className="customer-preview" role="dialog" aria-modal="true" aria-labelledby="customer-preview-title">
        <header className="customer-preview__toolbar">
          <div><span className="preview-live-dot" /> Anteprima pagina cliente</div>
          <span>eccomionline.com · ECCOMI NOLEGGIO</span>
          <button className="icon-button" type="button" aria-label="Chiudi anteprima cliente" onClick={onClose}><X size={21} /></button>
        </header>
        <div className="customer-preview__page">
          <div className="storefront-brand"><BrandMark /><span>Un’offerta verificata e governata da ECCOMI</span></div>
          <div className="storefront-offer">
            <div className="storefront-gallery">
              <div className="storefront-gallery__main"><PromotionThumb promotion={promotion} /></div>
              <span><ShieldCheck size={17} /> Quotazione verificata</span>
              <small>Immagine illustrativa. Allestimento e colore fanno fede alla quotazione.</small>
            </div>
            <div className="storefront-summary">
              <span className="storefront-eyebrow">NOLEGGIO A LUNGO TERMINE</span>
              <h1 id="customer-preview-title">{promotion.brand} {promotion.model}</h1>
              <p className="storefront-version">{promotion.version}</p>
              <div className="storefront-price"><strong>{promotion.price}</strong><span>/mese</span><small>IVA inclusa</small></div>
              <div className="storefront-terms">
                <div><span>Anticipo</span><strong>{promotion.deposit}</strong></div>
                <div><span>Durata</span><strong>{promotion.term}</strong></div>
                <div><span>Chilometri</span><strong>{promotion.mileage}</strong></div>
              </div>
              <div className="storefront-expiry"><Clock3 size={18} /><span>Offerta valida fino al <strong>{promotion.expires}</strong>, salvo disponibilità.</span></div>
              <button className="storefront-primary" type="button" onClick={() => onStartRequest(promotion)}>AVVIA LA RICHIESTA DI NOLEGGIO <ArrowRight size={19} /></button>
              <div className="storefront-help"><MessageCircle size={20} /><span><strong>HAI BISOGNO DI AIUTO?</strong><small>Scrivici su WhatsApp dal pulsante già presente sul sito.</small></span></div>
              <p className="storefront-disclaimer">La richiesta non costituisce acquisto né approvazione del noleggio. La decisione finale resta al noleggiatore.</p>
            </div>
          </div>
          <section className="storefront-details">
            <div><span className="storefront-eyebrow">COSA È INCLUSO</span><h2>Un canone chiaro, con i servizi essenziali.</h2></div>
            <div className="storefront-services">{promotion.services.map((service) => <span key={service}><Check size={15} /> {service}</span>)}</div>
            <div className="storefront-specs"><span><small>Alimentazione</small><strong>{promotion.fuel}</strong></span><span><small>Cambio</small><strong>{promotion.transmission}</strong></span><span><small>Consegna prevista</small><strong>{promotion.delivery}</strong></span><span><small>Noleggiatore</small><strong>{promotion.rental}</strong></span></div>
            <div className="storefront-warnings">{promotion.warnings.map((warning) => <span key={warning}><AlertTriangle size={14} /> {warning}</span>)}</div>
          </section>
        </div>
      </section>
    </div>
  );
}

function ApplicationWizard({ promotion, onClose, onComplete }: {
  promotion: Promotion | null;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<CustomerProfile>("");
  const [privacy, setPrivacy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [fields, setFields] = useState({ firstName: "", lastName: "", email: "", phone: "", province: "", businessName: "", vatNumber: "" });
  if (!promotion) return null;
  const profileLabel = profile === "PRIVATE" ? "Privato" : profile === "PROFESSIONAL" ? "Professionista / ditta individuale" : "Azienda";
  const contactComplete = Boolean(fields.firstName && fields.lastName && fields.email && fields.phone && fields.province && (profile === "PRIVATE" || (fields.businessName && fields.vatNumber)));
  const documents = profile === "PRIVATE"
    ? ["Documento di identità", "Tessera sanitaria / codice fiscale", "Documentazione reddituale richiesta dal noleggiatore"]
    : profile === "PROFESSIONAL"
      ? ["Documento di identità", "Attribuzione Partita IVA", "Ultima dichiarazione dei redditi"]
      : ["Documento del legale rappresentante", "Visura camerale aggiornata", "Documentazione economica richiesta dal noleggiatore"];
  const canContinue = step === 1 ? Boolean(profile) : step === 2 ? contactComplete : step === 3 ? true : privacy;
  const updateField = (name: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [name]: value }));

  return (
    <div className="application-backdrop" role="presentation">
      <section className="application-wizard" role="dialog" aria-modal="true" aria-labelledby="application-title">
        <header className="application-wizard__header">
          <div><span className="section-kicker">RICHIESTA GUIDATA</span><h2 id="application-title">{promotion.brand} {promotion.model}</h2><p>{promotion.price}/mese · {promotion.term} · {promotion.mileage}</p></div>
          <button className="icon-button" type="button" aria-label="Chiudi richiesta" onClick={onClose}><X size={21} /></button>
        </header>
        {!completed ? <>
          <div className="application-progress" aria-label={`Passaggio ${step} di 4`}><div>{[1, 2, 3, 4].map((item) => <span className={item <= step ? "application-progress__active" : ""} key={item}><i>{item < step ? <Check size={12} /> : item}</i><small>{["Profilo", "Dati", "Documenti", "Conferma"][item - 1]}</small></span>)}</div><em style={{ width: `${(step - 1) * 33.333}%` }} /></div>
          <div className="application-wizard__body">
            {step === 1 ? <div className="wizard-step"><span className="storefront-eyebrow">PASSAGGIO 1 DI 4</span><h3>Per chi stai richiedendo il noleggio?</h3><p>Le domande e i documenti cambieranno automaticamente in base al profilo.</p><div className="profile-options"><button className={profile === "PRIVATE" ? "profile-option profile-option--active" : "profile-option"} type="button" onClick={() => setProfile("PRIVATE")}><UserRound size={24} /><span><strong>Privato</strong><small>Persona fisica</small></span><Check size={18} /></button><button className={profile === "PROFESSIONAL" ? "profile-option profile-option--active" : "profile-option"} type="button" onClick={() => setProfile("PROFESSIONAL")}><BriefcaseBusiness size={24} /><span><strong>Professionista</strong><small>Partita IVA o ditta individuale</small></span><Check size={18} /></button><button className={profile === "COMPANY" ? "profile-option profile-option--active" : "profile-option"} type="button" onClick={() => setProfile("COMPANY")}><Building2 size={24} /><span><strong>Azienda</strong><small>Società o ente</small></span><Check size={18} /></button></div></div> : null}
            {step === 2 ? <div className="wizard-step"><span className="storefront-eyebrow">PASSAGGIO 2 DI 4 · {profileLabel.toUpperCase()}</span><h3>Inserisci i dati della richiesta.</h3><p>L’auto e l’offerta sono già collegate automaticamente.</p><div className="wizard-fields"><label><span>Nome</span><input value={fields.firstName} onChange={(event) => updateField("firstName", event.target.value)} autoComplete="given-name" /></label><label><span>Cognome</span><input value={fields.lastName} onChange={(event) => updateField("lastName", event.target.value)} autoComplete="family-name" /></label><label><span>Email</span><input type="email" value={fields.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" /></label><label><span>Cellulare</span><input type="tel" value={fields.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" /></label><label><span>Provincia</span><input value={fields.province} onChange={(event) => updateField("province", event.target.value)} placeholder="Es. Roma" /></label>{profile !== "PRIVATE" ? <><label><span>{profile === "COMPANY" ? "Ragione sociale" : "Denominazione attività"}</span><input value={fields.businessName} onChange={(event) => updateField("businessName", event.target.value)} /></label><label><span>Partita IVA</span><input value={fields.vatNumber} onChange={(event) => updateField("vatNumber", event.target.value)} inputMode="numeric" /></label></> : null}</div></div> : null}
            {step === 3 ? <div className="wizard-step"><span className="storefront-eyebrow">PASSAGGIO 3 DI 4 · DOCUMENTI</span><h3>Il sistema prepara solo ciò che serve.</h3><p>Dopo la verifica dell’email, il cliente caricherà i file nell’area privata della pratica.</p><div className="document-plan">{documents.map((document) => <div key={document}><span><FileCheck2 size={18} /></span><div><strong>{document}</strong><small>Caricamento protetto · PDF, JPG o PNG</small></div><em>RICHIESTO</em></div>)}</div><div className="wizard-safety"><ShieldCheck size={19} /><span><strong>Nessun documento sensibile dentro Shopify o via email.</strong><small>I requisiti definitivi vengono adattati al noleggiatore e al profilo cliente.</small></span></div></div> : null}
            {step === 4 ? <div className="wizard-step"><span className="storefront-eyebrow">PASSAGGIO 4 DI 4 · RIEPILOGO</span><h3>Controlla e invia la richiesta.</h3><div className="application-summary"><div><span>Offerta</span><strong>{promotion.brand} {promotion.model}</strong><small>{promotion.price}/mese · anticipo {promotion.deposit}</small></div><div><span>Richiedente</span><strong>{fields.firstName || "Nome"} {fields.lastName || "Cognome"}</strong><small>{profileLabel} · {fields.email || "email"}</small></div><div><span>Gestione</span><strong>ECCOMI NOLEGGIO</strong><small>Codice pratica generato automaticamente</small></div></div><label className="privacy-consent"><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span>Ho letto l’informativa privacy e autorizzo il trattamento dei dati per la gestione della richiesta di noleggio.</span></label><div className="wizard-safety"><ShieldCheck size={19} /><span><strong>ECCOMI governa la pratica.</strong><small>Il partner assegnato vede soltanto i dati necessari alla propria lavorazione.</small></span></div></div> : null}
          </div>
          <footer className="application-wizard__footer"><button className="button button--secondary" type="button" onClick={() => step === 1 ? onClose() : setStep((current) => current - 1)}>{step === 1 ? "Annulla" : "Indietro"}</button><span>Anteprima funzionale · nessun dato viene salvato</span><button className="button button--primary" type="button" disabled={!canContinue} onClick={() => { if (step < 4) setStep((current) => current + 1); else setCompleted(true); }}>{step < 4 ? <>Continua <ArrowRight size={17} /></> : <>Invia richiesta <Check size={17} /></>}</button></footer>
        </> : <div className="application-complete"><span><Check size={34} /></span><span className="storefront-eyebrow">RICHIESTA COMPLETATA</span><h3>Il percorso automatico è pronto.</h3><p>Nella versione pubblica il cliente riceverà il codice pratica e il link protetto per completare i documenti.</p><div><strong>Auto e offerta</strong><span>{promotion.brand} {promotion.model} · {promotion.offerNumber}</span><strong>Assegnazione</strong><span>{promotion.owner}</span></div><button className="button button--primary" type="button" onClick={() => { onComplete(); onClose(); }}><Check size={17} /> Torna alla promozione</button></div>}
      </section>
    </div>
  );
}

function ShopifyConnectionModal({
  connection,
  suggestedShopDomain,
  onClose,
  onConnected,
}: {
  connection: ShopifyConnectionState;
  suggestedShopDomain: string;
  onClose: () => void;
  onConnected: (connection: ShopifyConnectionState) => void;
}) {
  const [shopDomain, setShopDomain] = useState(connection.shopDomain || suggestedShopDomain);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/shopify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shopDomain, clientId, clientSecret }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Collegamento Shopify non riuscito.");
      setClientSecret("");
      onConnected(payload.shopify as ShopifyConnectionState);
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Collegamento Shopify non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal shopify-modal" role="dialog" aria-modal="true" aria-labelledby="shopify-modal-title">
        <header className="modal__header">
          <div>
            <span className="section-kicker">SOLO CEO</span>
            <h2 id="shopify-modal-title">Collega Shopify in sicurezza</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Chiudi collegamento Shopify" onClick={onClose}><X size={20} /></button>
        </header>
        <form onSubmit={connect}>
          <div className="modal__body shopify-modal__body">
            {connection.connected ? (
              <div className="shopify-connected-summary">
                <span><Check size={19} /></span>
                <div><strong>{connection.shopName || "Shopify collegato"}</strong><small>{connection.shopDomain} · {connection.publicationLabel || "Negozio online"}</small></div>
                <em>COLLEGATO</em>
              </div>
            ) : null}
            <div className="shopify-instructions">
              <span><KeyRound size={20} /></span>
              <div>
                <strong>Dove trovi i due valori</strong>
                <p>Nella Dev Dashboard apri <b>ECCOMI NOLEGGIO → Impostazioni</b>, poi copia Client ID e Client secret direttamente qui.</p>
              </div>
            </div>
            <div className="shopify-form-grid">
              <label className="shopify-field shopify-field--wide">
                <span>Dominio del negozio</span>
                <input value={shopDomain} onChange={(event) => setShopDomain(event.target.value)} placeholder="nome-negozio.myshopify.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
                <small>Usa sempre il dominio che termina con .myshopify.com</small>
              </label>
              <label className="shopify-field">
                <span>Client ID</span>
                <input value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder={connection.clientIdHint || "Incolla il Client ID"} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} required />
              </label>
              <label className="shopify-field">
                <span>Client secret</span>
                <input type="password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder="Incolla il Client secret" autoCapitalize="none" autoComplete="new-password" autoCorrect="off" spellCheck={false} required />
              </label>
            </div>
            <div className="secret-protection"><LockKeyhole size={16} /><span>Il Client secret viene cifrato prima del salvataggio, non viene mostrato di nuovo e non deve essere inviato in chat.</span></div>
            {error ? <div className="modal-error"><AlertTriangle size={16} /><span>{error}</span></div> : null}
          </div>
          <footer className="modal__footer">
            <button className="button button--secondary" type="button" disabled={busy} onClick={onClose}>Annulla</button>
            <button className="button button--primary" type="submit" disabled={busy || !shopDomain || !clientId || !clientSecret}>
              {busy ? <Loader2 className="spin" size={17} /> : <Link2 size={17} />}
              {busy ? "Verifica in corso…" : connection.connected ? "Verifica e aggiorna" : "Verifica e collega"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function AiConnectionModal({
  connection,
  onClose,
  onConnected,
}: {
  connection: AiConnectionState;
  onClose: () => void;
  onConnected: (connection: AiConnectionState) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey, textModel: "gpt-5.6-terra" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Collegamento AI non riuscito.");
      setApiKey("");
      onConnected(payload.ai as AiConnectionState);
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Collegamento AI non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal shopify-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
        <header className="modal__header">
          <div>
            <span className="section-kicker">SOLO CEO</span>
            <h2 id="ai-modal-title">Collega il motore AI</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Chiudi collegamento AI" onClick={onClose}><X size={20} /></button>
        </header>
        <form onSubmit={connect}>
          <div className="modal__body shopify-modal__body">
            {connection.connected ? (
              <div className="shopify-connected-summary">
                <span><Check size={19} /></span>
                <div><strong>OpenAI collegata</strong><small>{connection.textModel} · {connection.imageModel}</small></div>
                <em>COLLEGATA</em>
              </div>
            ) : null}
            <div className="shopify-instructions">
              <span><Sparkles size={20} /></span>
              <div>
                <strong>Una sola configurazione iniziale</strong>
                <p>La chiave API consente di leggere il PDF e, quando non è disponibile una fotografia adatta, generare l’immagine illustrativa del veicolo.</p>
              </div>
            </div>
            <div className="shopify-form-grid">
              <label className="shopify-field shopify-field--wide">
                <span>Chiave API OpenAI</span>
                <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-…" autoCapitalize="none" autoComplete="new-password" autoCorrect="off" spellCheck={false} required />
                <small>Il modello operativo viene impostato automaticamente e può essere aggiornato in seguito.</small>
              </label>
            </div>
            <div className="secret-protection"><LockKeyhole size={16} /><span>La chiave viene verificata e cifrata prima del salvataggio. Non viene mostrata di nuovo e non deve essere inviata in chat.</span></div>
            {error ? <div className="modal-error"><AlertTriangle size={16} /><span>{error}</span></div> : null}
          </div>
          <footer className="modal__footer">
            <button className="button button--secondary" type="button" disabled={busy} onClick={onClose}>Annulla</button>
            <button className="button button--primary" type="submit" disabled={busy || !apiKey}>
              {busy ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
              {busy ? "Verifica in corso…" : connection.connected ? "Verifica e aggiorna" : "Verifica e collega"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [customerPreview, setCustomerPreview] = useState<Promotion | null>(null);
  const [applicationPreview, setApplicationPreview] = useState<Promotion | null>(null);
  const [promotionItems, setPromotionItems] = useState<Promotion[]>(initialPromotions);
  const [leadItems, setLeadItems] = useState<LeadSummary[]>([]);
  const [hubEvents, setHubEvents] = useState<HubEvent[]>([]);
  const [shopify, setShopify] = useState<ShopifyConnectionState>(disconnectedShopify);
  const [shopifyOpen, setShopifyOpen] = useState(false);
  const [ai, setAi] = useState<AiConnectionState>(disconnectedAi);
  const [aiOpen, setAiOpen] = useState(false);
  const [suggestedShopDomain] = useState(() => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("shop") || "";
    return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value) ? value.toLowerCase() : "";
  });
  const [busyPromotionId, setBusyPromotionId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [authChecking, setAuthChecking] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const changeView = (view: ViewName) => { setActiveView(view); setMobileMenuOpen(false); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 4200); };

  const handleCeoLogout = async () => {
    try {
      await fetch("/api/auth/ceo-logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.href = "/ceo";
    }
  };
  const openUploadWorkflow = () => {
    if (!ai.connected) {
      setAiOpen(true);
      notify("Collega una volta il motore AI prima di caricare la quotazione.");
      return;
    }
    if (!shopify.connected) {
      setShopifyOpen(true);
      notify("Collega una volta Shopify: ogni caricamento deve creare subito la bozza.");
      return;
    }
    setUploadOpen(true);
  };
  const pendingCount = promotionItems.filter((promotion) => promotion.status === "PENDING_APPROVAL").length;
  const activeCount = promotionItems.filter((promotion) => promotion.status === "ONLINE" || promotion.status === "ACTIVE" || promotion.status === "EXPIRING").length;
  const newLeadCount = leadItems.filter((lead) => lead.status === "NEW").length;

  useEffect(() => {
    let mounted = true;

    fetch("/api/dashboard", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = await response.json();

        if (response.status === 401) {
          if (mounted) {
            setAuthRequired(true);
            setAuthChecking(false);
          }
          return null;
        }

        if (!response.ok) {
          throw new Error(payload.error || "Dati non disponibili.");
        }

        return payload as {
          promotions: Promotion[];
          leads?: LeadSummary[];
          hubEvents?: HubEvent[];
          integrations: {
            shopify: ShopifyConnectionState;
            ai: AiConnectionState;
          };
        };
      })
      .then((payload) => {
        if (!mounted || !payload) return;

        setPromotionItems(payload.promotions);
        setLeadItems(payload.leads || []);
        setHubEvents(payload.hubEvents || []);
        setShopify(payload.integrations.shopify);
        setAi(payload.integrations.ai);
        setAuthRequired(false);
        setAuthChecking(false);
      })
      .catch(() => {
        if (mounted) {
          setAuthChecking(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleCeoLogin = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/ceo-login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || "Accesso non riuscito.",
        );
      }

      window.location.reload();
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Accesso non riuscito.",
      );
    } finally {
      setLoginBusy(false);
    }
  };

  const updatePromotion = (id: string, changes: Partial<Promotion>) => {
    setPromotionItems((current) => current.map((promotion) => promotion.id === id ? { ...promotion, ...changes } : promotion));
    setSelectedPromotion((current) => current?.id === id ? { ...current, ...changes } : current);
  };

  const handleShopifyConnected = (connection: ShopifyConnectionState) => {
    setShopify(connection);
    setShopifyOpen(false);
    notify(`Shopify collegato correttamente a ${connection.shopDomain}. Nessuna offerta è stata pubblicata.`);
  };

  const handleAiConnected = (connection: AiConnectionState) => {
    setAi(connection);
    setAiOpen(false);
    notify("Motore AI collegato: estrazione PDF e immagini automatiche sono operative.");
  };

  const handleDraftReady = async (draft: QuoteDraft | null, file: File) => {
    const body = new FormData();
    if (draft) body.append("fallbackDraft", JSON.stringify(draft));
    body.append("quote", file);
    const response = await fetch("/api/promotions", { method: "POST", body });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Salvataggio non riuscito.");
    setPromotionItems((current) => [payload.promotion as Promotion, ...current.filter((item) => item.id !== payload.promotion.id)]);
    setHubEvents((current) => [{
      id: crypto.randomUUID(),
      eventType: "NOLEGGIO_PROMOTION_READY_FOR_CEO",
      title: `${payload.promotion.brand} ${payload.promotion.model}: bozza Shopify pronta per il CEO`,
      actorEmail: "system@eccomi.local",
      createdAt: new Date().toISOString(),
    }, ...current].slice(0, 20));
    setUploadOpen(false);
    setActiveView("Promozioni");
    notify(`${payload.promotion.brand} ${payload.promotion.model}: AI, foto e bozza Shopify completate. Ora verifica e pubblica.`);
  };

  const handlePrepare = async (promotion: Promotion) => {
    setBusyPromotionId(promotion.id);
    try {
      const response = await fetch(`/api/promotions/${promotion.id}/prepare`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Creazione della bozza Shopify non riuscita.");
      updatePromotion(promotion.id, {
        shopifyPrepared: true,
        shopifyProductId: payload.productId || null,
        automationStatus: "READY_FOR_CEO",
        automationError: null,
      });
      notify(`${promotion.brand} ${promotion.model}: foto e bozza Shopify ripristinate, ancora invisibili al pubblico.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Creazione della bozza Shopify non riuscita.");
    } finally {
      setBusyPromotionId(null);
    }
  };

  const handlePublish = async (promotion: Promotion) => {
    setBusyPromotionId(promotion.id);
    try {
      const response = await fetch(`/api/promotions/${promotion.id}/publish`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Pubblicazione non riuscita.");
      updatePromotion(promotion.id, {
        status: "ONLINE",
        statusLabel: "ONLINE",
        shopifyUrl: payload.url,
        shopifyCollectionId: payload.collectionId || null,
        automationStatus: "ONLINE",
        automationError: null,
      });
      setHubEvents((current) => [{
        id: payload.hubEventId || crypto.randomUUID(),
        eventType: "NOLEGGIO_PROMOTION_PUBLISHED_ONLINE",
        title: `${promotion.brand} ${promotion.model} pubblicata online`,
        actorEmail: "CEO",
        createdAt: new Date().toISOString(),
      }, ...current].slice(0, 20));
      notify(`${promotion.brand} ${promotion.model}: ONLINE su Shopify, nella collezione ECCOMI NOLEGGIO e registrata nell’HUB.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Pubblicazione non riuscita.");
    } finally {
      setBusyPromotionId(null);
    }
  };

  if (authChecking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f7fb",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#073f73",
            fontWeight: 700,
          }}
        >
          <Loader2 className="spin" size={24} />
          Verifica accesso…
        </div>
      </main>
    );
  }

  if (authRequired) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "linear-gradient(135deg, #073f73 0%, #0c5597 100%)",
          padding: 24,
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 430,
            background: "#ffffff",
            borderRadius: 22,
            padding: 30,
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.22)",
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <BrandMark />
          </div>

          <div style={{ marginBottom: 24 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                color: "#0c5597",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              <ShieldCheck size={17} />
              ACCESSO RISERVATO
            </span>

            <h1
              style={{
                margin: "12px 0 8px",
                color: "#102033",
                fontSize: 29,
                lineHeight: 1.15,
              }}
            >
              Entra in ECCOMI NOLEGGIO
            </h1>

            <p
              style={{
                margin: 0,
                color: "#5b6778",
                lineHeight: 1.55,
              }}
            >
              Inserisci le credenziali CEO configurate sul server.
            </p>
          </div>

          <form
            onSubmit={handleCeoLogin}
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 7,
                color: "#102033",
                fontWeight: 700,
              }}
            >
              <span>Email</span>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) =>
                  setLoginEmail(event.target.value)
                }
                autoComplete="email"
                autoCapitalize="none"
                required
                style={{
                  width: "100%",
                  border: "1px solid #dce6f1",
                  borderRadius: 12,
                  padding: "13px 14px",
                  fontSize: 16,
                  color: "#102033",
                  background: "#ffffff",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
                color: "#102033",
                fontWeight: 700,
              }}
            >
              <span>Password</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) =>
                  setLoginPassword(event.target.value)
                }
                autoComplete="current-password"
                required
                style={{
                  width: "100%",
                  border: "1px solid #dce6f1",
                  borderRadius: 12,
                  padding: "13px 14px",
                  fontSize: 16,
                  color: "#102033",
                  background: "#ffffff",
                }}
              />
            </label>

            {loginError ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  borderRadius: 12,
                  padding: "12px 13px",
                  background: "#fff1f2",
                  color: "#b42318",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <AlertTriangle size={18} />
                <span>{loginError}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                loginBusy ||
                !loginEmail.trim() ||
                !loginPassword
              }
              style={{
                minHeight: 48,
                border: 0,
                borderRadius: 12,
                padding: "12px 18px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 800,
                cursor: loginBusy
                  ? "wait"
                  : "pointer",
                opacity:
                  loginBusy ||
                  !loginEmail.trim() ||
                  !loginPassword
                    ? 0.65
                    : 1,
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 9,
              }}
            >
              {loginBusy ? (
                <Loader2 className="spin" size={19} />
              ) : (
                <LockKeyhole size={19} />
              )}
              {loginBusy
                ? "Accesso in corso…"
                : "Accedi come CEO"}
            </button>
          </form>

          <p
            style={{
              margin: "22px 0 0",
              color: "#7a8797",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Sessione protetta tramite cookie HttpOnly.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__top">
          <BrandMark />
          <button
            className="icon-button sidebar__close"
            type="button"
            aria-label="Chiudi menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="hub-link">
          <span className="hub-link__icon">E</span>
          <span>
            <small>Ecosistema</small>
            <strong>ECCOMI HUB</strong>
          </span>
          <ChevronRight size={17} />
        </div>

        <nav className="side-nav" aria-label="Navigazione principale">
          <p className="side-nav__label">AREA OPERATIVA</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={`side-nav__item ${activeView === item.label ? "side-nav__item--active" : ""}`}
                onClick={() => changeView(item.label)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.label === "Promozioni" ? <em>{promotionItems.length}</em> : item.label === "Lead e pratiche" && leadItems.length ? <em>{leadItems.length}</em> : item.count ? <em>{item.count}</em> : null}
              </button>
            );
          })}
        </nav>

        <nav
          className="side-nav side-nav--tools"
          aria-label="Strumenti"
        >
          <p className="side-nav__label">STRUMENTI</p>

          <button
            type="button"
            className="side-nav__item"
            onClick={() => {
              setShopifyOpen(true);
              setMobileMenuOpen(false);
            }}
          >
            <Link2 size={19} />
            <span>Shopify</span>
            <i
              className={`tool-status-dot ${
                shopify.connected
                  ? "tool-status-dot--online"
                  : "tool-status-dot--warning"
              }`}
              aria-label={
                shopify.connected
                  ? "Shopify collegato"
                  : "Shopify da configurare"
              }
            />
          </button>

          <button
            type="button"
            className="side-nav__item"
            onClick={() => {
              setAiOpen(true);
              setMobileMenuOpen(false);
            }}
          >
            <Sparkles size={19} />
            <span>AI</span>
            <i
              className={`tool-status-dot ${
                ai.connected
                  ? "tool-status-dot--online"
                  : "tool-status-dot--warning"
              }`}
              aria-label={
                ai.connected
                  ? "AI collegata"
                  : "AI da configurare"
              }
            />
          </button>

          <a
            href="/cestino"
            className="side-nav__item side-nav__item--link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={19} />
            <span>Cestino</span>
          </a>
        </nav>

        <div className="sidebar__governance">
          <ShieldCheck size={20} />
          <div>
            <strong>Governance protetta</strong>
            <span>Pubblica soltanto il CEO</span>
          </div>
        </div>

        <button
          className="user-card user-card--button"
          type="button"
          onClick={() => {
            setProfileMenuOpen(true);
            setMobileMenuOpen(false);
          }}
          aria-label="Apri profilo e impostazioni"
        >
          <span className="user-card__avatar">SD</span>
          <span className="user-card__copy">
            <strong>Salvatore Del Libano</strong>
            <small>CEO · Accesso completo</small>
          </span>
          <ChevronRight size={17} />
        </button>
      </aside>

      {mobileMenuOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Chiudi menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <section className="workspace">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <button
              className="icon-button menu-button"
              type="button"
              aria-label="Apri menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <BrandMark compact />
            <strong>ECCOMI NOLEGGIO</strong>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input aria-label="Cerca" placeholder="Cerca promozioni, lead o partner..." value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); if (event.target.value) setActiveView("Promozioni"); }} />
            <kbd>⌘ K</kbd>
          </div>

          <div className="topbar__actions">
<span className="live-pill"><i /> Sistema operativo</span>
            <button className="icon-button notification-button" type="button" aria-label="Notifiche" onClick={() => setNotificationsOpen((open) => !open)}>
              <Bell size={20} />
              <i />
            </button>
            <button
              className="topbar__avatar topbar__avatar--button"
              type="button"
              aria-label="Apri profilo e impostazioni"
              aria-expanded={profileMenuOpen}
              onClick={() =>
                setProfileMenuOpen((open) => !open)
              }
            >
              SD
            </button>
            {notificationsOpen ? <div className="notification-popover"><div><strong>Notifiche</strong><span>{pendingCount} da leggere</span></div><button type="button" onClick={() => { setNotificationsOpen(false); changeView("Promozioni"); }}><span className="notification-popover__icon"><Check size={15} /></span><p><strong>{pendingCount} offerte da approvare</strong><small>Pubblica soltanto il CEO</small></p></button><button type="button"><span className="notification-popover__icon notification-popover__icon--amber"><Clock3 size={15} /></span><p><strong>Controllo scadenze attivo</strong><small>Avviso automatico 24 ore prima</small></p></button></div> : null}
          </div>
        </header>

        {profileMenuOpen ? (
          <>
            <button
              className="profile-panel-scrim"
              type="button"
              aria-label="Chiudi profilo"
              onClick={() => setProfileMenuOpen(false)}
            />

            <aside
              className="profile-panel"
              aria-label="Profilo e impostazioni"
            >
              <header className="profile-panel__header">
                <div className="profile-panel__identity">
                  <span className="profile-panel__avatar">SD</span>
                  <div>
                    <strong>Salvatore Del Libano</strong>
                    <span>CEO · Accesso completo</span>
                  </div>
                </div>

                <button
                  className="icon-button"
                  type="button"
                  aria-label="Chiudi profilo"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <X size={20} />
                </button>
              </header>

              <div className="profile-panel__section">
                <span className="profile-panel__label">
                  ACCOUNT
                </span>

                <button
                  type="button"
                  className="profile-panel__item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    notify(
                      "Profilo CEO attivo: Salvatore Del Libano."
                    );
                  }}
                >
                  <UserRound size={19} />
                  <span>
                    <strong>Il mio profilo</strong>
                    <small>Dati e ruolo del tuo account</small>
                  </span>
                  <ChevronRight size={17} />
                </button>

                <button
                  type="button"
                  className="profile-panel__item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    notify(
                      "Sessione CEO protetta tramite cookie HttpOnly."
                    );
                  }}
                >
                  <ShieldCheck size={19} />
                  <span>
                    <strong>Sicurezza</strong>
                    <small>Governance e accesso protetto</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="profile-panel__section">
                <span className="profile-panel__label">
                  ECOSISTEMA
                </span>

                <a
                  className="profile-panel__item"
                  href="https://hub.eccomionline.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Building2 size={19} />
                  <span>
                    <strong>Vai a ECCOMI HUB</strong>
                    <small>Torna alla cabina di regia</small>
                  </span>
                  <ChevronRight size={17} />
                </a>
              </div>

              <div className="profile-panel__footer">
                <button
                  type="button"
                  className="profile-panel__logout"
                  onClick={handleCeoLogout}
                >
                  <KeyRound size={18} />
                  Esci dal gestionale
                </button>
              </div>
            </aside>
          </>
        ) : null}

        {activeView === "Dashboard" ? <div className="dashboard">
          <div className="page-heading">
            <div>
              <p className="eyebrow">ECCOMI HUB <span>/</span> NOLEGGIO</p>
              <h1>Buongiorno Salvatore.</h1>
              <p>Ecco cosa sta accadendo in ECCOMI NOLEGGIO.</p>
            </div>
            <div className="page-heading__actions">
              <button className="button button--secondary" type="button" onClick={openUploadWorkflow}>
                <FileText size={18} /> Carica quotazione
              </button>
              <button className="button button--primary" type="button" onClick={() => changeView("Promozioni")}>
                <Check size={18} /> Approva offerte <span>{pendingCount}</span>
              </button>
            </div>
          </div>

          <section className="kpi-grid" aria-label="Indicatori principali">
            <article className="kpi-card">
              <span className="kpi-card__icon kpi-card__icon--blue"><CarFront size={20} /></span>
              <div className="kpi-card__label">Promozioni attive</div>
              <strong>{activeCount}</strong>
              <small className="kpi-card__trend kpi-card__trend--amber">{pendingCount} da approvare</small>
            </article>
            <article className="kpi-card">
              <span className="kpi-card__icon kpi-card__icon--violet"><UsersRound size={20} /></span>
              <div className="kpi-card__label">Lead nuovi</div>
              <strong>{newLeadCount}</strong>
              <small>{newLeadCount ? `${newLeadCount} ${newLeadCount === 1 ? "pratica da verificare" : "pratiche da verificare"}` : "Nessun lead da lavorare"}</small>
            </article>
            <article className="kpi-card">
              <span className="kpi-card__icon kpi-card__icon--amber"><Clock3 size={20} /></span>
              <div className="kpi-card__label">Quotazioni valide</div>
              <strong>{promotionItems.filter((promotion) => promotion.status !== "EXPIRED" && promotion.status !== "ARCHIVED").length}</strong>
              <small>Prima scadenza: 27 luglio</small>
            </article>
            <article className="kpi-card">
              <span className="kpi-card__icon kpi-card__icon--green"><BadgeEuro size={20} /></span>
              <div className="kpi-card__label">Commissioni maturate</div>
              <strong className="kpi-card__currency">0,00 €</strong>
              <small>Nessun contratto concluso</small>
            </article>
          </section>

          <div className="dashboard-grid">
            <section className="panel promotions-panel">
              <div className="panel__heading">
                <div>
                  <span className="section-kicker">AZIONE RICHIESTA</span>
                  <h2>Promozioni da approvare</h2>
                  <p>Estratte dalle quotazioni reali e ancora non pubblicate.</p>
                </div>
                <button className="text-button" type="button" onClick={() => changeView("Promozioni")}>Vedi tutte <ChevronRight size={16} /></button>
              </div>

              <div className="promotion-list">
                {promotionItems.map((promotion) => (
                  <article className="promotion-row" key={promotion.id}>
                    <PromotionThumb promotion={promotion} />
                    <div className="promotion-row__identity">
                      <div className="promotion-row__badges">
                        <span className={`status-badge ${promotion.status !== "PENDING_APPROVAL" ? "status-badge--approved" : ""}`}>{promotion.statusLabel}</span>
                        <span className="offer-code">Offerta {promotion.offerNumber}</span>
                      </div>
                      <h3>{promotion.brand} {promotion.model}</h3>
                      <p>{promotion.rental} · {promotion.source}</p>
                      <div className="owner-line">
                        <Building2 size={14} /> Gestione: <strong>{promotion.owner}</strong>
                      </div>
                    </div>
                    <div className="promotion-row__terms">
                      <strong>{promotion.price}<small>/mese IVA incl.</small></strong>
                      <div>
                        <span>Anticipo <b>{promotion.deposit}</b></span>
                        <span>{promotion.term} <b>·</b> {promotion.mileage}</span>
                      </div>
                    </div>
                    <div className="promotion-row__expiry">
                      <small>Scade il</small>
                      <strong>{promotion.expires}</strong>
                      <span>{promotion.days} rimanenti</span>
                    </div>
                    <button className="row-action" type="button" aria-label={`Controlla ${promotion.model}`} onClick={() => setSelectedPromotion(promotion)}>
                      Controlla <ChevronRight size={17} />
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <aside className="right-column">
              <section className="panel deadline-panel">
                <div className="panel__heading panel__heading--compact">
                  <div>
                    <span className="section-kicker">SCADENZE</span>
                    <h2>Prossime quotazioni</h2>
                  </div>
                  <Clock3 size={20} />
                </div>
                <div className="deadline-list">
                  <div className="deadline-item">
                    <div className="deadline-item__date"><strong>27</strong><span>LUG</span></div>
                    <div>
                      <strong>Fiat Pandina</strong>
                      <span>Leasys · 5 giorni</span>
                    </div>
                    <i className="deadline-item__dot deadline-item__dot--amber" />
                  </div>
                  <div className="deadline-item">
                    <div className="deadline-item__date"><strong>09</strong><span>AGO</span></div>
                    <div>
                      <strong>Kia Picanto</strong>
                      <span>Ayvens / ALD · 18 giorni</span>
                    </div>
                    <i className="deadline-item__dot deadline-item__dot--blue" />
                  </div>
                </div>
                <div className="automatic-rule">
                  <CircleGauge size={18} />
                  <div>
                    <strong>Controllo automatico</strong>
                    <span>Avviso 24 ore prima e disattivazione alla scadenza.</span>
                  </div>
                </div>
              </section>

              <section className="panel access-panel">
                <div className="panel__heading panel__heading--compact">
                  <div>
                    <span className="section-kicker">SICUREZZA</span>
                    <h2>Accessi separati</h2>
                  </div>
                  <ShieldCheck size={20} />
                </div>
                <div className="access-list">
                  <div>
                    <span className="access-list__avatar access-list__avatar--ceo">CEO</span>
                    <p><strong>Salvatore</strong><small>Vede e governa tutto</small></p>
                    <span className="access-list__state">Completo</span>
                  </div>
                  <div>
                    <span className="access-list__avatar access-list__avatar--partner">P</span>
                    <p><strong>Partner operativi</strong><small>Solo offerte e pratiche proprie</small></p>
                    <span className="access-list__state">Limitato</span>
                  </div>
                  <button className="access-list__action" type="button" onClick={() => setShopifyOpen(true)}>
                    <span className="access-list__avatar access-list__avatar--shopify">S</span>
                    <p><strong>Shopify</strong><small>{shopify.connected ? shopify.shopDomain : "Completa il collegamento"}</small></p>
                    <span className={`access-list__state ${shopify.connected ? "access-list__state--connected" : "access-list__state--pending"}`}>{shopify.connected ? "Collegato" : "Da collegare"}</span>
                  </button>
                </div>
              </section>

              <section className="panel hub-event-panel">
                <div className="panel__heading panel__heading--compact">
                  <div>
                    <span className="section-kicker">ECCOMI HUB</span>
                    <h2>Registro automatico</h2>
                  </div>
                  <FileCheck2 size={20} />
                </div>
                <div className="hub-event-list">
                  {hubEvents.length ? hubEvents.slice(0, 3).map((event) => (
                    <div key={event.id}>
                      <span><Check size={14} /></span>
                      <p><strong>{event.title}</strong><small>{new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(event.createdAt))}</small></p>
                    </div>
                  )) : <div><span><Clock3 size={14} /></span><p><strong>In attesa del primo evento</strong><small>Bozze e pubblicazioni verranno registrate qui.</small></p></div>}
                </div>
              </section>
            </aside>
          </div>

          <footer className="dashboard-footer">
            <span><i /> Ultimo controllo: adesso</span>
            <span>ECCOMI NOLEGGIO · Governato da ECCOMI HUB</span>
          </footer>
        </div> : null}
        {activeView === "Promozioni" ? <PromotionsView query={searchQuery} promotions={promotionItems} shopify={shopify} onUpload={openUploadWorkflow} onSelect={setSelectedPromotion} /> : null}
        {activeView === "Lead e pratiche" ? <LeadsView leads={leadItems} /> : null}
        {activeView === "Partner" ? <PartnersView leads={leadItems} /> : null}
        {activeView === "Commissioni" ? <CommissionsView /> : null}
      </section>

      <button className="mobile-primary-action" type="button" aria-label="Carica quotazione" onClick={openUploadWorkflow}>
        <Plus size={22} />
      </button>
      <UploadQuoteModal open={uploadOpen} onClose={() => setUploadOpen(false)} onDraftReady={handleDraftReady} />
      <PromotionModal promotion={selectedPromotion} shopify={shopify} busy={Boolean(selectedPromotion && busyPromotionId === selectedPromotion.id)} onClose={() => setSelectedPromotion(null)} onPrepare={handlePrepare} onPublish={handlePublish} onCustomerPreview={(promotion) => { setSelectedPromotion(null); setCustomerPreview(promotion); }} />
      <CustomerOfferPreview promotion={customerPreview} onClose={() => setCustomerPreview(null)} onStartRequest={(promotion) => { setCustomerPreview(null); setApplicationPreview(promotion); }} />
      <ApplicationWizard promotion={applicationPreview} onClose={() => setApplicationPreview(null)} onComplete={() => notify("Anteprima della richiesta completata. Nessun dato di prova è stato salvato.")} />
      {shopifyOpen ? <ShopifyConnectionModal connection={shopify} suggestedShopDomain={suggestedShopDomain} onClose={() => setShopifyOpen(false)} onConnected={handleShopifyConnected} /> : null}
      {aiOpen ? <AiConnectionModal connection={ai} onClose={() => setAiOpen(false)} onConnected={handleAiConnected} /> : null}
      {toast ? <div className="toast-message"><Check size={18} /><span>{toast}</span><button type="button" aria-label="Chiudi messaggio" onClick={() => setToast("")}><X size={16} /></button></div> : null}
    </main>
  );
}
