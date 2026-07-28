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

      const register = Array.from(document.querySelectorAll<HTMLElement>("section,article,div"))
        .find((element) => element.textContent?.includes("Registro automatico") && element.querySelector("h2,h3,strong"));
      if (register && register.dataset.registerReady !== "true") {
        register.dataset.registerReady = "true";
        register.style.cursor = "pointer";
        register.setAttribute("role", "link");
        register.setAttribute("tabindex", "0");
        register.title = "Apri il registro completo";
        const open = () => { window.location.href = "/registro"; };
        register.addEventListener("click", open);
        register.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") open();
        });
      }
    };

    const enhance = async () => {
      injectNavigation();
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
