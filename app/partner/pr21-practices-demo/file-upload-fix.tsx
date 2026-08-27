"use client";

import { useEffect } from "react";

export default function Pr21FileUploadFix() {
  useEffect(() => {
    const applyFix = () => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="file"][accept*="pdf"]',
      );
      if (!input) return false;

      const host = input.closest("label") as HTMLElement | null;
      if (!host) return false;

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
      return true;
    };

    if (applyFix()) return;

    const observer = new MutationObserver(() => {
      if (applyFix()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
