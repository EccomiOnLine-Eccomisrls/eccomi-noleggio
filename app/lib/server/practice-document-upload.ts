export const PRACTICE_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const PRACTICE_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const PRACTICE_DOCUMENT_TYPES = new Set([
  "IDENTITY",
  "TAX_CODE",
  "INCOME",
  "VAT_CERTIFICATE",
  "LEGAL_REP_IDENTITY",
  "CHAMBER_REPORT",
  "FINANCIAL",
]);

function clean(value: unknown, max = 180) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

export function practiceDocumentId(uploadId: string) {
  return `ECD-${uploadId}`;
}

export function parsePracticeDocumentUploadBody(body: unknown) {
  const input =
    body && typeof body === "object"
      ? body as Record<string, unknown>
      : {};

  const documentType =
    clean(input.documentType, 40).toUpperCase();
  const uploadId = clean(input.uploadId, 80);
  const rawOriginalName = clean(input.originalName, 180);
  const originalName =
    rawOriginalName.split(/[\\/]/).pop()?.trim() || "";
  const mimeType = clean(input.mimeType, 120).toLowerCase();
  const sizeBytes =
    typeof input.sizeBytes === "number"
      ? input.sizeBytes
      : Number(input.sizeBytes);

  if (!PRACTICE_DOCUMENT_TYPES.has(documentType)) {
    throw new Error("Tipo documento non valido.");
  }

  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(uploadId)) {
    throw new Error("Identificativo upload non valido.");
  }

  if (!originalName) {
    throw new Error("Nome file non valido.");
  }

  if (!PRACTICE_DOCUMENT_MIME_TYPES.has(mimeType)) {
    throw new Error("Usa un file PDF, JPG o PNG.");
  }

  if (
    !Number.isInteger(sizeBytes)
    || sizeBytes <= 0
    || sizeBytes > PRACTICE_DOCUMENT_MAX_BYTES
  ) {
    throw new Error(
      "Ogni file può avere una dimensione massima di 10 MB.",
    );
  }

  return {
    documentType,
    uploadId,
    documentId: practiceDocumentId(uploadId),
    originalName,
    mimeType,
    sizeBytes,
  };
}
