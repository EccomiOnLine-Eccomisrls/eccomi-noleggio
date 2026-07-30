"use client";

import { useEffect } from "react";

type CachedFile = {
  bytes: ArrayBuffer;
  name: string;
  type: string;
};

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return new URL(input, window.location.origin);
  if (input instanceof URL) return input;
  return new URL(input.url, window.location.origin);
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function SafariUploadGuard() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);
    const cache = new Map<string, Promise<CachedFile>>();

    const rememberSelectedFiles = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.files) return;

      for (const file of Array.from(input.files)) {
        const key = fileKey(file);
        if (cache.has(key)) continue;

        cache.set(
          key,
          file.arrayBuffer().then((bytes) => ({
            bytes,
            name: file.name || "documento",
            type: file.type || "application/octet-stream",
          })),
        );
      }
    };

    document.addEventListener("change", rememberSelectedFiles, true);

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
          if (!(value instanceof File)) {
            stableBody.append(name, value);
            continue;
          }

          const key = fileKey(value);
          const cached = cache.get(key);
          const stable = cached
            ? await cached
            : {
                bytes: await value.arrayBuffer(),
                name: value.name || "documento",
                type: value.type || "application/octet-stream",
              };

          stableBody.append(name, new Blob([stable.bytes], { type: stable.type }), stable.name);
        }
      } catch (error) {
        const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
        throw new Error(`Impossibile preparare il documento selezionato${detail}`);
      }

      return nativeFetch(input, { ...init, body: stableBody });
    };

    return () => {
      document.removeEventListener("change", rememberSelectedFiles, true);
      window.fetch = nativeFetch;
      cache.clear();
    };
  }, []);

  return null;
}
