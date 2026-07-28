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
        const first = window.confirm("Eliminare definitivamente questa promozione anche da Shopify? L'operazione non può essere annullata.");
        if (!first) return;
        const typed = window.prompt("Per confermare scrivi ELIMINA");
        if (typed !== "ELIMINA") {
          window.alert("Eliminazione annullata.");
          return;
        }
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
        body: action === "REFRESH" ? undefined : JSON.stringify({ action, confirm: action === "DELETE" ? "ELIMINA" : undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(payload.error || "Operazione non riuscita.");
        return;
      }
      window.alert(action === "REFRESH" ? "Offerta aggiornata su Shopify." : action === "DELETE" ? "Offerta eliminata." : action === "SUSPEND" ? "Offerta sospesa." : "Offerta archiviata.");
      window.location.reload();
    };

    const enhance = async () => {
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
        { action: "DELETE", label: "Elimina definitivamente", danger: true },
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
