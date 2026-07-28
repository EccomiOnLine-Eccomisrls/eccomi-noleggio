"use client";

import { useEffect } from "react";

type DashboardPromotion = {
  id: string;
  offerNumber: string;
  status: string;
  shopifyProductId: string | null;
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

export default function PromotionManagementControls() {
  useEffect(() => {
    let promotions: DashboardPromotion[] = [];
    let loading = false;

    const loadPromotions = async () => {
      if (loading || promotions.length) return;
      loading = true;
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store", credentials: "same-origin" });
        const payload = await response.json();
        if (response.ok) promotions = payload.promotions || [];
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
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "9998",
        background: "rgba(8, 24, 40, .42)",
        opacity: "0",
        pointerEvents: "none",
        transition: "opacity .2s ease",
      });

      const drawer = document.createElement("aside");
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-label", "Impostazioni operative");
      Object.assign(drawer.style, {
        position: "fixed",
        top: "0",
        right: "0",
        bottom: "0",
        zIndex: "9999",
        width: "min(560px, 94vw)",
        background: "#f4f7fb",
        boxShadow: "-18px 0 50px rgba(8, 35, 62, .22)",
        transform: "translateX(105%)",
        transition: "transform .24s ease",
        overflowY: "auto",
        padding: "24px",
      });

      const header = document.createElement("div");
      Object.assign(header.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "20px",
      });
      header.innerHTML = '<div><div style="font-size:11px;font-weight:900;letter-spacing:.12em;color:#0c5597">AREA OPERATIVA</div><h2 style="margin:5px 0 0;color:#102033;font-size:27px">Impostazioni</h2><p style="margin:6px 0 0;color:#677587">Stato del verticale e collegamenti tecnici.</p></div>';

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.textContent = "✕";
      closeButton.setAttribute("aria-label", "Chiudi impostazioni");
      Object.assign(closeButton.style, {
        width: "42px",
        height: "42px",
        borderRadius: "12px",
        border: "1px solid #dce6f1",
        background: "#ffffff",
        color: "#102033",
        fontSize: "18px",
        cursor: "pointer",
      });
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

      const openDrawer = () => {
        overlay.style.opacity = "1";
        overlay.style.pointerEvents = "auto";
        overlay.setAttribute("aria-hidden", "false");
        drawer.style.transform = "translateX(0)";
      };
      const closeDrawer = () => {
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
        overlay.setAttribute("aria-hidden", "true");
        drawer.style.transform = "translateX(105%)";
      };

      settingsButton.addEventListener("click", openDrawer);
      closeButton.addEventListener("click", closeDrawer);
      overlay.addEventListener("click", closeDrawer);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeDrawer();
      });

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

    const enhance = async () => {
      injectNavigation();
      injectSettingsDrawer();
      const footer = document.querySelector<HTMLElement>(".promotion-modal__footer");
      if (!footer || footer.dataset.managementReady === "true") return;
      await loadPromotions();
      const offerText = document.querySelector<HTMLElement>(".promotion-check__title .offer-code")?.textContent || "";
      const offerNumber = offerText.replace(/^Offerta\s+/i, "").trim();
      const promotion = promotions.find((item) => item.offerNumber === offerNumber);
      if (!promotion) return;

      footer.dataset.managementReady = "true";
      const group = document.createElement("div");
      group.setAttribute("aria-label", "Gestione offerta CEO");
      group.style.display = "flex";
      group.style.gap = "8px";
      group.style.flexWrap = "wrap";
      group.style.alignItems = "center";
      group.style.width = "100%";
      group.style.paddingTop = "10px";
      group.style.borderTop = "1px solid #e5edf5";

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
    };

    const observer = new MutationObserver(() => void enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    void loadPromotions();
    void enhance();
    return () => observer.disconnect();
  }, []);

  return null;
}
