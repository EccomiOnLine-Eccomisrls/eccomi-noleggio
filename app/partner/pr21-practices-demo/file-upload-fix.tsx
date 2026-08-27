"use client";

import { useEffect } from "react";

export default function Pr21FileUploadFix() {
  useEffect(() => {
    const applyFix = () => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="file"][accept*="pdf"]',
      );

      if (input) {
        const host = input.closest("label") as HTMLElement | null;
        if (host) {
          host.style.position = "relative";
          host.style.overflow = "hidden";

          input.style.display = "block";
          input.style.position = "absolute";
          input.style.inset = "0";
          input.style.width = "100%";
          input.style.height = "100%";
          input.style.opacity = "0";
          input.style.cursor = "pointer";
          input.style.zIndex = "5";
          input.style.fontSize = "100px";
          input.setAttribute("aria-label", "Seleziona quotazione PDF");
        }
      }

      // PR21 preview polish: keep the pending quotation label and filename
      // visually separated on iPad instead of rendering as one joined word.
      document.querySelectorAll("span").forEach((label) => {
        if (label.textContent?.trim() !== "NUOVA QUOTAZIONE") return;
        const row = label.parentElement;
        const filename = row?.querySelector("strong");
        if (!row || !filename) return;
        row.style.display = "flex";
        row.style.alignItems = "baseline";
        row.style.flexWrap = "wrap";
        row.style.columnGap = "10px";
        row.style.rowGap = "4px";
      });

      // Once the demo quotation has been submitted, make the state explicit
      // and prevent an accidental second submission of the same file.
      const inReview = Array.from(document.querySelectorAll("span")).some(
        (node) => node.textContent?.trim() === "IN VERIFICA ECCOMI",
      );
      if (inReview) {
        document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
          if (button.textContent?.trim() !== "Invia a verifica ECCOMI") return;
          button.disabled = true;
          button.textContent = "Inviata a verifica ECCOMI";
          button.style.cursor = "default";
          button.style.opacity = "0.72";
        });
      }

      return Boolean(input);
    };

    applyFix();

    const observer = new MutationObserver(() => applyFix());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
