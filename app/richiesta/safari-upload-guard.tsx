"use client";

import { useEffect } from "react";

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return new URL(input, window.location.origin);
  if (input instanceof URL) return input;
  return new URL(input.url, window.location.origin);
}

export default function SafariUploadGuard() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      const isDocumentUpload = method === "POST"
        && /^\/api\/public\/applications\/[^/]+\/document$/.test(url.pathname);

      if (!isDocumentUpload || !(init?.body instanceof FormData)) {
        return nativeFetch(input, init);
      }

      const stableBody = new FormData();

      try {
        for (const [name, value] of init.body.entries()) {
          if (value instanceof File) {
            const bytes = await value.arrayBuffer();
            const blob = new Blob([bytes], {
              type: value.type || "application/octet-stream",
            });
            stableBody.append(name, blob, value.name || "documento");
          } else {
            stableBody.append(name, value);
          }
        }
      } catch (error) {
        const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
        throw new Error(`Safari non riesce a leggere il documento selezionato${detail}`);
      }

      return nativeFetch(input, { ...init, body: stableBody });
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
