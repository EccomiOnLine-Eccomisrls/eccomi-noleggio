"use client";

import { useEffect } from "react";

type JsonPayload = {
  ok?: boolean;
  error?: string;
  practiceCode?: string;
  status?: string;
};

const documentTypeByField: Record<string, string> = {
  document_tax_code: "TAX_CODE",
  document_income: "INCOME",
  document_vat: "VAT_CERTIFICATE",
  document_chamber: "CHAMBER_REPORT",
  document_financial: "FINANCIAL",
};

async function readPayload(response: Response): Promise<JsonPayload> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as JsonPayload;
  } catch {
    return { error: text };
  }
}

async function submitSequentially(body: FormData): Promise<{ status: number; payload: JsonPayload }> {
  const customerType = String(body.get("customerType") || "");
  const metadata: Record<string, unknown> = {};
  for (const key of [
    "promotionId", "customerType", "firstName", "lastName", "email", "phone", "province",
    "businessName", "vatNumber", "accountHolder", "iban", "submissionKey",
  ]) {
    metadata[key] = String(body.get(key) || "");
  }
  metadata.privacyAccepted = String(body.get("privacyAccepted")) === "true";
  metadata.marketingConsent = String(body.get("marketingConsent")) === "true";

  const startResponse = await fetch("/api/public/applications/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const startPayload = await readPayload(startResponse);
  if (!startResponse.ok || !startPayload.practiceCode) {
    return { status: startResponse.status, payload: startPayload };
  }

  const practiceCode = startPayload.practiceCode;
  const uploads: Array<{ field: string; file: File }> = [];
  for (const [field, value] of body.entries()) {
    if (value instanceof File && value.size > 0) uploads.push({ field, file: value });
  }

  for (let index = 0; index < uploads.length; index += 1) {
    const upload = uploads[index];
    const documentType = upload.field === "document_identity"
      ? customerType === "COMPANY" ? "LEGAL_REP_IDENTITY" : "IDENTITY"
      : documentTypeByField[upload.field];
    if (!documentType) {
      return { status: 422, payload: { error: `Tipo documento non riconosciuto: ${upload.field}.` } };
    }

    const fileBody = new FormData();
    fileBody.set("documentType", documentType);
    fileBody.set("file", upload.file);
    const uploadResponse = await fetch(`/api/public/applications/${encodeURIComponent(practiceCode)}/document`, {
      method: "POST",
      body: fileBody,
    });
    const uploadPayload = await readPayload(uploadResponse);
    if (!uploadResponse.ok) {
      return {
        status: uploadResponse.status,
        payload: { error: uploadPayload.error || `Caricamento file ${index + 1} di ${uploads.length} non riuscito.` },
      };
    }
  }

  const completeResponse = await fetch(`/api/public/applications/${encodeURIComponent(practiceCode)}/complete`, { method: "POST" });
  const completePayload = await readPayload(completeResponse);
  return { status: completeResponse.status, payload: completePayload };
}

export default function SequentialUploadBridge() {
  useEffect(() => {
    const NativeXMLHttpRequest = window.XMLHttpRequest;

    class PatchedXMLHttpRequest {
      private native: XMLHttpRequest | null = null;
      private method = "GET";
      private url = "";
      timeout = 0;
      responseType: XMLHttpRequestResponseType = "";
      status = 0;
      responseText = "";
      onload: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
      onerror: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
      ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
      onabort: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;

      open(method: string, url: string | URL, async = true) {
        this.method = method.toUpperCase();
        this.url = String(url);
        if (!this.isApplicationsEndpoint()) {
          this.native = new NativeXMLHttpRequest();
          this.native.open(method, url, async);
        }
      }

      private isApplicationsEndpoint() {
        try {
          return this.method === "POST" && new URL(this.url, window.location.origin).pathname === "/api/public/applications";
        } catch {
          return false;
        }
      }

      send(body?: Document | XMLHttpRequestBodyInit | null) {
        if (!this.isApplicationsEndpoint()) {
          if (!this.native) throw new Error("Richiesta non inizializzata.");
          this.native.timeout = this.timeout;
          this.native.responseType = this.responseType;
          this.native.onload = (event) => {
            this.status = this.native?.status || 0;
            this.responseText = this.native?.responseText || "";
            this.onload?.call(this as unknown as XMLHttpRequest, event);
          };
          this.native.onerror = (event) => this.onerror?.call(this as unknown as XMLHttpRequest, event);
          this.native.ontimeout = (event) => this.ontimeout?.call(this as unknown as XMLHttpRequest, event);
          this.native.onabort = (event) => this.onabort?.call(this as unknown as XMLHttpRequest, event);
          this.native.send(body);
          return;
        }

        if (!(body instanceof FormData)) {
          this.status = 400;
          this.responseText = JSON.stringify({ error: "Dati di invio non validi." });
          queueMicrotask(() => this.onload?.call(this as unknown as XMLHttpRequest, new ProgressEvent("load")));
          return;
        }

        const timeoutId = this.timeout > 0
          ? window.setTimeout(() => this.ontimeout?.call(this as unknown as XMLHttpRequest, new ProgressEvent("timeout")), this.timeout)
          : null;

        submitSequentially(body)
          .then(({ status, payload }) => {
            if (timeoutId !== null) window.clearTimeout(timeoutId);
            this.status = status;
            this.responseText = JSON.stringify(payload);
            this.onload?.call(this as unknown as XMLHttpRequest, new ProgressEvent("load"));
          })
          .catch(() => {
            if (timeoutId !== null) window.clearTimeout(timeoutId);
            this.onerror?.call(this as unknown as XMLHttpRequest, new ProgressEvent("error"));
          });
      }

      setRequestHeader(name: string, value: string) {
        this.native?.setRequestHeader(name, value);
      }

      abort() {
        this.native?.abort();
        this.onabort?.call(this as unknown as XMLHttpRequest, new ProgressEvent("abort"));
      }
    }

    window.XMLHttpRequest = PatchedXMLHttpRequest as unknown as typeof XMLHttpRequest;
    return () => {
      window.XMLHttpRequest = NativeXMLHttpRequest;
    };
  }, []);

  return null;
}
