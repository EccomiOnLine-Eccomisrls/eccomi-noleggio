"use client";

import { useEffect } from "react";

type Lead = {
  id: string;
  partnerEmail?: string | null;
};

type PracticeDocument = {
  id: string;
  documentType: string;
  originalName: string;
  sizeBytes: number;
};

type PracticePayload = {
  practice: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    province: string | null;
    customerType: string | null;
    businessName: string | null;
    accountHolder: string | null;
    iban: string | null;
    ibanLast4: string | null;
    status: string;
    documentStatus: string;
    promotion: {
      brand: string;
      model: string;
      version: string;
      offerNumber: string;
      provider: string;
      monthlyGrossCents: number;
      depositGrossCents: number;
      durationMonths: number;
      totalKm: number;
    };
    partner: {
      id: string;
      name: string;
      legalName: string;
      contactName: string | null;
      contactEmail: string | null;
      additionalEmails: string[];
    };
    documents: PracticeDocument[];
    timeline: Array<{ id: string; action: string; actorEmail: string; payloadJson: string; createdAt: string }>;
  };
  actor: { role: "CEO" | "PARTNER" };
};

const euro = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

function element<K extends keyof HTMLElementTagNameMap>(name: K, className?: string, text?: string) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export default function PracticeManagementControls() {
  useEffect(() => {
    let leads: Lead[] = [];
    let drawer: HTMLElement | null = null;
    let overlay: HTMLElement | null = null;
    let loading = false;

    const close = () => {
      if (drawer) drawer.style.transform = "translateX(105%)";
      if (overlay) {
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
      }
    };

    const refresh = () => window.location.reload();

    const actionButton = (label: string, handler: () => void, primary = false) => {
      const button = element("button", primary ? "button button--primary" : "button button--secondary", label);
      button.type = "button";
      button.addEventListener("click", handler);
      return button;
    };

    const postStatus = async (practiceId: string, status: string) => {
      const response = await fetch(`/api/practices/${encodeURIComponent(practiceId)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Aggiornamento non riuscito.");
      refresh();
    };

    const openPractice = async (practiceId: string) => {
      if (!drawer || !overlay) return;
      overlay.style.opacity = "1";
      overlay.style.pointerEvents = "auto";
      drawer.style.transform = "translateX(0)";
      drawer.replaceChildren(element("div", "practice-drawer-loading", "Caricamento pratica…"));
      try {
        const response = await fetch(`/api/practices/${encodeURIComponent(practiceId)}`, { cache: "no-store", credentials: "same-origin" });
        const payload = await response.json() as PracticePayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Pratica non disponibile.");
        renderPractice(payload);
      } catch (error) {
        drawer.replaceChildren(element("div", "practice-drawer-error", error instanceof Error ? error.message : "Pratica non disponibile."));
      }
    };

    const renderPractice = (payload: PracticePayload) => {
      if (!drawer) return;
      const practice = payload.practice;
      const header = element("header", "practice-drawer__header");
      const heading = element("div");
      heading.append(element("span", "section-kicker", "PRATICA NOLEGGIO"), element("h2", "", practice.id), element("p", "", `${practice.firstName} ${practice.lastName} · ${practice.status}`));
      const closeButton = element("button", "practice-drawer__close", "✕");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Chiudi pratica");
      closeButton.addEventListener("click", close);
      header.append(heading, closeButton);

      const content = element("div", "practice-drawer__content");
      const summary = element("section", "practice-block");
      summary.append(element("h3", "", "Cliente e richiesta"));
      const summaryGrid = element("div", "practice-summary-grid");
      [
        ["Cliente", `${practice.firstName} ${practice.lastName}`],
        ["Profilo", practice.customerType || "—"],
        ["Email", practice.email],
        ["Cellulare", practice.phone],
        ["Provincia", practice.province || "—"],
        ["Attività", practice.businessName || "—"],
        ["Intestatario conto", practice.accountHolder || "—"],
        ["IBAN", practice.iban || `•••• ${practice.ibanLast4 || ""}`],
      ].forEach(([label, value]) => {
        const item = element("div");
        item.append(element("small", "", label), element("strong", "", value));
        summaryGrid.append(item);
      });
      summary.append(summaryGrid);

      const offer = element("section", "practice-block");
      offer.append(element("h3", "", "Offerta collegata"));
      const offerTitle = element("strong", "practice-offer-title", `${practice.promotion.brand} ${practice.promotion.model}`);
      const offerText = element("p", "", `${practice.promotion.version} · Offerta ${practice.promotion.offerNumber} · ${practice.promotion.provider}`);
      const offerTerms = element("p", "practice-offer-terms", `${euro(practice.promotion.monthlyGrossCents)}/mese · anticipo ${euro(practice.promotion.depositGrossCents)} · ${practice.promotion.durationMonths} mesi · ${practice.promotion.totalKm.toLocaleString("it-IT")} km`);
      offer.append(offerTitle, offerText, offerTerms);

      const documents = element("section", "practice-block");
      documents.append(element("h3", "", `Documenti (${practice.documents.length})`));
      const documentList = element("div", "practice-document-list");
      practice.documents.forEach((document) => {
        const row = element("div");
        const copy = element("div");
        copy.append(element("strong", "", document.originalName), element("small", "", `${document.documentType} · ${(document.sizeBytes / 1024 / 1024).toFixed(2)} MB`));
        const link = element("a", "button button--secondary", "Apri");
        link.href = `/api/practices/${encodeURIComponent(practice.id)}/documents/${encodeURIComponent(document.id)}`;
        link.target = "_blank";
        link.rel = "noreferrer";
        row.append(copy, link);
        documentList.append(row);
      });
      documents.append(documentList);

      const actions = element("section", "practice-block");
      actions.append(element("h3", "", "Pulsantiera back office"));
      const buttons = element("div", "practice-action-grid");
      const statusActions: Array<[string, string]> = [
        ["Prendi in carico", "ECCOMI_REVIEW"],
        ["Richiedi integrazione", "NEEDS_INFO"],
        ["Segna preventivo", "QUOTE"],
        ["Segna contratto", "CONTRACT"],
        ["Segna consegnata", "DELIVERED"],
        ["Archivia", "ARCHIVED"],
      ];
      statusActions.forEach(([label, status]) => buttons.append(actionButton(label, () => void postStatus(practice.id, status), status === "ECCOMI_REVIEW")));
      actions.append(buttons);

      if (payload.actor.role === "CEO") {
        const forwarding = element("section", "practice-block practice-forwarding");
        forwarding.append(element("h3", "", "Inoltra al partner da ECCOMI"));
        const email = element("input") as HTMLInputElement;
        email.type = "email";
        email.placeholder = "Email partner";
        email.value = practice.partner.contactEmail || practice.partner.additionalEmails[0] || "";
        const subject = element("input") as HTMLInputElement;
        subject.value = `Nuova pratica ECCOMI NOLEGGIO ${practice.id}`;
        const message = element("textarea") as HTMLTextAreaElement;
        message.value = `È disponibile una nuova pratica completa per ${practice.promotion.brand} ${practice.promotion.model}.`;
        const saveRow = element("label", "practice-save-email");
        const save = element("input") as HTMLInputElement;
        save.type = "checkbox";
        save.checked = true;
        saveRow.append(save, document.createTextNode(" Salva l'indirizzo nella rubrica del partner"));
        const feedback = element("div", "practice-forward-feedback");
        const send = actionButton("Invia al partner", async () => {
          send.setAttribute("disabled", "true");
          feedback.textContent = "Invio in corso…";
          try {
            const response = await fetch(`/api/practices/${encodeURIComponent(practice.id)}/send-to-partner`, {
              method: "POST",
              credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ recipientEmail: email.value, subject: subject.value, message: message.value, saveRecipient: save.checked }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Invio non riuscito.");
            feedback.textContent = `Inviata a ${result.recipientEmail}.`;
            window.setTimeout(refresh, 900);
          } catch (error) {
            feedback.textContent = error instanceof Error ? error.message : "Invio non riuscito.";
            send.removeAttribute("disabled");
          }
        }, true);
        forwarding.append(email, subject, message, saveRow, send, feedback);
        content.append(summary, offer, documents, actions, forwarding);
      } else {
        content.append(summary, offer, documents, actions);
      }

      const timeline = element("section", "practice-block");
      timeline.append(element("h3", "", "Timeline"));
      const timelineList = element("div", "practice-timeline");
      practice.timeline.forEach((event) => {
        const item = element("div");
        item.append(element("strong", "", event.action.replaceAll("_", " ")), element("small", "", `${event.actorEmail} · ${new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(event.createdAt))}`));
        timelineList.append(item);
      });
      timeline.append(timelineList);
      content.append(timeline);
      drawer.replaceChildren(header, content);
    };

    const prepareShell = () => {
      if (drawer) return;
      overlay = element("div", "practice-drawer-overlay");
      overlay.addEventListener("click", close);
      drawer = element("aside", "practice-drawer");
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-label", "Gestione pratica noleggio");
      document.body.append(overlay, drawer);
    };

    const load = async () => {
      if (loading || leads.length) return;
      loading = true;
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
        const payload = await response.json();
        if (response.ok) leads = payload.leads || [];
      } finally {
        loading = false;
      }
    };

    const enhanceRows = async () => {
      prepareShell();
      await load();
      document.querySelectorAll<HTMLElement>(".lead-register__row").forEach((row) => {
        if (row.dataset.practiceActionReady === "true") return;
        const code = row.querySelector("strong")?.textContent?.trim();
        if (!code || !leads.some((lead) => lead.id === code)) return;
        row.dataset.practiceActionReady = "true";
        const button = actionButton("Apri pratica", () => void openPractice(code), true);
        button.classList.add("practice-open-button");
        row.append(button);
      });
    };

    const observer = new MutationObserver(() => void enhanceRows());
    observer.observe(document.body, { childList: true, subtree: true });
    void enhanceRows();
    return () => {
      observer.disconnect();
      overlay?.remove();
      drawer?.remove();
    };
  }, []);

  return null;
}
