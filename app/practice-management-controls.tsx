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
    createdAt: string;
    updatedAt: string;
    assignedAt: string | null;
    completedAt: string | null;
    sentToPartnerAt: string | null;
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

const euro = (cents: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const statusLabels: Record<string, string> = {
  NEW: "Richiesta ricevuta",
  ECCOMI_REVIEW: "Presa in carico da ECCOMI",
  NEEDS_INFO: "In attesa di integrazione",
  SENT_TO_PARTNER: "Inviata al partner",
  PARTNER_REVIEW: "Presa in carico dal partner",
  QUOTE: "Preventivo predisposto",
  CONTRACT: "Contratto acquisito",
  DELIVERED: "Veicolo consegnato",
  ARCHIVED: "Pratica archiviata",
};

const workflowSteps = [
  "Richiesta",
  "ECCOMI",
  "Partner",
  "Preventivo",
  "Contratto",
  "Consegna",
  "Chiusa",
];

const workflowIndex: Record<string, number> = {
  NEW: 0,
  ECCOMI_REVIEW: 1,
  NEEDS_INFO: 1,
  SENT_TO_PARTNER: 2,
  PARTNER_REVIEW: 2,
  QUOTE: 3,
  CONTRACT: 4,
  DELIVERED: 5,
  ARCHIVED: 6,
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
};

const elapsedDays = (value?: string | null) => {
  if (!value) return 0;

  const start = new Date(value).getTime();
  if (Number.isNaN(start)) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - start) / 86400000),
  );
};

function element<K extends keyof HTMLElementTagNameMap>(name: K, className?: string, text?: string) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export default function PracticeManagementControls() {
  useEffect(() => {
    const styleId = "eccomi-practice-workflow-styles";

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .practice-operational-header {
          display: grid;
          gap: 16px;
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid #d9e7f4;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            rgba(15, 116, 190, 0.09),
            rgba(255, 255, 255, 0.92)
          );
        }

        .practice-operational-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .practice-status-badge,
        .practice-sla {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }

        .practice-status-badge {
          color: #075a9e;
          background: #e6f3ff;
          border: 1px solid #b7d9f6;
        }

        .practice-status-badge[data-status="NEW"] {
          color: #765c00;
          background: #fff8d9;
          border-color: #ead77d;
        }

        .practice-status-badge[data-status="NEEDS_INFO"] {
          color: #9b430c;
          background: #fff0e5;
          border-color: #f0c09c;
        }

        .practice-status-badge[data-status="DELIVERED"],
        .practice-status-badge[data-status="ARCHIVED"] {
          color: #146c37;
          background: #e9f8ee;
          border-color: #b8e2c5;
        }

        .practice-sla--green {
          color: #146c37;
          background: #e9f8ee;
        }

        .practice-sla--yellow {
          color: #765c00;
          background: #fff8d9;
        }

        .practice-sla--red {
          color: #a11c1c;
          background: #feeaea;
        }

        .practice-operational-meta {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
        }

        .practice-operational-meta > div {
          min-width: 0;
          padding: 10px;
          border: 1px solid #dce8f3;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.88);
        }

        .practice-operational-meta small {
          display: block;
          margin-bottom: 4px;
          color: #6a7b8e;
          font-size: 10px;
        }

        .practice-operational-meta strong {
          display: block;
          color: #133655;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .practice-progress {
          display: grid;
          grid-template-columns: repeat(7, minmax(70px, 1fr));
          overflow-x: auto;
          padding: 8px 0 3px;
        }

        .practice-progress-step {
          position: relative;
          display: grid;
          justify-items: center;
          gap: 7px;
          min-width: 70px;
          text-align: center;
        }

        .practice-progress-step::before {
          content: "";
          position: absolute;
          top: 14px;
          right: 50%;
          width: 100%;
          height: 3px;
          background: #d7e1eb;
        }

        .practice-progress-step:first-child::before {
          display: none;
        }

        .practice-progress-step.is-complete::before,
        .practice-progress-step.is-current::before {
          background: #1681c7;
        }

        .practice-progress-dot {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 3px solid #d7e1eb;
          border-radius: 50%;
          background: #fff;
          color: #8190a0;
          font-size: 11px;
          font-weight: 900;
        }

        .practice-progress-step.is-complete
        .practice-progress-dot {
          color: #fff;
          background: #188653;
          border-color: #188653;
        }

        .practice-progress-step.is-current
        .practice-progress-dot {
          color: #0871b5;
          border-color: #0871b5;
          box-shadow: 0 0 0 5px rgba(8, 113, 181, 0.12);
        }

        .practice-progress-label {
          color: #6d7d8f;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .practice-progress-step.is-complete
        .practice-progress-label,
        .practice-progress-step.is-current
        .practice-progress-label {
          color: #143d60;
        }

        @media (max-width: 850px) {
          .practice-operational-meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .practice-action-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .practice-action-grid .button {
          min-height: 44px;
          justify-content: center;
        }

        .practice-action-grid .practice-main-action {
          grid-column: 1 / -1;
          width: 100%;
          min-height: 52px;
          font-size: 14px;
          font-weight: 900;
        }

        .practice-note-area {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: end;
          margin-top: 10px;
        }

        .practice-note-area textarea {
          width: 100%;
          min-height: 82px;
          resize: vertical;
        }

        .practice-note-area .button {
          min-height: 44px;
        }

        .practice-timeline {
          position: relative;
          display: grid;
          gap: 0;
          padding-left: 24px;
        }

        .practice-timeline::before {
          content: "";
          position: absolute;
          left: 8px;
          top: 12px;
          bottom: 12px;
          width: 2px;
          background: #d8e5f1;
        }

        .practice-timeline > div {
          position: relative;
          display: grid;
          gap: 5px;
          margin-bottom: 10px;
          padding: 12px 14px;
          border: 1px solid #dde8f2;
          border-radius: 12px;
          background: #ffffff;
        }

        .practice-timeline > div::before {
          content: "";
          position: absolute;
          left: -23px;
          top: 16px;
          width: 12px;
          height: 12px;
          border: 3px solid #eef6fd;
          border-radius: 50%;
          background: #1584d2;
          box-sizing: border-box;
        }

        .practice-timeline strong {
          color: #102f50;
          font-size: 13px;
        }

        .practice-timeline small {
          color: #718196;
          font-size: 10px;
        }

        .practice-timeline p {
          margin: 3px 0 0;
          color: #344b63;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        @media (max-width: 540px) {
          .practice-operational-meta {
            grid-template-columns: 1fr;
          }

          .practice-operational-header {
            padding: 13px;
          }

          .practice-action-grid {
            grid-template-columns: 1fr;
          }

          .practice-action-grid .practice-main-action {
            grid-column: auto;
          }

          .practice-note-area {
            grid-template-columns: 1fr;
          }
        }
      `;

      document.head.append(style);
    }

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

    const postStatus = async (
      practiceId: string,
      status: string,
      note = "",
    ) => {
      const response = await fetch(
        `/api/practices/${encodeURIComponent(practiceId)}/action`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status, note }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || "Aggiornamento non riuscito.",
        );
      }

      refresh();
    };

    const addPracticeNote = async (
      practiceId: string,
      note: string,
    ) => {
      const response = await fetch(
        `/api/practices/${encodeURIComponent(practiceId)}/action`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || "Salvataggio nota non riuscito.",
        );
      }

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
      heading.append(
        element("span", "section-kicker", "PRATICA NOLEGGIO"),
        element("h2", "", practice.id),
        element(
          "p",
          "",
          `${practice.firstName} ${practice.lastName} · ${
            statusLabels[practice.status] || practice.status
          }`,
        ),
      );
      const closeButton = element("button", "practice-drawer__close", "✕");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Chiudi pratica");
      closeButton.addEventListener("click", close);
      header.append(heading, closeButton);

      const content = element("div", "practice-drawer__content");

      const operationalHeader = element(
        "section",
        "practice-operational-header",
      );

      const statusRow = element(
        "div",
        "practice-operational-status",
      );

      const statusBadge = element(
        "strong",
        "practice-status-badge",
        statusLabels[practice.status] || practice.status,
      );

      statusBadge.dataset.status = practice.status;

      const daysOpen = elapsedDays(practice.createdAt);

      let slaText = "SLA regolare";
      let slaClass = "practice-sla practice-sla--green";

      if (
        practice.status === "DELIVERED"
        || practice.status === "ARCHIVED"
      ) {
        slaText = "Pratica completata";
      } else if (daysOpen >= 4) {
        slaText = `SLA critico · ${daysOpen} giorni`;
        slaClass = "practice-sla practice-sla--red";
      } else if (daysOpen >= 2) {
        slaText = `SLA attenzione · ${daysOpen} giorni`;
        slaClass = "practice-sla practice-sla--yellow";
      } else if (daysOpen === 0) {
        slaText = "Aperta oggi";
      } else {
        slaText = "SLA regolare · 1 giorno";
      }

      statusRow.append(
        statusBadge,
        element("span", slaClass, slaText),
      );

      const metaGrid = element(
        "div",
        "practice-operational-meta",
      );

      [
        [
          "Partner",
          practice.partner.name
          || practice.partner.legalName
          || "—",
        ],
        ["Apertura", formatDateTime(practice.createdAt)],
        [
          "Ultimo aggiornamento",
          formatDateTime(practice.updatedAt),
        ],
        [
          "Tempo trascorso",
          daysOpen === 0
            ? "Oggi"
            : `${daysOpen} ${
                daysOpen === 1 ? "giorno" : "giorni"
              }`,
        ],
      ].forEach(([label, value]) => {
        const item = element("div");
        item.append(
          element("small", "", label),
          element("strong", "", value),
        );
        metaGrid.append(item);
      });

      const progress = element(
        "div",
        "practice-progress",
      );

      const currentIndex =
        workflowIndex[practice.status] ?? 0;

      workflowSteps.forEach((label, index) => {
        const step = element(
          "div",
          "practice-progress-step",
        );

        if (index < currentIndex) {
          step.classList.add("is-complete");
        } else if (index === currentIndex) {
          step.classList.add("is-current");
        }

        step.append(
          element(
            "span",
            "practice-progress-dot",
            index < currentIndex
              ? "✓"
              : String(index + 1),
          ),
          element(
            "small",
            "practice-progress-label",
            label,
          ),
        );

        progress.append(step);
      });

      operationalHeader.append(
        statusRow,
        metaGrid,
        progress,
      );

      content.append(operationalHeader);

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
      actions.append(element("h3", "", "Gestione operativa"));

      const currentStatus = element(
        "div",
        "practice-forward-feedback",
        `Stato attuale: ${statusLabels[practice.status] || practice.status}`,
      );

      const transitions: Record<
        string,
        Array<[string, string, boolean]>
      > = {
        NEW: [
          ["Prendi in carico ECCOMI", "ECCOMI_REVIEW", true],
          ["Richiedi integrazione", "NEEDS_INFO", false],
          ["Archivia", "ARCHIVED", false],
        ],
        ECCOMI_REVIEW: [
          ["Richiedi integrazione", "NEEDS_INFO", false],
          ["Archivia", "ARCHIVED", false],
        ],
        NEEDS_INFO: [
          ["Riprendi lavorazione", "ECCOMI_REVIEW", true],
          ["Archivia", "ARCHIVED", false],
        ],
        SENT_TO_PARTNER: [
          ["Prendi in carico partner", "PARTNER_REVIEW", true],
          ["Richiedi integrazione", "NEEDS_INFO", false],
          ["Archivia", "ARCHIVED", false],
        ],
        PARTNER_REVIEW: [
          ["Preventivo predisposto", "QUOTE", true],
          ["Richiedi integrazione", "NEEDS_INFO", false],
          ["Archivia", "ARCHIVED", false],
        ],
        QUOTE: [
          ["Contratto acquisito", "CONTRACT", true],
          ["Richiedi integrazione", "NEEDS_INFO", false],
          ["Archivia", "ARCHIVED", false],
        ],
        CONTRACT: [
          ["Veicolo consegnato", "DELIVERED", true],
          ["Archivia", "ARCHIVED", false],
        ],
        DELIVERED: [
          ["Chiudi e archivia", "ARCHIVED", true],
        ],
        ARCHIVED: [],
      };

      const buttons = element("div", "practice-action-grid");

      const availableActions = transitions[practice.status] || [];

      availableActions.forEach(([label, status, primary]) => {
        if (
          payload.actor.role === "PARTNER"
          && ![
            "PARTNER_REVIEW",
            "NEEDS_INFO",
            "QUOTE",
            "CONTRACT",
            "DELIVERED",
          ].includes(status)
        ) {
          return;
        }

        const action = actionButton(
          primary ? `PROSEGUI: ${label}` : label,
          async () => {
            const requiresNote = status === "NEEDS_INFO";

            const note = window.prompt(
              requiresNote
                ? "Indica cosa deve integrare il cliente:"
                : "Aggiungi una nota a questo avanzamento (facoltativa):",
              "",
            );

            if (note === null) return;

            try {
              await postStatus(
                practice.id,
                status,
                note.trim(),
              );
            } catch (error) {
              window.alert(
                error instanceof Error
                  ? error.message
                  : "Aggiornamento non riuscito.",
              );
            }
          },
          primary,
        );

        if (primary) {
          action.classList.add("practice-main-action");
        }

        buttons.append(action);
      });

      if (!availableActions.length) {
        buttons.append(
          element(
            "div",
            "practice-forward-feedback",
            "Nessuna ulteriore azione disponibile.",
          ),
        );
      }

      const noteTitle = element(
        "h3",
        "",
        "Nota operativa",
      );

      const noteField = element(
        "textarea",
      ) as HTMLTextAreaElement;

      noteField.placeholder =
        "Scrivi una nota interna sulla pratica…";
      noteField.maxLength = 2000;

      const noteFeedback = element(
        "div",
        "practice-forward-feedback",
      );

      const noteButton = actionButton(
        "Salva nota",
        async () => {
          const note = noteField.value.trim();

          if (!note) {
            noteFeedback.textContent =
              "Inserisci prima una nota.";
            return;
          }

          noteButton.setAttribute("disabled", "true");
          noteFeedback.textContent =
            "Salvataggio in corso…";

          try {
            await addPracticeNote(practice.id, note);
          } catch (error) {
            noteFeedback.textContent =
              error instanceof Error
                ? error.message
                : "Salvataggio non riuscito.";

            noteButton.removeAttribute("disabled");
          }
        },
        false,
      );

      const noteArea = element(
        "div",
        "practice-note-area",
      );

      noteArea.append(noteField, noteButton);

      actions.append(
        currentStatus,
        buttons,
        noteTitle,
        noteArea,
        noteFeedback,
      );

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
      const timelineLabels: Record<string, string> = {
        PRACTICE_CREATED_WITH_DOCUMENTS:
          "Richiesta ricevuta con documenti",
        PRACTICE_NOTE:
          "Nota operativa",
        PRACTICE_STATUS_ECCOMI_REVIEW:
          "Presa in carico da ECCOMI",
        PRACTICE_STATUS_NEEDS_INFO:
          "Integrazione richiesta",
        PRACTICE_STATUS_SENT_TO_PARTNER:
          "Pratica inviata al partner",
        PRACTICE_STATUS_PARTNER_REVIEW:
          "Presa in carico dal partner",
        PRACTICE_STATUS_QUOTE:
          "Preventivo predisposto",
        PRACTICE_STATUS_CONTRACT:
          "Contratto acquisito",
        PRACTICE_STATUS_DELIVERED:
          "Veicolo consegnato",
        PRACTICE_STATUS_ARCHIVED:
          "Pratica archiviata",
      };

      practice.timeline.forEach((event) => {
        const item = element("div");

        let details: {
          note?: string;
          from?: string;
          to?: string;
        } = {};

        try {
          details = JSON.parse(event.payloadJson || "{}");
        } catch {
          details = {};
        }

        const title =
          timelineLabels[event.action]
          || event.action.replaceAll("_", " ");

        const dateText = new Intl.DateTimeFormat(
          "it-IT",
          {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "Europe/Rome",
          },
        ).format(new Date(event.createdAt));

        item.append(
          element("strong", "", title),
          element(
            "small",
            "",
            `${event.actorEmail} · ${dateText}`,
          ),
        );

        if (details.note) {
          item.append(
            element("p", "", details.note),
          );
        }

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
