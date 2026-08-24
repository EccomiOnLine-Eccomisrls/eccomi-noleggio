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
};

const editorRuntime = `(()=>{
  const form=document.getElementById("ec-preview-editor-form");
  if(!form||form.dataset.bound==="true")return;
  form.dataset.bound="true";
  const byId=(id)=>document.getElementById(id);
  const runtime=byId("ec-preview-runtime-state");
  if(runtime){runtime.textContent="COMANDI ATTIVI";runtime.dataset.ready="true";}
  const dateInput=byId("ec-preview-valid-until");
  const reactivateInput=byId("ec-preview-reactivate");
  const addDays=(amount)=>{
    if(!dateInput)return;
    const raw=dateInput.value||new Date().toISOString().slice(0,10);
    const date=new Date(raw+"T12:00:00Z");
    date.setUTCDate(date.getUTCDate()+amount);
    dateInput.value=date.toISOString().slice(0,10);
    dateInput.dispatchEvent(new Event("input",{bubbles:true}));
  };
  document.querySelectorAll("[data-preview-add-days]").forEach((button)=>{
    button.addEventListener("click",()=>addDays(Number(button.dataset.previewAddDays||0)));
  });
  const reactivate=byId("ec-preview-reactivate-button");
  if(reactivate)reactivate.addEventListener("click",()=>{
    if(reactivateInput)reactivateInput.value="true";
    addDays(30);
    reactivate.textContent="RIATTIVAZIONE IMPOSTATA";
    reactivate.dataset.selected="true";
  });
  const normalized=(value)=>value.trim().toUpperCase().replace(/[^A-Z0-9]+/g," ").trim().replace(/\\s+/g," ");
  const stripPrefix=(value,prefix)=>{
    const source=normalized(value);
    const target=normalized(prefix);
    if(!source||!target||!source.startsWith(target))return value.trim();
    return value.trim().split(/\\s+/).slice(prefix.trim().split(/\\s+/).length).join(" ").replace(/^[\\s\\-–—:|]+/,"").trim();
  };
  const refreshTitle=()=>{
    const brand=String(byId("ec-preview-brand")?.value||"").trim().toUpperCase();
    const model=String(byId("ec-preview-model")?.value||"").trim();
    let version=String(byId("ec-preview-version")?.value||"").trim();
    version=stripPrefix(version,brand+" "+model);
    version=stripPrefix(version,model);
    version=stripPrefix(version,model);
    version=stripPrefix(version,brand);
    const title=[brand,model,version].filter(Boolean).join(" ").replace(/\\s+/g," ").trim();
    const target=byId("ec-preview-title-output");
    if(target)target.textContent=title||"Titolo da completare";
  };
  ["ec-preview-brand","ec-preview-model","ec-preview-version"].forEach((id)=>byId(id)?.addEventListener("input",refreshTitle));
  refreshTitle();
  form.addEventListener("submit",async(event)=>{
    event.preventDefault();
    const submit=byId("ec-preview-submit");
    const result=byId("ec-preview-result");
    if(submit){submit.disabled=true;submit.textContent="SIMULAZIONE…";}
    if(result){result.hidden=false;result.dataset.kind="loading";result.textContent="Verifica della simulazione in corso…";}
    const lines=(id)=>String(byId(id)?.value||"").split(/\\n+/).map((item)=>item.trim()).filter(Boolean);
    const cents=(id)=>Math.round(Number(String(byId(id)?.value||"0").replace(",","."))*100);
    const body={
      brand:String(byId("ec-preview-brand")?.value||""),
      model:String(byId("ec-preview-model")?.value||""),
      version:String(byId("ec-preview-version")?.value||""),
      provider:String(byId("ec-preview-provider")?.value||""),
      monthlyGrossCents:cents("ec-preview-monthly"),
      depositGrossCents:cents("ec-preview-deposit"),
      durationMonths:Number(byId("ec-preview-duration")?.value||0),
      totalKm:Number(byId("ec-preview-km")?.value||0),
      validUntil:String(dateInput?.value||""),
      delivery:String(byId("ec-preview-delivery")?.value||""),
      fuel:String(byId("ec-preview-fuel")?.value||""),
      transmission:String(byId("ec-preview-transmission")?.value||""),
      color:String(byId("ec-preview-color")?.value||""),
      services:lines("ec-preview-services"),
      warnings:lines("ec-preview-warnings"),
      syncShopify:true,
      reactivate:reactivateInput?.value==="true"
    };
    try{
      const response=await fetch(form.dataset.endpoint,{method:"PATCH",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||payload.preview!==true||payload.simulated!==true)throw new Error(payload.error||"La risposta non è una simulazione preview valida.");
      if(result){result.dataset.kind="success";result.innerHTML="<strong>SIMULAZIONE COMPLETATA</strong><span>Nessuna modifica salvata su Supabase o Shopify. Lo stesso shopifyProductId è rimasto invariato.</span>";}
      const status=byId("ec-preview-editor-status");
      if(status)status.textContent=payload.promotion?.status==="EXPIRING"?"DA ATTENZIONARE":payload.promotion?.status||"SIMULATA";
    }catch(error){
      if(result){result.dataset.kind="error";result.textContent=error instanceof Error?error.message:"Simulazione non riuscita.";}
    }finally{
      if(submit){submit.disabled=false;submit.textContent="SIMULA SALVATAGGIO";}
    }
  });
})();`;

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

function Editor({ promotion }: { promotion: PreviewDashboardPayload["promotions"][number] }) {
  const monthly = promotion.price.replace(/[^0-9,]/g, "").replace(",", ".");
  const deposit = promotion.deposit.replace(/[^0-9,]/g, "").replace(",", ".");
  const duration = promotion.term.replace(/\D/g, "");
  const totalKm = promotion.mileage.replace(/\D/g, "");

  return (
    <div className="ec-preview-editor" role="presentation">
      <a className="ec-preview-editor-scrim" href="/?view=promotions" aria-label="Chiudi modifica offerta" />
      <aside role="dialog" aria-modal="true" aria-labelledby="ec-preview-editor-title">
        <header><div><span>ECCOMI NOLEGGIO · PREVIEW SICURA</span><h2 id="ec-preview-editor-title">Modifica offerta</h2><p>Prova tutti i campi. Il salvataggio finale è una simulazione senza scritture esterne.</p></div><a href="/?view=promotions" aria-label="Chiudi">×</a></header>
        <form id="ec-preview-editor-form" data-endpoint={`/api/promotions/${encodeURIComponent(promotion.id)}/edit`}>
          <div className="ec-preview-editor-body">
            <div className="ec-preview-editor-banner"><strong>PREVIEW SICURA</strong><span id="ec-preview-runtime-state">DEMO SERVER ATTIVA</span><small>Nessun dato reale coinvolto</small></div>
            <section className="ec-preview-editor-summary"><div><small>OFFERTA {promotion.offerNumber}</small><strong id="ec-preview-title-output">{promotion.brand} {promotion.model} {promotion.version}</strong><span>Il titolo rimuove automaticamente duplicati come “3008 3008”.</span></div><em id="ec-preview-editor-status">DA ATTENZIONARE</em></section>
            <fieldset><legend><span>01</span><div><strong>Veicolo</strong><small>Dati della scheda pubblica</small></div></legend><div className="ec-preview-fields"><label><span>Marca</span><input id="ec-preview-brand" name="brand" defaultValue={promotion.brand} required /></label><label><span>Modello</span><input id="ec-preview-model" name="model" defaultValue={promotion.model} required /></label><label className="wide"><span>Versione</span><input id="ec-preview-version" name="version" defaultValue={promotion.version} /></label><label><span>Alimentazione</span><input id="ec-preview-fuel" name="fuel" defaultValue={promotion.fuel} /></label><label><span>Cambio</span><input id="ec-preview-transmission" name="transmission" defaultValue={promotion.transmission} /></label><label><span>Colore</span><input id="ec-preview-color" name="color" defaultValue={promotion.color} /></label><label><span>Noleggiatore</span><input id="ec-preview-provider" name="provider" defaultValue={promotion.rental} required /></label></div></fieldset>
            <fieldset><legend><span>02</span><div><strong>Condizioni economiche</strong><small>Canone, anticipo, durata e chilometri</small></div></legend><div className="ec-preview-fields four"><label><span>Canone €/mese</span><input id="ec-preview-monthly" name="monthly" type="number" min="0.01" step="0.01" defaultValue={monthly} required /></label><label><span>Anticipo €</span><input id="ec-preview-deposit" name="deposit" type="number" min="0" step="0.01" defaultValue={deposit} required /></label><label><span>Durata mesi</span><input id="ec-preview-duration" name="duration" type="number" min="1" defaultValue={duration} required /></label><label><span>Km totali</span><input id="ec-preview-km" name="totalKm" type="number" min="1" step="1000" defaultValue={totalKm} required /></label><label className="wide"><span>Consegna</span><input id="ec-preview-delivery" name="delivery" defaultValue={promotion.delivery} /></label></div></fieldset>
            <fieldset><legend><span>03</span><div><strong>Durata promozione</strong><small>Allunga o simula la riattivazione</small></div></legend><div className="ec-preview-expiry"><label><span>Scadenza</span><input id="ec-preview-valid-until" name="validUntil" type="date" defaultValue={promotion.validUntil} required /></label><div><button type="button" data-preview-add-days="7">+7 giorni</button><button type="button" data-preview-add-days="15">+15 giorni</button><button type="button" data-preview-add-days="30">+30 giorni</button><button id="ec-preview-reactivate-button" type="button">Riattiva +30</button></div></div><input id="ec-preview-reactivate" type="hidden" name="reactivate" value="false" /></fieldset>
            <fieldset><legend><span>04</span><div><strong>Servizi e condizioni</strong><small>Un elemento per riga</small></div></legend><div className="ec-preview-fields"><label className="wide"><span>Servizi inclusi</span><textarea id="ec-preview-services" name="services" rows={5} defaultValue={promotion.services.join("\n")} /></label><label className="wide"><span>Condizioni / avvertenze</span><textarea id="ec-preview-warnings" name="warnings" rows={4} defaultValue={promotion.warnings.join("\n")} /></label></div></fieldset>
            <div className="ec-preview-shopify-id"><span>STESSO PRODOTTO SHOPIFY</span><code>{promotion.shopifyProductId}</code><small>In preview non viene effettuata alcuna chiamata a Shopify.</small></div>
            <div id="ec-preview-result" className="ec-preview-result" hidden />
          </div>
          <footer><span>SIMULAZIONE · nessuna scrittura su Supabase o Shopify</span><div><a href="/?view=promotions">Annulla</a><button id="ec-preview-submit" type="submit">SIMULA SALVATAGGIO</button></div></footer>
        </form>
      </aside>
      <script data-eccomi-preview-editor-runtime="true" dangerouslySetInnerHTML={{ __html: editorRuntime }} />
    </div>
  );
}

export default function PreviewDemo({ payload, view, editId }: PreviewDemoProps) {
  const promotion = payload.promotions[0];
  const editorOpen = view === "promotions" && editId === promotion.id;

  return (
    <div className="ec-preview-demo" data-eccomi-clientless-preview="true">
      <Sidebar view={view} />
      <div className="ec-preview-workspace">
        <Topbar />
        {view === "promotions" ? <PromotionsView promotion={promotion} /> : <DashboardView payload={payload} />}
      </div>
      {editorOpen ? <Editor promotion={promotion} /> : null}
    </div>
  );
}
