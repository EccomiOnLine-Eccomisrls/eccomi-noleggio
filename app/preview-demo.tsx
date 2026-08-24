/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors are deliberate: this PR demo must remain navigable when framework hydration is unavailable. */

type PreviewDashboardPayload = {
  preview: boolean;
  readOnly: boolean;
  user: {
    displayName: string;
  };
  promotions: Array<{
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
    version: string;
    fuel: string;
    transmission: string;
    color: string;
    delivery: string;
    services: string[];
    warnings: string[];
    status: string;
    shopifyProductId: string | null;
  }>;
};

type PreviewDemoProps = {
  payload: PreviewDashboardPayload;
  view: "dashboard" | "promotions";
  editId?: string | null;
  query?: PreviewQuery;
};

type PreviewQuery = Record<string, string | string[] | undefined>;

function queryValue(query: PreviewQuery | undefined, key: string) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function formValue(query: PreviewQuery | undefined, key: string, fallback: string) {
  const value = queryValue(query, key);
  return value === undefined ? fallback : value;
}

function addUtcDays(value: string, amount: number, fallback: string) {
  const source = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  const date = new Date(`${source}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return fallback;
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function stripLeadingWords(value: string, prefix: string) {
  const sourceWords = value.trim().split(/\s+/).filter(Boolean);
  const prefixWords = prefix.trim().split(/\s+/).filter(Boolean);
  const normalize = (word: string) => word.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const matches = prefixWords.length > 0 && prefixWords.every(
    (word, index) => normalize(sourceWords[index] || "") === normalize(word),
  );
  return matches
    ? sourceWords.slice(prefixWords.length).join(" ").replace(/^[\s\-–—:|]+/, "").trim()
    : value.trim();
}

function publicTitle(brand: string, model: string, rawVersion: string) {
  const normalizedBrand = brand.trim().toUpperCase();
  const normalizedModel = model.trim();
  let version = rawVersion.trim();
  version = stripLeadingWords(version, `${normalizedBrand} ${normalizedModel}`);
  version = stripLeadingWords(version, normalizedModel);
  version = stripLeadingWords(version, normalizedModel);
  version = stripLeadingWords(version, normalizedBrand);
  return [normalizedBrand, normalizedModel, version].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function italianDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function Brand() {
  return (
    <div className="ec-preview-brandmark">
      <span aria-hidden="true">🚙</span>
      <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
    </div>
  );
}

function Sidebar({ view }: { view: PreviewDemoProps["view"] }) {
  return (
    <aside className="ec-preview-sidebar">
      <Brand />
      <div className="ec-preview-ecosystem"><span>E</span><div><small>ECOSISTEMA</small><strong>ECCOMI HUB</strong></div><b>⌄</b></div>
      <small className="ec-preview-nav-title">AREA OPERATIVA</small>
      <nav aria-label="Navigazione preview">
        <a className={view === "dashboard" ? "active" : ""} href="/?view=dashboard"><span>▦</span> Dashboard</a>
        <a className={view === "promotions" ? "active" : ""} href="/?view=promotions"><span>🚗</span> Promozioni <em>1</em></a>
        <span className="disabled"><i>♙</i> Lead e pratiche</span>
        <span className="disabled"><i>⌁</i> Partner</span>
        <span className="disabled"><i>€</i> Commissioni</span>
      </nav>
      <div className="ec-preview-sidebar-spacer" />
      <div className="ec-preview-profile"><span>SD</span><div><strong>Salvatore Del Libano</strong><small>CEO · Preview isolata</small></div></div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="ec-preview-topbar">
      <div className="ec-preview-search">⌕ <span>Cerca promozioni, clienti, partner o comandi…</span><kbd>⌘ K</kbd></div>
      <div className="ec-preview-system"><i /> Preview sicura</div>
      <span className="ec-preview-avatar">SD</span>
    </header>
  );
}

function DashboardView({ payload }: { payload: PreviewDashboardPayload }) {
  const promotion = payload.promotions[0];
  return (
    <section className="ec-preview-page">
      <div className="ec-preview-hero">
        <div className="ec-preview-hero-copy">
          <span className="ec-preview-kicker"><i /> ECCOMI DECISION CENTER</span>
          <h1>Buongiorno {payload.user.displayName.split(" ")[0]} 👋</h1>
          <p>Questa è la demo isolata della PR #3. I comandi usano esclusivamente la PEUGEOT 3008 di prova.</p>
        </div>
        <a className="ec-preview-primary" href="/?view=promotions">Gestisci promozioni <b>→</b></a>
        <div className="ec-preview-hero-metrics">
          <article><span>⚠</span><div><small>DA ATTENZIONARE</small><strong>1</strong><p>{promotion.brand} {promotion.model} · {promotion.days}</p></div><b>›</b></article>
          <article><span>♙</span><div><small>LEAD E PRATICHE</small><strong>0</strong><p>Nessun dato reale caricato</p></div><b>›</b></article>
          <article><span>✓</span><div><small>STATO SISTEMA</small><strong className="green">Isolato</strong><p>Supabase e Shopify non usati</p></div></article>
        </div>
      </div>
      <div className="ec-preview-dashboard-grid">
        <article className="attention"><span>⚠</span><small>PRIORITÀ</small><strong>1</strong><h2>Da attenzionare</h2><p>La promozione demo scade entro 7 giorni.</p><a href="/?view=promotions">Apri priorità <b>→</b></a></article>
        <article><span>🚗</span><small>PROMOZIONI</small><strong>1</strong><h2>Offerta demo</h2><p>PEUGEOT 3008 pronta per il collaudo.</p><a href="/?view=promotions">Gestisci offerta <b>→</b></a></article>
        <article><span>↗</span><small>SHOPIFY</small><strong>0</strong><h2>Scritture eseguite</h2><p>La preview non contatta lo store reale.</p><span className="ec-preview-card-foot">PROTEZIONE ATTIVA</span></article>
      </div>
      <div className="ec-preview-safety"><strong>PREVIEW CLIENTLESS ATTIVA</strong><span>La navigazione usa collegamenti reali e non dipende dal caricamento React che bloccava i pulsanti.</span></div>
    </section>
  );
}

function PromotionsView({ promotion }: { promotion: PreviewDashboardPayload["promotions"][number] }) {
  return (
    <section className="ec-preview-page">
      <div className="ec-preview-heading">
        <div><span className="ec-preview-kicker">ECCOMI HUB / NOLEGGIO</span><h1>Promozioni</h1><p>Quotazioni, scadenze e gestione delle offerte.</p></div>
        <span className="ec-preview-readonly">DEMO ISOLATA · 1 OFFERTA</span>
      </div>
      <div className="ec-preview-kpis">
        <article><small>DA ATTENZIONARE</small><strong>1</strong><span>Scadenza entro 7 giorni</span></article>
        <article><small>ONLINE DEMO</small><strong>1</strong><span>Nessun prodotto reale</span></article>
        <article><small>SCADUTE</small><strong>0</strong><span>Nessuna decisione sospesa</span></article>
      </div>
      <div className="ec-preview-promotion-panel">
        <div className="ec-preview-panel-head"><div><span>TUTTE LE PROMOZIONI</span><strong>1 risultato</strong></div><a href="/?view=dashboard">← Torna alla dashboard</a></div>
        <article className="ec-preview-promotion-card">
          <div className="ec-preview-car"><span>PEUGEOT</span><strong>3008</strong><small>HYBRID</small></div>
          <div className="ec-preview-promotion-copy">
            <div className="ec-preview-promotion-title"><div><small>OFFERTA {promotion.offerNumber}</small><h2>{promotion.brand} {promotion.model}</h2><p>{promotion.version}</p></div><span>DA ATTENZIONARE</span></div>
            <div className="ec-preview-offer-metrics"><div><small>CANONE</small><strong>{promotion.price}<em>/mese</em></strong></div><div><small>ANTICIPO</small><strong>{promotion.deposit}</strong></div><div><small>DURATA</small><strong>{promotion.term}</strong></div><div><small>CHILOMETRI</small><strong>{promotion.mileage}</strong></div></div>
            <div className="ec-preview-promotion-meta"><span>🏢 {promotion.rental}</span><span>⏱ Scade il {promotion.expires}</span><span>🛡 Fixture PR #3</span></div>
            <div className="ec-preview-promotion-actions"><a className="ec-preview-primary" href={`/?view=promotions&edit=${encodeURIComponent(promotion.id)}`}>✎ Modifica offerta</a><span>Lo stesso shopifyProductId verrà soltanto simulato</span></div>
          </div>
        </article>
      </div>
    </section>
  );
}

function Editor({ promotion, query }: {
  promotion: PreviewDashboardPayload["promotions"][number];
  query?: PreviewQuery;
}) {
  const action = queryValue(query, "previewAction");
  const values = {
    brand: formValue(query, "brand", promotion.brand),
    model: formValue(query, "model", promotion.model),
    version: formValue(query, "version", promotion.version),
    fuel: formValue(query, "fuel", promotion.fuel),
    transmission: formValue(query, "transmission", promotion.transmission),
    color: formValue(query, "color", promotion.color),
    provider: formValue(query, "provider", promotion.rental),
    monthly: formValue(query, "monthly", promotion.price.replace(/[^0-9,]/g, "").replace(",", ".")),
    deposit: formValue(query, "deposit", promotion.deposit.replace(/[^0-9,]/g, "").replace(",", ".")),
    duration: formValue(query, "duration", promotion.term.replace(/\D/g, "")),
    totalKm: formValue(query, "totalKm", promotion.mileage.replace(/\D/g, "")),
    delivery: formValue(query, "delivery", promotion.delivery),
    services: formValue(query, "services", promotion.services.join("\n")),
    warnings: formValue(query, "warnings", promotion.warnings.join("\n")),
  };
  let validUntil = formValue(query, "validUntil", promotion.validUntil);
  let dateCommand: string | null = null;
  if (action === "add7") {
    validUntil = addUtcDays(validUntil, 7, promotion.validUntil);
    dateCommand = "+7 giorni";
  } else if (action === "add15") {
    validUntil = addUtcDays(validUntil, 15, promotion.validUntil);
    dateCommand = "+15 giorni";
  } else if (action === "add30") {
    validUntil = addUtcDays(validUntil, 30, promotion.validUntil);
    dateCommand = "+30 giorni";
  } else if (action === "reactivate30") {
    validUntil = addUtcDays(validUntil, 30, promotion.validUntil);
    dateCommand = "Riattivazione +30 giorni";
  }
  const reactivated = action === "reactivate30" || formValue(query, "reactivate", "false") === "true";
  const saved = action === "save";
  const title = publicTitle(values.brand, values.model, values.version);
  const editorStatus = saved ? "SIMULATA" : reactivated ? "RIATTIVAZIONE IMPOSTATA" : "DA ATTENZIONARE";

  return (
    <div className="ec-preview-editor" role="presentation">
      <a className="ec-preview-editor-scrim" href="/?view=promotions" aria-label="Chiudi modifica offerta" />
      <aside role="dialog" aria-modal="true" aria-labelledby="ec-preview-editor-title">
        <header><div><span>ECCOMI NOLEGGIO · PREVIEW SICURA</span><h2 id="ec-preview-editor-title">Modifica offerta</h2><p>Prova tutti i campi. Il salvataggio finale è una simulazione senza scritture esterne.</p></div><a href="/?view=promotions" aria-label="Chiudi">×</a></header>
        <form id="ec-preview-editor-form" method="get" action="/" data-eccomi-preview-native-form="true">
          <input type="hidden" name="view" value="promotions" />
          <input type="hidden" name="edit" value={promotion.id} />
          <div className="ec-preview-editor-body">
            <div className="ec-preview-editor-banner"><strong>PREVIEW SICURA</strong><span id="ec-preview-runtime-state" data-ready="true">COMANDI HTML ATTIVI</span><small>Nessun dato reale coinvolto</small></div>
            <section className="ec-preview-editor-summary"><div><small>OFFERTA {promotion.offerNumber}</small><strong id="ec-preview-title-output">{title || "Titolo da completare"}</strong><span>Il titolo rimuove automaticamente duplicati come “3008 3008” al comando successivo.</span></div><em id="ec-preview-editor-status">{editorStatus}</em></section>
            <fieldset><legend><span>01</span><div><strong>Veicolo</strong><small>Dati della scheda pubblica</small></div></legend><div className="ec-preview-fields"><label><span>Marca</span><input id="ec-preview-brand" name="brand" defaultValue={values.brand} required /></label><label><span>Modello</span><input id="ec-preview-model" name="model" defaultValue={values.model} required /></label><label className="wide"><span>Versione</span><input id="ec-preview-version" name="version" defaultValue={values.version} /></label><label><span>Alimentazione</span><input id="ec-preview-fuel" name="fuel" defaultValue={values.fuel} /></label><label><span>Cambio</span><input id="ec-preview-transmission" name="transmission" defaultValue={values.transmission} /></label><label><span>Colore</span><input id="ec-preview-color" name="color" defaultValue={values.color} /></label><label><span>Noleggiatore</span><input id="ec-preview-provider" name="provider" defaultValue={values.provider} required /></label></div></fieldset>
            <fieldset><legend><span>02</span><div><strong>Condizioni economiche</strong><small>Canone, anticipo, durata e chilometri</small></div></legend><div className="ec-preview-fields four"><label><span>Canone €/mese</span><input id="ec-preview-monthly" name="monthly" type="number" min="0.01" step="0.01" defaultValue={values.monthly} required /></label><label><span>Anticipo €</span><input id="ec-preview-deposit" name="deposit" type="number" min="0" step="0.01" defaultValue={values.deposit} required /></label><label><span>Durata mesi</span><input id="ec-preview-duration" name="duration" type="number" min="1" defaultValue={values.duration} required /></label><label><span>Km totali</span><input id="ec-preview-km" name="totalKm" type="number" min="1" step="1" defaultValue={values.totalKm} required /></label><label className="wide"><span>Consegna</span><input id="ec-preview-delivery" name="delivery" defaultValue={values.delivery} /></label></div></fieldset>
            <fieldset id="ec-preview-expiry"><legend><span>03</span><div><strong>Durata promozione</strong><small>Allunga o simula la riattivazione</small></div></legend><div className="ec-preview-expiry"><label><span>Scadenza</span><input id="ec-preview-valid-until" name="validUntil" type="date" defaultValue={validUntil} required /></label><div><button type="submit" name="previewAction" value="add7" formAction="/#ec-preview-expiry">+7 giorni</button><button type="submit" name="previewAction" value="add15" formAction="/#ec-preview-expiry">+15 giorni</button><button type="submit" name="previewAction" value="add30" formAction="/#ec-preview-expiry">+30 giorni</button><button id="ec-preview-reactivate-button" type="submit" name="previewAction" value="reactivate30" formAction="/#ec-preview-expiry" data-selected={reactivated ? "true" : undefined}>{reactivated ? "RIATTIVAZIONE IMPOSTATA" : "Riattiva +30"}</button></div></div><input id="ec-preview-reactivate" type="hidden" name="reactivate" value={reactivated ? "true" : "false"} />{dateCommand ? <div className="ec-preview-result" data-kind="success" data-eccomi-preview-date-updated="true"><strong>{dateCommand}</strong><span>Nuova scadenza: {italianDate(validUntil)}</span></div> : null}</fieldset>
            <fieldset><legend><span>04</span><div><strong>Servizi e condizioni</strong><small>Un elemento per riga</small></div></legend><div className="ec-preview-fields"><label className="wide"><span>Servizi inclusi</span><textarea id="ec-preview-services" name="services" rows={5} defaultValue={values.services} /></label><label className="wide"><span>Condizioni / avvertenze</span><textarea id="ec-preview-warnings" name="warnings" rows={4} defaultValue={values.warnings} /></label></div></fieldset>
            <div className="ec-preview-shopify-id"><span>STESSO PRODOTTO SHOPIFY</span><code>{promotion.shopifyProductId}</code><small>In preview non viene effettuata alcuna chiamata a Shopify.</small></div>
            {saved ? <div id="ec-preview-result" className="ec-preview-result" data-kind="success"><strong>SIMULAZIONE COMPLETATA</strong><span>Nessuna modifica salvata su Supabase o Shopify. Lo stesso shopifyProductId è rimasto invariato.</span></div> : <div id="ec-preview-result" className="ec-preview-result" hidden />}
          </div>
          <footer><span>SIMULAZIONE · nessuna scrittura su Supabase o Shopify</span><div><a href="/?view=promotions">Annulla</a><button id="ec-preview-submit" type="submit" name="previewAction" value="save" formAction="/#ec-preview-result">SIMULA SALVATAGGIO</button></div></footer>
        </form>
      </aside>
    </div>
  );
}

export default function PreviewDemo({ payload, view, editId, query }: PreviewDemoProps) {
  const promotion = payload.promotions[0];
  const editorOpen = view === "promotions" && editId === promotion.id;

  return (
    <div className="ec-preview-demo" data-eccomi-clientless-preview="true">
      <Sidebar view={view} />
      <div className="ec-preview-workspace">
        <Topbar />
        {view === "promotions" ? <PromotionsView promotion={promotion} /> : <DashboardView payload={payload} />}
      </div>
      {editorOpen ? <Editor promotion={promotion} query={query} /> : null}
    </div>
  );
}
