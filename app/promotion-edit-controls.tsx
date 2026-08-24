"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PromotionSummary = {
  id: string;
  offerNumber: string;
  brand?: string;
  model?: string;
  status: string;
  validUntil?: string;
  shopifyProductId: string | null;
};

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

function romeToday() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function daysUntil(value?: string) {
  if (!value) return null;
  const today = new Date(`${romeToday()}T12:00:00Z`).getTime();
  const target = new Date(`${value}T12:00:00Z`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - today) / 86_400_000);
}

function attentionFor(promotion: Pick<PromotionSummary, "status" | "validUntil">) {
  if (["ARCHIVED", "TRASHED"].includes(promotion.status)) return null;
  const days = daysUntil(promotion.validUntil);
  if (promotion.status === "EXPIRED" || (days !== null && days < 0)) {
    return { level: "expired", label: "SCADUTA · DA DECIDERE", days };
  }
  if (days === null || days > 7) return null;
  if (days <= 1) return { level: "urgent", label: "URGENTE", days };
  if (days <= 3) return { level: "high", label: "PRIORITÀ ALTA", days };
  return { level: "attention", label: "DA ATTENZIONARE", days };
}

function normalizeComparable(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("it-IT")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripPrefix(value: string, prefix: string) {
  const normalizedValue = normalizeComparable(value);
  const normalizedPrefix = normalizeComparable(prefix);
  if (!normalizedValue || !normalizedPrefix || !normalizedValue.startsWith(normalizedPrefix)) return value.trim();
  return value.trim().split(/\s+/).slice(prefix.trim().split(/\s+/).length).join(" ").replace(/^[\s\-–—:|]+/, "").trim();
}

function titlePreview(promotion: Pick<EditablePromotion, "brand" | "model" | "version">) {
  const brand = promotion.brand.trim().toUpperCase();
  const model = promotion.model.trim();
  let version = promotion.version.trim();
  version = stripPrefix(version, `${brand} ${model}`);
  version = stripPrefix(version, model);
  version = stripPrefix(version, brand);
  return [brand, model, version].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function addDays(baseValue: string, amount: number) {
  const today = romeToday();
  const base = baseValue && baseValue > today ? baseValue : today;
  const date = new Date(`${base}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function centsToEuroInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function euroInputToCents(value: string) {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export default function PromotionEditControls() {
  const [promotions, setPromotions] = useState<PromotionSummary[]>([]);
  const [editor, setEditor] = useState<EditablePromotion | null>(null);
  const [monthlyEuro, setMonthlyEuro] = useState("");
  const [depositEuro, setDepositEuro] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [warningsText, setWarningsText] = useState("");
  const [reactivate, setReactivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [error, setError] = useState("");

  const attentionCount = useMemo(
    () => promotions.filter((promotion) => Boolean(attentionFor(promotion))).length,
    [promotions],
  );

  const loadDashboard = async () => {
    const response = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setPromotions(payload.promotions || []);
  };

  const openEditor = async (id: string) => {
    setLoadingEditor(true);
    setError("");
    try {
      const response = await fetch(`/api/promotions/${id}/edit`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Offerta non disponibile.");
      const promotion = payload.promotion as EditablePromotion;
      setEditor(promotion);
      setMonthlyEuro(centsToEuroInput(promotion.monthlyGrossCents));
      setDepositEuro(centsToEuroInput(promotion.depositGrossCents));
      setServicesText(promotion.services.join("\n"));
      setWarningsText(promotion.warnings.join("\n"));
      setReactivate(false);
    } catch (editorError) {
      window.alert(editorError instanceof Error ? editorError.message : "Offerta non disponibile.");
    } finally {
      setLoadingEditor(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    const enhance = () => {
      const footer = document.querySelector<HTMLElement>(".promotion-modal__footer");
      if (footer && footer.dataset.ecEditReady !== "true") {
        const offerText = document.querySelector<HTMLElement>(".promotion-check__title .offer-code")?.textContent || "";
        const offerNumber = offerText.replace(/^Offerta\s+/i, "").trim();
        const promotion = promotions.find((item) => item.offerNumber === offerNumber);
        if (promotion) {
          footer.dataset.ecEditReady = "true";
          const button = document.createElement("button");
          button.type = "button";
          button.className = "ec-promo-edit-trigger";
          button.dataset.ecPromotionEditTrigger = "true";
          button.textContent = loadingEditor ? "Apertura…" : "✎ Modifica offerta";
          button.addEventListener("click", () => void openEditor(promotion.id));
          const managementGroup = footer.querySelector<HTMLElement>('[aria-label="Gestione offerta CEO"]');
          (managementGroup || footer).prepend(button);
        }
      }

      const summary = document.querySelector<HTMLElement>(".ceo-decision-hero__summary");
      const firstMetric = summary?.querySelector<HTMLElement>(".ceo-decision-metric");
      if (firstMetric) {
        firstMetric.dataset.ecAttentionKpi = "true";
        const small = firstMetric.querySelector<HTMLElement>("small");
        const strong = firstMetric.querySelector<HTMLElement>("strong");
        const description = firstMetric.querySelector<HTMLElement>(".ceo-decision-metric__copy > span:last-child");
        if (small) small.textContent = "DA ATTENZIONARE";
        if (strong) strong.textContent = String(attentionCount);
        if (description) description.textContent = attentionCount === 1 ? "promozione richiede attenzione" : "promozioni richiedono attenzione";
      }

      const urgentCard = document.querySelector<HTMLElement>(".ceo-decision-card--urgent");
      if (urgentCard) {
        const value = urgentCard.querySelector<HTMLElement>(".ceo-decision-card__content > strong");
        const title = urgentCard.querySelector<HTMLElement>(".ceo-decision-card__content > h2");
        const copy = urgentCard.querySelector<HTMLElement>(".ceo-decision-card__content > p");
        if (value) value.textContent = String(attentionCount);
        if (title) title.textContent = "Promozioni da attenzionare";
        if (copy) copy.textContent = "Avvisi a 7, 3 e 1 giorno dalla scadenza, più le offerte scadute da decidere.";
      }

      document.querySelectorAll<HTMLElement>(".notification-popover small").forEach((node) => {
        if (/24 ore/i.test(node.textContent || "")) node.textContent = "Alert automatici a 7, 3 e 1 giorno";
      });
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    enhance();
    return () => observer.disconnect();
  }, [promotions, attentionCount, loadingEditor]);

  const closeEditor = () => {
    if (busy) return;
    setEditor(null);
    setError("");
    setReactivate(false);
  };

  const extend = (days: number, shouldReactivate = false) => {
    setEditor((current) => current ? { ...current, validUntil: addDays(current.validUntil, days) } : current);
    if (shouldReactivate) setReactivate(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/promotions/${editor.id}/edit`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brand: editor.brand,
          model: editor.model,
          version: editor.version,
          provider: editor.provider,
          monthlyGrossCents: euroInputToCents(monthlyEuro),
          depositGrossCents: euroInputToCents(depositEuro),
          durationMonths: editor.durationMonths,
          totalKm: editor.totalKm,
          validUntil: editor.validUntil,
          delivery: editor.delivery,
          fuel: editor.fuel,
          transmission: editor.transmission,
          color: editor.color,
          services: servicesText.split(/\n+/).map((item) => item.trim()).filter(Boolean),
          warnings: warningsText.split(/\n+/).map((item) => item.trim()).filter(Boolean),
          syncShopify: true,
          reactivate,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Salvataggio non riuscito.");
      window.alert(
        reactivate
          ? "Promozione aggiornata, riattivata e sincronizzata sullo stesso prodotto Shopify."
          : payload.shopify
            ? "Promozione aggiornata e sincronizzata sullo stesso prodotto Shopify."
            : "Promozione aggiornata.",
      );
      window.location.reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  const attention = editor ? attentionFor(editor) : null;

  return editor ? (
    <div className="ec-promo-editor" role="presentation">
      <button className="ec-promo-editor__scrim" type="button" aria-label="Chiudi modifica offerta" onClick={closeEditor} />
      <aside className="ec-promo-editor__drawer" role="dialog" aria-modal="true" aria-labelledby="ec-promo-editor-title">
        <header className="ec-promo-editor__header">
          <div>
            <span>ECCOMI NOLEGGIO · SOLO CEO</span>
            <h2 id="ec-promo-editor-title">Modifica offerta</h2>
            <p>Correggi la scheda e aggiorna lo stesso prodotto Shopify senza crearne uno nuovo.</p>
          </div>
          <button type="button" onClick={closeEditor} aria-label="Chiudi">×</button>
        </header>

        <form onSubmit={save}>
          <div className="ec-promo-editor__body">
            <section className="ec-promo-editor__summary">
              <div>
                <small>OFFERTA {editor.offerNumber}</small>
                <strong>{titlePreview(editor) || "Titolo da completare"}</strong>
                <span>Anteprima del titolo pubblico. I duplicati tipo “3008 3008” vengono rimossi automaticamente.</span>
              </div>
              <em className={`ec-promo-attention ec-promo-attention--${attention?.level || "ok"}`}>
                {attention?.label || "SOTTO CONTROLLO"}
              </em>
            </section>

            <section className="ec-promo-editor__section">
              <div className="ec-promo-editor__section-title"><span>01</span><div><strong>Veicolo</strong><small>Dati che compongono la scheda pubblica</small></div></div>
              <div className="ec-promo-editor__grid">
                <label><span>Marca</span><input value={editor.brand} onChange={(event) => setEditor({ ...editor, brand: event.target.value })} required /></label>
                <label><span>Modello</span><input value={editor.model} onChange={(event) => setEditor({ ...editor, model: event.target.value })} required /></label>
                <label className="ec-promo-editor__wide"><span>Versione</span><input value={editor.version} onChange={(event) => setEditor({ ...editor, version: event.target.value })} /></label>
                <label><span>Alimentazione</span><input value={editor.fuel} onChange={(event) => setEditor({ ...editor, fuel: event.target.value })} /></label>
                <label><span>Cambio</span><input value={editor.transmission} onChange={(event) => setEditor({ ...editor, transmission: event.target.value })} /></label>
                <label><span>Colore</span><input value={editor.color} onChange={(event) => setEditor({ ...editor, color: event.target.value })} /></label>
                <label><span>Noleggiatore</span><input value={editor.provider} onChange={(event) => setEditor({ ...editor, provider: event.target.value })} required /></label>
              </div>
            </section>

            <section className="ec-promo-editor__section">
              <div className="ec-promo-editor__section-title"><span>02</span><div><strong>Condizioni economiche</strong><small>Canone, anticipo, durata e chilometri</small></div></div>
              <div className="ec-promo-editor__grid ec-promo-editor__grid--four">
                <label><span>Canone €/mese</span><input type="number" min="0.01" step="0.01" value={monthlyEuro} onChange={(event) => setMonthlyEuro(event.target.value)} required /></label>
                <label><span>Anticipo €</span><input type="number" min="0" step="0.01" value={depositEuro} onChange={(event) => setDepositEuro(event.target.value)} required /></label>
                <label><span>Durata mesi</span><input type="number" min="1" step="1" value={editor.durationMonths} onChange={(event) => setEditor({ ...editor, durationMonths: Number(event.target.value) })} required /></label>
                <label><span>Km totali</span><input type="number" min="1" step="1000" value={editor.totalKm} onChange={(event) => setEditor({ ...editor, totalKm: Number(event.target.value) })} required /></label>
                <label className="ec-promo-editor__wide"><span>Consegna</span><input value={editor.delivery} onChange={(event) => setEditor({ ...editor, delivery: event.target.value })} /></label>
              </div>
            </section>

            <section className="ec-promo-editor__section ec-promo-editor__section--expiry">
              <div className="ec-promo-editor__section-title"><span>03</span><div><strong>Durata promozione</strong><small>Allunga o riattiva senza duplicare il prodotto</small></div></div>
              <div className="ec-promo-editor__expiry-row">
                <label><span>Scadenza</span><input type="date" value={editor.validUntil} onChange={(event) => setEditor({ ...editor, validUntil: event.target.value })} required /></label>
                <div className="ec-promo-editor__quick-days" aria-label="Prolunga promozione">
                  <button type="button" onClick={() => extend(7)}>+7 giorni</button>
                  <button type="button" onClick={() => extend(15)}>+15 giorni</button>
                  <button type="button" onClick={() => extend(30)}>+30 giorni</button>
                  {editor.status === "EXPIRED" ? <button type="button" className="ec-promo-editor__reactivate" onClick={() => extend(30, true)}>Riattiva +30</button> : null}
                </div>
              </div>
              {editor.status === "EXPIRED" ? (
                <label className="ec-promo-editor__check"><input type="checkbox" checked={reactivate} onChange={(event) => setReactivate(event.target.checked)} /><span>Riattiva la promozione e rimetti online lo stesso prodotto Shopify</span></label>
              ) : null}
            </section>

            <section className="ec-promo-editor__section">
              <div className="ec-promo-editor__section-title"><span>04</span><div><strong>Contenuti</strong><small>Un elemento per riga</small></div></div>
              <div className="ec-promo-editor__grid">
                <label className="ec-promo-editor__wide"><span>Servizi inclusi</span><textarea rows={6} value={servicesText} onChange={(event) => setServicesText(event.target.value)} /></label>
                <label className="ec-promo-editor__wide"><span>Avvertenze / condizioni</span><textarea rows={5} value={warningsText} onChange={(event) => setWarningsText(event.target.value)} /></label>
              </div>
            </section>

            {error ? <div className="ec-promo-editor__error">{error}</div> : null}
          </div>

          <footer className="ec-promo-editor__footer">
            <span>{editor.shopifyProductId ? "Salva = aggiorna lo stesso prodotto Shopify" : "Prodotto Shopify non ancora creato"}</span>
            <div>
              <button type="button" className="ec-promo-editor__cancel" onClick={closeEditor} disabled={busy}>Annulla</button>
              <button type="submit" className="ec-promo-editor__save" disabled={busy}>{busy ? "Salvataggio…" : reactivate ? "Salva e riattiva" : "Salva modifiche"}</button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  ) : null;
}
