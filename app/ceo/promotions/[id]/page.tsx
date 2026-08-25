/* eslint-disable @next/next/no-html-link-for-pages -- This editor intentionally uses native navigation and forms on iPad. */
import { GET as getPromotion } from "../../../api/promotions/[id]/edit/route";
import { getActor } from "../../../lib/server/authz";
import { currentRequest } from "../../../lib/server/current-request";
import { isRenderPullRequestPreview } from "../../../lib/server/preview-mode";
import CeoLoginFallback from "../../ceo-login-fallback";
import "../../ceo-server.css";

type EditablePromotion = {
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
  status: string;
  shopifyProductId: string | null;
  shopifyUrl: string | null;
};

type EditPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryValue(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function formValue(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string,
  fallback: string,
) {
  return queryValue(query, key) ?? fallback;
}

function romeToday() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function addDays(value: string, amount: number) {
  const today = romeToday();
  const source = /^\d{4}-\d{2}-\d{2}$/.test(value) && value > today
    ? value
    : today;
  const date = new Date(`${source}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function stripLeadingWords(value: string, prefix: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const prefixWords = prefix.trim().split(/\s+/).filter(Boolean);
  const normalize = (word: string) => word.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const matches = prefixWords.length > 0 && prefixWords.every(
    (word, index) => normalize(words[index] || "") === normalize(word),
  );
  return matches ? words.slice(prefixWords.length).join(" ") : value.trim();
}

function publicTitle(brand: string, model: string, rawVersion: string) {
  const normalizedBrand = brand.trim().toUpperCase();
  const normalizedModel = model.trim();
  let version = rawVersion.trim();
  version = stripLeadingWords(version, `${normalizedBrand} ${normalizedModel}`);
  version = stripLeadingWords(version, normalizedModel);
  version = stripLeadingWords(version, normalizedBrand);
  return [normalizedBrand, normalizedModel, version]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function CeoPromotionEditPage({
  params,
  searchParams,
}: EditPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const request = await currentRequest(`/api/promotions/${id}/edit`);
  const actor = await getActor(request);

  if (!actor) return <CeoLoginFallback />;

  const response = await getPromotion(request, { params: Promise.resolve({ id }) });
  const payload = (await response.json().catch(() => ({}))) as {
    promotion?: EditablePromotion;
    error?: string;
    preview?: boolean;
  };

  if (!response.ok || !payload.promotion) {
    return (
      <main className="ceo-server-login">
        <section className="ceo-server-login__card">
          <h1>Offerta non disponibile</h1>
          <p>{payload.error || "La promozione richiesta non è stata trovata."}</p>
          <a className="ceo-server-primary" href="/ceo/promotions">Torna alle promozioni</a>
        </section>
      </main>
    );
  }

  const promotion = payload.promotion;
  const values = {
    brand: formValue(query, "brand", promotion.brand),
    model: formValue(query, "model", promotion.model),
    version: formValue(query, "version", promotion.version),
    provider: formValue(query, "provider", promotion.provider),
    monthly: formValue(query, "monthly", (promotion.monthlyGrossCents / 100).toFixed(2)),
    deposit: formValue(query, "deposit", (promotion.depositGrossCents / 100).toFixed(2)),
    duration: formValue(query, "duration", String(promotion.durationMonths)),
    totalKm: formValue(query, "totalKm", String(promotion.totalKm)),
    delivery: formValue(query, "delivery", promotion.delivery),
    fuel: formValue(query, "fuel", promotion.fuel),
    transmission: formValue(query, "transmission", promotion.transmission),
    color: formValue(query, "color", promotion.color),
    services: formValue(query, "services", promotion.services.join("\n")),
    warnings: formValue(query, "warnings", promotion.warnings.join("\n")),
  };
  const dateAction = queryValue(query, "dateAction");
  let validUntil = formValue(query, "validUntil", promotion.validUntil);
  let reactivate = queryValue(query, "reactivate") === "true";

  if (dateAction === "add7") validUntil = addDays(validUntil, 7);
  if (dateAction === "add15") validUntil = addDays(validUntil, 15);
  if (dateAction === "add30") validUntil = addDays(validUntil, 30);
  if (dateAction === "reactivate30") {
    validUntil = addDays(validUntil, 30);
    reactivate = true;
  }

  const title = publicTitle(values.brand, values.model, values.version);
  const preview = payload.preview === true || isRenderPullRequestPreview(request);
  const saved = queryValue(query, "saved") === "1";
  const error = queryValue(query, "error");

  return (
    <main className="ceo-server-page" data-server-editor-ready="true">
      <header className="ceo-server-bar">
        <div className="ceo-server-bar__brand">
          <span>🚙</span>
          <div><strong>ECCOMI</strong><small>NOLEGGIO</small></div>
        </div>
        <a href="/ceo/promotions">← Tutte le promozioni</a>
      </header>

      <section className="ceo-server-heading">
        <small>{preview ? "PREVIEW SICURA" : "SOLO CEO · SCRITTURA REALE"}</small>
        <h1>Modifica offerta</h1>
        <p>
          {preview
            ? "La preview simula il salvataggio e non contatta Supabase o Shopify."
            : "Il salvataggio aggiorna la stessa promozione e lo stesso prodotto Shopify."}
        </p>
      </section>

      <form
        className="ceo-server-editor"
        method="post"
        action={`/api/promotions/${encodeURIComponent(id)}/edit-form`}
      >
        <input type="hidden" name="returnTo" value={`/ceo/promotions/${id}`} />
        <input type="hidden" name="reactivate" value={reactivate ? "true" : "false"} />

        <div className="ceo-server-editor__summary">
          <small>OFFERTA {promotion.offerNumber}</small>
          <strong>{title || "Titolo da completare"}</strong>
          <span>I duplicati come “3008 3008” vengono rimossi dal titolo pubblico.</span>
        </div>

        {saved ? (
          <div className="ceo-server-result">
            <strong>{preview ? "SIMULAZIONE COMPLETATA" : "SALVATAGGIO COMPLETATO"}</strong>
            <div>{preview ? "Nessuna scrittura esterna eseguita." : "Promozione e prodotto Shopify sincronizzati."}</div>
          </div>
        ) : null}
        {error ? <div className="ceo-server-result--error">{error}</div> : null}

        <section>
          <fieldset>
            <legend>01 · Veicolo</legend>
            <div className="ceo-server-fields">
              <label><span>Marca</span><input name="brand" defaultValue={values.brand} required /></label>
              <label><span>Modello</span><input name="model" defaultValue={values.model} required /></label>
              <label className="ceo-server-wide"><span>Versione</span><input name="version" defaultValue={values.version} /></label>
              <label><span>Alimentazione</span><input name="fuel" defaultValue={values.fuel} /></label>
              <label><span>Cambio</span><input name="transmission" defaultValue={values.transmission} /></label>
              <label><span>Colore</span><input name="color" defaultValue={values.color} /></label>
              <label><span>Noleggiatore</span><input name="provider" defaultValue={values.provider} required /></label>
            </div>
          </fieldset>
        </section>

        <section>
          <fieldset>
            <legend>02 · Condizioni economiche</legend>
            <div className="ceo-server-fields ceo-server-fields--four">
              <label><span>Canone €/mese</span><input name="monthly" type="number" min="0.01" step="0.01" defaultValue={values.monthly} required /></label>
              <label><span>Anticipo €</span><input name="deposit" type="number" min="0" step="0.01" defaultValue={values.deposit} required /></label>
              <label><span>Durata mesi</span><input name="duration" type="number" min="1" step="1" defaultValue={values.duration} required /></label>
              <label><span>Km totali</span><input name="totalKm" type="number" min="1" step="1" defaultValue={values.totalKm} required /></label>
              <label className="ceo-server-wide"><span>Consegna</span><input name="delivery" defaultValue={values.delivery} /></label>
            </div>
          </fieldset>
        </section>

        <section id="expiry">
          <fieldset>
            <legend>03 · Durata promozione</legend>
            <div className="ceo-server-expiry">
              <label><span>Scadenza</span><input name="validUntil" type="date" defaultValue={validUntil} required /></label>
              <div className="ceo-server-quick-days">
                <button type="submit" name="dateAction" value="add7" formMethod="get" formAction={`/ceo/promotions/${id}#expiry`}>+7 giorni</button>
                <button type="submit" name="dateAction" value="add15" formMethod="get" formAction={`/ceo/promotions/${id}#expiry`}>+15 giorni</button>
                <button type="submit" name="dateAction" value="add30" formMethod="get" formAction={`/ceo/promotions/${id}#expiry`}>+30 giorni</button>
                {promotion.status === "EXPIRED" ? (
                  <button type="submit" name="dateAction" value="reactivate30" formMethod="get" formAction={`/ceo/promotions/${id}#expiry`}>
                    {reactivate ? "RIATTIVAZIONE IMPOSTATA" : "Riattiva +30"}
                  </button>
                ) : null}
              </div>
            </div>
            {promotion.status === "EXPIRED" ? (
              <label className="ceo-server-check">
                <input name="reactivate" type="checkbox" value="true" defaultChecked={reactivate} />
                <span>Riattiva la promozione e rimetti online lo stesso prodotto Shopify</span>
              </label>
            ) : null}
          </fieldset>
        </section>

        <section>
          <fieldset>
            <legend>04 · Servizi e condizioni</legend>
            <div className="ceo-server-fields">
              <label className="ceo-server-wide"><span>Servizi inclusi</span><textarea name="services" rows={7} defaultValue={values.services} /></label>
              <label className="ceo-server-wide"><span>Condizioni / avvertenze</span><textarea name="warnings" rows={7} defaultValue={values.warnings} /></label>
            </div>
          </fieldset>
        </section>

        <div className="ceo-server-shopify">
          <strong>STESSO PRODOTTO SHOPIFY</strong>
          <code>{promotion.shopifyProductId || "Prodotto non ancora creato"}</code>
        </div>

        <footer className="ceo-server-actions">
          <a className="ceo-server-secondary" href="/ceo/promotions">Annulla</a>
          <button className="ceo-server-primary" type="submit">
            {preview ? "SIMULA SALVATAGGIO" : reactivate ? "SALVA E RIATTIVA" : "SALVA MODIFICHE"}
          </button>
        </footer>
      </form>
    </main>
  );
}
