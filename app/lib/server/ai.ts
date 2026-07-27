import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { aiIntegrations } from "../../../db/schema";
import type { QuoteDraft } from "../quote-parser";
import { decryptOpenAiCredential, encryptOpenAiCredential } from "./credential-crypto";
import { getRuntimeEnv } from "./runtime";

const AI_INTEGRATION_ID = "openai-primary";
const DEFAULT_TEXT_MODEL = "gpt-5.6-terra";
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const ALLOWED_TEXT_MODELS = new Set(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.6"]);
const ALLOWED_IMAGE_MODELS = new Set(["gpt-image-2"]);

export type AiConnectionStatus = {
  connected: boolean;
  textModel: string;
  imageModel: string;
  verifiedAt: string | null;
  source: "environment" | "encrypted" | null;
};

export type AiConfiguration = {
  apiKey: string;
  textModel: string;
  imageModel: string;
};

type OpenAiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
  };
};

type OpenAiResponsePayload = OpenAiErrorPayload & {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

type OpenAiImagePayload = OpenAiErrorPayload & {
  data?: Array<{ b64_json?: string }>;
};

const quoteSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    provider: { type: "string" },
    offerNumber: { type: "string" },
    offerDate: { type: "string" },
    validFrom: { type: "string" },
    validUntil: { type: "string" },
    brand: { type: "string" },
    model: { type: "string" },
    version: { type: "string" },
    monthlyGross: { type: "string" },
    monthlyNet: { type: "string" },
    depositGross: { type: "string" },
    durationMonths: { type: "string" },
    totalKm: { type: "string" },
    delivery: { type: "string" },
    fuel: { type: "string" },
    transmission: { type: "string" },
    color: { type: "string" },
    powerKw: { type: "string" },
    partner: { type: "string" },
    services: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["alta", "media", "bassa"] },
  },
  required: [
    "provider",
    "offerNumber",
    "offerDate",
    "validFrom",
    "validUntil",
    "brand",
    "model",
    "version",
    "monthlyGross",
    "monthlyNet",
    "depositGross",
    "durationMonths",
    "totalKm",
    "delivery",
    "fuel",
    "transmission",
    "color",
    "powerKw",
    "partner",
    "services",
    "warnings",
    "confidence",
  ],
} as const;

function normalizeModel(value: string | undefined, allowed: Set<string>, fallback: string) {
  const model = value?.trim() || fallback;
  return allowed.has(model) ? model : fallback;
}

function apiErrorMessage(status: number, payload: OpenAiErrorPayload, fallback: string) {
  if (status === 401 || status === 403) return "La chiave OpenAI non è autorizzata. Verifica la chiave e il progetto API.";
  if (status === 429) return "Il limite OpenAI è stato raggiunto. Controlla credito e limiti del progetto API.";
  const message = payload.error?.message?.trim();
  return message ? `${fallback}: ${message}` : fallback;
}

function bytesToBase64(bytes: ArrayBuffer) {
  const source = new Uint8Array(bytes);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < source.length; offset += chunkSize) {
    binary += String.fromCharCode(...source.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function responseText(payload: OpenAiResponsePayload) {
  for (const item of payload.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "refusal" && content.refusal) throw new Error("OpenAI non ha potuto elaborare questa quotazione.");
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI non ha restituito i dati della quotazione.");
}

function clean(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => clean(item, 240))
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeQuoteDraft(value: unknown): QuoteDraft {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const confidence = clean(source.confidence, 10);
  return {
    provider: clean(source.provider, 120) || "Formato da verificare",
    offerNumber: clean(source.offerNumber, 100),
    offerDate: clean(source.offerDate, 10),
    validFrom: clean(source.validFrom, 10),
    validUntil: clean(source.validUntil, 10),
    brand: clean(source.brand, 80),
    model: clean(source.model, 180),
    version: clean(source.version, 320),
    monthlyGross: clean(source.monthlyGross, 40),
    monthlyNet: clean(source.monthlyNet, 40),
    depositGross: clean(source.depositGross, 40) || "0",
    durationMonths: clean(source.durationMonths, 12),
    totalKm: clean(source.totalKm, 24),
    delivery: clean(source.delivery, 180),
    fuel: clean(source.fuel, 100),
    transmission: clean(source.transmission, 100),
    color: clean(source.color, 100),
    powerKw: clean(source.powerKw, 40),
    partner: clean(source.partner, 140),
    services: cleanList(source.services),
    warnings: cleanList(source.warnings),
    confidence: confidence === "alta" || confidence === "bassa" ? confidence : "media",
  };
}

function mergeFallback(primary: QuoteDraft, fallback?: QuoteDraft | null): QuoteDraft {
  if (!fallback) return primary;
  const stringKeys: Array<keyof Omit<QuoteDraft, "services" | "warnings" | "confidence">> = [
    "provider",
    "offerNumber",
    "offerDate",
    "validFrom",
    "validUntil",
    "brand",
    "model",
    "version",
    "monthlyGross",
    "monthlyNet",
    "depositGross",
    "durationMonths",
    "totalKm",
    "delivery",
    "fuel",
    "transmission",
    "color",
    "powerKw",
    "partner",
  ];
  const merged = { ...primary };
  for (const key of stringKeys) {
    if (!merged[key] && fallback[key]) merged[key] = fallback[key];
  }
  if (!merged.services.length) merged.services = fallback.services;
  if (!merged.warnings.length) merged.warnings = fallback.warnings;
  return merged;
}

export async function getAiConfiguration(): Promise<AiConfiguration> {
  const runtime = getRuntimeEnv();
  const staticKey = runtime.OPENAI_API_KEY?.trim();
  if (staticKey) {
    return {
      apiKey: staticKey,
      textModel: normalizeModel(runtime.OPENAI_TEXT_MODEL, ALLOWED_TEXT_MODELS, DEFAULT_TEXT_MODEL),
      imageModel: normalizeModel(runtime.OPENAI_IMAGE_MODEL, ALLOWED_IMAGE_MODELS, DEFAULT_IMAGE_MODEL),
    };
  }

  const [record] = await getDb()
    .select()
    .from(aiIntegrations)
    .where(eq(aiIntegrations.id, AI_INTEGRATION_ID))
    .limit(1);
  if (!record || record.status !== "CONNECTED") throw new Error("Collega prima il motore AI OpenAI.");
  return {
    apiKey: await decryptOpenAiCredential(record.encryptedApiKey),
    textModel: normalizeModel(record.textModel, ALLOWED_TEXT_MODELS, DEFAULT_TEXT_MODEL),
    imageModel: normalizeModel(record.imageModel, ALLOWED_IMAGE_MODELS, DEFAULT_IMAGE_MODEL),
  };
}

export async function getAiConnectionStatus(): Promise<AiConnectionStatus> {
  const runtime = getRuntimeEnv();
  if (runtime.OPENAI_API_KEY?.trim()) {
    return {
      connected: true,
      textModel: normalizeModel(runtime.OPENAI_TEXT_MODEL, ALLOWED_TEXT_MODELS, DEFAULT_TEXT_MODEL),
      imageModel: normalizeModel(runtime.OPENAI_IMAGE_MODEL, ALLOWED_IMAGE_MODELS, DEFAULT_IMAGE_MODEL),
      verifiedAt: null,
      source: "environment",
    };
  }
  const [record] = await getDb()
    .select()
    .from(aiIntegrations)
    .where(eq(aiIntegrations.id, AI_INTEGRATION_ID))
    .limit(1);
  return {
    connected: Boolean(record && record.status === "CONNECTED"),
    textModel: normalizeModel(record?.textModel, ALLOWED_TEXT_MODELS, DEFAULT_TEXT_MODEL),
    imageModel: normalizeModel(record?.imageModel, ALLOWED_IMAGE_MODELS, DEFAULT_IMAGE_MODEL),
    verifiedAt: record?.verifiedAt || null,
    source: record?.status === "CONNECTED" ? "encrypted" : null,
  };
}

export async function connectAiIntegration(input: {
  apiKey: string;
  actorEmail: string;
  textModel?: string;
}) {
  const apiKey = input.apiKey.trim();
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) throw new Error("La chiave OpenAI non sembra completa.");
  const textModel = normalizeModel(input.textModel, ALLOWED_TEXT_MODELS, DEFAULT_TEXT_MODEL);
  const checks = await Promise.all([textModel, DEFAULT_IMAGE_MODEL].map(async (model) => {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const payload = await response.json().catch(() => ({})) as OpenAiErrorPayload;
    if (!response.ok) {
      throw new Error(apiErrorMessage(response.status, payload, `OpenAI non ha autorizzato il modello ${model}`));
    }
    return model;
  }));
  if (checks.length !== 2) throw new Error("OpenAI non ha confermato tutti i modelli necessari.");

  const now = new Date().toISOString();
  const encryptedApiKey = await encryptOpenAiCredential(apiKey);
  await getDb().insert(aiIntegrations).values({
    id: AI_INTEGRATION_ID,
    provider: "OPENAI",
    encryptedApiKey,
    textModel,
    imageModel: DEFAULT_IMAGE_MODEL,
    status: "CONNECTED",
    connectedBy: input.actorEmail,
    connectedAt: now,
    verifiedAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: aiIntegrations.id,
    set: {
      encryptedApiKey,
      textModel,
      imageModel: DEFAULT_IMAGE_MODEL,
      status: "CONNECTED",
      connectedBy: input.actorEmail,
      connectedAt: now,
      verifiedAt: now,
      updatedAt: now,
    },
  });
  return getAiConnectionStatus();
}

export async function extractQuoteWithAi(
  bytes: ArrayBuffer,
  filename: string,
  fallback?: QuoteDraft | null,
) {
  const config = await getAiConfiguration();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.textModel,
      store: false,
      reasoning: { effort: "low" },
      instructions: [
        "Sei il motore di acquisizione quotazioni di ECCOMI NOLEGGIO.",
        "Leggi il PDF senza inventare dati. Estrai esclusivamente i valori presenti nel documento.",
        "Per tutte le date usa DD/MM/YYYY. Per importi usa il formato italiano 1234,56 senza simbolo euro.",
        "monthlyGross e depositGross devono essere IVA inclusa; monthlyNet è IVA esclusa quando indicata.",
        "totalKm è il chilometraggio contrattuale totale, solo cifre. durationMonths è solo il numero di mesi.",
        "In provider indica il noleggiatore; in partner l’intermediario o proprietario commerciale se esplicitamente presente.",
        "Riporta nei warnings esclusioni, franchigie, penali, bollo, salvo venduto e condizioni sostanziali.",
        "Se un dato non è leggibile restituisci una stringa vuota e abbassa confidence.",
      ].join(" "),
      input: [{
        role: "user",
        content: [
          {
            type: "input_file",
            filename: filename.replace(/[^\w.\- ]/g, "-").slice(0, 180) || "quotazione.pdf",
            file_data: `data:application/pdf;base64,${bytesToBase64(bytes)}`,
            detail: "high",
          },
          {
            type: "input_text",
            text: "Estrai tutti i dati necessari a creare una promozione di noleggio a lungo termine e restituisci soltanto l’oggetto strutturato richiesto.",
          },
        ],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "eccomi_noleggio_quote",
          strict: true,
          schema: quoteSchema,
        },
      },
    }),
  });
  const payload = await response.json().catch(() => ({})) as OpenAiResponsePayload;
  if (!response.ok) throw new Error(apiErrorMessage(response.status, payload, "Estrazione AI non riuscita."));
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText(payload));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("OpenAI ha restituito dati non leggibili.");
    throw error;
  }
  return {
    draft: mergeFallback(normalizeQuoteDraft(parsed), fallback),
    model: config.textModel,
  };
}

export async function generateVehicleImage(input: {
  brand: string;
  model: string;
  version: string;
  color: string;
}) {
  const config = await getAiConfiguration();
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.imageModel,
      prompt: [
        `Fotografia pubblicitaria automobilistica fotorealistica, formato orizzontale, del veicolo ${input.brand} ${input.model}.`,
        input.version ? `Versione di riferimento: ${input.version}.` : "",
        input.color ? `Colore: ${input.color}.` : "",
        "Inquadratura tre quarti anteriore, automobile intera e centrata, sfondo studio bianco-grigio molto chiaro, ombra naturale.",
        "Nessuna persona, nessun testo, nessun prezzo, nessuna targa leggibile, nessun watermark, nessun elemento grafico.",
        "L’immagine è illustrativa per una scheda di noleggio; privilegia una resa pulita e realistica.",
      ].filter(Boolean).join(" "),
      size: "1536x1024",
      quality: "low",
      output_format: "jpeg",
      output_compression: 88,
      background: "opaque",
      n: 1,
    }),
  });
  const payload = await response.json().catch(() => ({})) as OpenAiImagePayload;
  if (!response.ok) throw new Error(apiErrorMessage(response.status, payload, "Generazione immagine AI non riuscita."));
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI non ha restituito l’immagine del veicolo.");
  const bytes = base64ToBytes(encoded);
  return {
    bytes: bytes.buffer as ArrayBuffer,
    filename: `${input.brand}-${input.model}`.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-").slice(0, 80) + ".jpg",
    mimeType: "image/jpeg",
    model: config.imageModel,
  };
}
