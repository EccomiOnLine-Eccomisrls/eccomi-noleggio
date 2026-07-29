"use client";

import { useEffect } from "react";

type DashboardPromotion = {
  id: string;
  offerNumber: string;
  brand?: string;
  model?: string;
  rental?: string;
  status: string;
  statusLabel?: string;
  validUntil?: string;
  expires?: string;
  days?: string;
  shopifyProductId: string | null;
};

type DashboardEvent = {
  id: string;
  eventType: string;
  title: string;
  createdAt: string;
};

const buttonStyle = (danger = false) => ({
  minHeight: "42px",
  borderRadius: "10px",
  border: danger ? "1px solid #fecaca" : "1px solid #dce6f1",
  background: danger ? "#fff1f2" : "#ffffff",
  color: danger ? "#b42318" : "#073f73",
  padding: "10px 14px",
  fontWeight: "800",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
});

function eventPresentation(event: DashboardEvent) {
  const value = `${event.eventType} ${event.title}`.toLowerCase();
  if (/lead|pratica/.test(value)) return { icon: "👤", label: event.title };
  if (/publish|pubblic|online/.test(value)) return { icon: "✅", label: event.title.replace(/Shopify/gi, "Eccomi OnLine") };
  if (/cover|image|foto/.test(value)) return { icon: "🖼️", label: "Immagine dell’offerta preparata" };
  if (/extract|ai|elabor/.test(value)) return { icon: "🤖", label: "Quotazione elaborata dall’AI" };
  if (/draft|bozza/.test(value)) return { icon: "🛒", label: event.title.replace(/Shopify/gi, "Eccomi OnLine") };
  if (/archive|cestino|delete/.test(value)) return { icon: "🗂️", label: event.title };
  if (/quote|quotazione|promotion/.test(value)) return { icon: "📄", label: event.title.replace(/Shopify/gi, "Eccomi OnLine") };
  return { icon: "✓", label: event.title.replace(/Shopify/gi, "Eccomi OnLine") };
}

export default function PromotionManagementControls() {
  useEffect(() => {
    let promotions: DashboardPromotion[] = [];
    let hubEvents: DashboardEvent[] = [];
    let loading = false;

    const loadDashboard = async () => {
      if (loading || promotions.length) return;
      loading = true;
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
        const payload = await response.json();
        if (response.ok) {
          promotions = payload.promotions || [];
          hubEvents = payload.hubEvents || [];
        }
      } finally {
        loading = false;
      }
    };

    const execute = async (promotion: DashboardPromotion, action: "REFRESH" | "SUSPEND" | "ARCHIVE" | "DELETE") => {
      if (action === "DELETE") {
        if (!window.confirm("Spostare questa promozione nel cestino? Verrà rimossa dalla dashboard e archiviata su Shopify, ma potrà essere ripristinata.")) return;
      } else {
        const labels = { REFRESH: "aggiornare Shopify", SUSPEND: "sospendere l'offerta", ARCHIVE: "archiviare l'offerta" };
        if (!window.confirm(`Confermi di voler ${labels[action]}?`)) return;
      }

      const url = action === "REFRESH"
        ? `/api/promotions/${promotion.id}/refresh-shopify`
        : `/api/promotions/${promotion.id}/manage`;
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: action === "REFRESH" ? undefined : JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(payload.error || "Operazione non riuscita.");
        return;
      }
      window.alert(action === "REFRESH" ? "Offerta aggiornata su Shopify." : action === "DELETE" ? "Offerta spostata nel cestino." : action === "SUSPEND" ? "Offerta sospesa." : "Offerta archiviata.");
      window.location.reload();
    };

    const injectSettingsDrawer = () => {
      if (document.body.dataset.settingsDrawerReady === "true") return;
      const verticalStatus = document.querySelector<HTMLElement>(".control-banner");
      const shopifyStatus = document.querySelector<HTMLElement>(".shopify-connection-banner:not(.ai-connection-banner)");
      const aiStatus = document.querySelector<HTMLElement>(".ai-connection-banner");
      const nav = document.querySelector<HTMLElement>(".side-nav");
      if (!verticalStatus || !shopifyStatus || !aiStatus || !nav) return;

      document.body.dataset.settingsDrawerReady = "true";
      const settingsButton = document.createElement("button");
      settingsButton.type = "button";
      settingsButton.className = "side-nav__item";
      settingsButton.setAttribute("aria-label", "Apri impostazioni operative");
      settingsButton.innerHTML = '<span style="font-size:18px">⚙️</span><span>Impostazioni</span>';

      const overlay = document.createElement("div");
      overlay.setAttribute("aria-hidden", "true");
      Object.assign(overlay.style, { position: "fixed", inset: "0", zIndex: "9998", background: "rgba(8, 24, 40, .42)", opacity: "0", pointerEvents: "none", transition: "opacity .2s ease" });

      const drawer = document.createElement("aside");
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-label", "Impostazioni operative");
      Object.assign(drawer.style, { position: "fixed", top: "0", right: "0", bottom: "0", zIndex: "9999", width: "min(560px, 94vw)", background: "#f4f7fb", boxShadow: "-18px 0 50px rgba(8, 35, 62, .22)", transform: "translateX(105%)", transition: "transform .24s ease", overflowY: "auto", padding: "24px" });

      const header = document.createElement("div");
      Object.assign(header.style, { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" });
      header.innerHTML = '<div><div style="font-size:11px;font-weight:900;letter-spacing:.12em;color:#0c5597">AREA OPERATIVA</div><h2 style="margin:5px 0 0;color:#102033;font-size:27px">Impostazioni</h2><p style="margin:6px 0 0;color:#677587">Stato del verticale e collegamenti tecnici.</p></div>';
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.textContent = "✕";
      closeButton.setAttribute("aria-label", "Chiudi impostazioni");
      Object.assign(closeButton.style, { width: "42px", height: "42px", borderRadius: "12px", border: "1px solid #dce6f1", background: "#ffffff", color: "#102033", fontSize: "18px", cursor: "pointer" });
      header.appendChild(closeButton);
      drawer.appendChild(header);

      const content = document.createElement("div");
      Object.assign(content.style, { display: "grid", gap: "16px" });
      [verticalStatus, shopifyStatus, aiStatus].forEach((section) => {
        const clone = section.cloneNode(true) as HTMLElement;
        clone.style.margin = "0";
        clone.style.width = "100%";
        content.appendChild(clone);
      });
      drawer.appendChild(content);

      const openDrawer = () => { overlay.style.opacity = "1"; overlay.style.pointerEvents = "auto"; overlay.setAttribute("aria-hidden", "false"); drawer.style.transform = "translateX(0)"; };
      const closeDrawer = () => { overlay.style.opacity = "0"; overlay.style.pointerEvents = "none"; overlay.setAttribute("aria-hidden", "true"); drawer.style.transform = "translateX(105%)"; };
      settingsButton.addEventListener("click", openDrawer);
      closeButton.addEventListener("click", closeDrawer);
      overlay.addEventListener("click", closeDrawer);
      document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });
      nav.appendChild(settingsButton);
      document.body.appendChild(overlay);
      document.body.appendChild(drawer);
      verticalStatus.style.display = "none";
      shopifyStatus.style.display = "none";
      aiStatus.style.display = "none";
    };

    const injectNavigation = () => {
      const nav = document.querySelector<HTMLElement>(".side-nav");
      if (nav && nav.dataset.extraLinksReady !== "true") {
        nav.dataset.extraLinksReady = "true";
        const separator = document.createElement("div");
        separator.style.height = "1px";
        separator.style.background = "rgba(255,255,255,.12)";
        separator.style.margin = "10px 12px";
        const trash = document.createElement("button");
        trash.type = "button";
        trash.className = "side-nav__item";
        trash.innerHTML = '<span style="font-size:18px">🗑️</span><span>Cestino</span>';
        trash.addEventListener("click", () => { window.location.href = "/cestino"; });
        nav.appendChild(separator);
        nav.appendChild(trash);
      }
    };

    const enhanceDashboardPanels = () => {
      const panels = Array.from(document.querySelectorAll<HTMLElement>(".right-column .panel"));
      const deadlines = panels.find((panel) => panel.querySelector("h2")?.textContent?.trim() === "Prossime quotazioni" || panel.dataset.ceoActionsReady === "true");
      if (deadlines && deadlines.dataset.ceoActionsReady !== "true") {
        deadlines.dataset.ceoActionsReady = "true";
        const kicker = deadlines.querySelector<HTMLElement>(".section-kicker");
        const heading = deadlines.querySelector<HTMLElement>("h2");
        if (kicker) kicker.textContent = "PRIORITÀ CEO";
        if (heading) heading.textContent = "Azioni da completare";
        const list = deadlines.querySelector<HTMLElement>(".deadline-list");
        if (list) {
          const now = new Date();
          const ranked = promotions
            .filter((promotion) => promotion.status !== "ARCHIVED")
            .map((promotion) => {
              const due = promotion.validUntil ? new Date(`${promotion.validUntil}T12:00:00`) : null;
              const days = due && !Number.isNaN(due.getTime()) ? Math.ceil((due.getTime() - now.getTime()) / 86400000) : null;
              const pending = promotion.status === "PENDING_APPROVAL" || promotion.status === "DRAFT";
              const expired = promotion.status === "EXPIRED" || (days !== null && days < 0);
              const urgent = !pending && !expired && days !== null && days <= 7;
              return { promotion, days, priority: pending ? 0 : urgent ? 1 : expired ? 2 : 3 };
            })
            .filter((item) => item.priority < 3)
            .sort((a, b) => a.priority - b.priority || (a.days ?? 999) - (b.days ?? 999))
            .slice(0, 3);

          list.innerHTML = "";
          if (!ranked.length) {
            const empty = document.createElement("div");
            empty.className = "deadline-item";
            empty.innerHTML = '<div class="deadline-item__date"><strong>✓</strong><span>OK</span></div><div><strong>Nessuna urgenza</strong><span>Tutte le offerte sono sotto controllo</span></div><i class="deadline-item__dot deadline-item__dot--blue"></i>';
            list.appendChild(empty);
          } else {
            ranked.forEach(({ promotion, days, priority }) => {
              const item = document.createElement("div");
              item.className = "deadline-item";
              const label = priority === 0 ? "Da approvare" : priority === 1 ? `Scade tra ${Math.max(0, days || 0)} giorni` : "Offerta scaduta";
              const code = priority === 0 ? "CEO" : priority === 1 ? String(Math.max(0, days || 0)).padStart(2, "0") : "!";
              const month = priority === 0 ? "ORA" : priority === 1 ? "GG" : "STOP";
              const dot = priority === 0 || priority === 1 ? "amber" : "blue";
              item.innerHTML = `<div class="deadline-item__date"><strong>${code}</strong><span>${month}</span></div><div><strong>${promotion.brand || ""} ${promotion.model || "Offerta"}</strong><span>${promotion.rental || "ECCOMI NOLEGGIO"} · ${label}</span></div><i class="deadline-item__dot deadline-item__dot--${dot}"></i>`;
              list.appendChild(item);
            });
          }
        }
        const ruleTitle = deadlines.querySelector<HTMLElement>(".automatic-rule strong");
        const ruleText = deadlines.querySelector<HTMLElement>(".automatic-rule span");
        if (ruleTitle) ruleTitle.textContent = "Controllo automatico attivo";
        if (ruleText) ruleText.textContent = "ECCOMI verifica ogni giorno approvazioni, validità e scadenze.";
      }

      const activity = panels.find((panel) => panel.querySelector("h2")?.textContent?.trim() === "Registro automatico" || panel.dataset.activityReady === "true");
      if (activity && activity.dataset.activityReady !== "true") {
        activity.dataset.activityReady = "true";
        const kicker = activity.querySelector<HTMLElement>(".section-kicker");
        const heading = activity.querySelector<HTMLElement>("h2");
        if (kicker) kicker.textContent = "ECCOMI NOLEGGIO";
        if (heading) heading.textContent = "Attività recenti";
        const list = activity.querySelector<HTMLElement>(".hub-event-list");
        if (list && hubEvents.length) {
          list.innerHTML = "";
          hubEvents.slice(0, 5).forEach((event) => {
            const presentation = eventPresentation(event);
            const row = document.createElement("div");
            const formatted = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(event.createdAt));
            row.innerHTML = `<span>${presentation.icon}</span><p><strong>${presentation.label}</strong><small>${formatted}</small></p>`;
            list.appendChild(row);
          });
        }
      }
    };

    let managementBuilding = false;
    const enhance = async () => {
      injectNavigation();
      injectSettingsDrawer();
      await loadDashboard();
      enhanceDashboardPanels();

      const footer = document.querySelector<HTMLElement>(".promotion-modal__footer");
      if (!footer || footer.dataset.managementReady === "true" || managementBuilding) return;
      managementBuilding = true;
      try {
        footer.querySelectorAll('[aria-label="Gestione offerta CEO"]').forEach((node) => node.remove());
        const offerText = document.querySelector<HTMLElement>(".promotion-check__title .offer-code")?.textContent || "";
        const offerNumber = offerText.replace(/^Offerta\s+/i, "").trim();
        const promotion = promotions.find((item) => item.offerNumber === offerNumber);
        if (!promotion) return;

        footer.dataset.managementReady = "true";
        const group = document.createElement("div");
        group.setAttribute("aria-label", "Gestione offerta CEO");
        Object.assign(group.style, { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", width: "100%", paddingTop: "10px", borderTop: "1px solid #e5edf5" });
        const actions: Array<{ action: "REFRESH" | "SUSPEND" | "ARCHIVE" | "DELETE"; label: string; danger?: boolean }> = [
          { action: "REFRESH", label: "Aggiorna Shopify" },
          { action: "SUSPEND", label: "Sospendi" },
          { action: "ARCHIVE", label: "Archivia" },
          { action: "DELETE", label: "Sposta nel cestino", danger: true },
        ];
        for (const item of actions) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = item.label;
          Object.assign(button.style, buttonStyle(Boolean(item.danger)));
          button.addEventListener("click", () => void execute(promotion, item.action));
          group.appendChild(button);
        }
        footer.appendChild(group);
      } finally {
        managementBuilding = false;
      }
    };

    const observer = new MutationObserver(() => void enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    void loadDashboard();
    void enhance();
    return () => observer.disconnect();
  }, []);

  return null;
}
