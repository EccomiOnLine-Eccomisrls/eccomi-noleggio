import { generateVehicleImage, getAiConfiguration } from "./ai";

export type VehicleCover = {
  bytes: ArrayBuffer;
  filename: string;
  mimeType: string;
  sourceKind: "WIKIMEDIA" | "OPENAI_GENERATED" | "OPENAI_BRANDED";
  sourceUrl: string | null;
  attribution: string;
};

type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

type CommonsPayload = {
  query?: {
    pages?: Record<string, CommonsPage>;
  };
};

type OpenAiImagePayload = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function plainText(value: string | undefined) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function safeFilename(title: string, mimeType: string) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const basename = title
    .replace(/^File:/i, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "veicolo";
  return `${basename}.${extension}`;
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer as ArrayBuffer;
}

function euro(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

async function generateBrandedCover(input: {
  brand: string;
  model: string;
  version: string;
  color: string;
  monthlyGrossCents: number;
  depositGrossCents: number;
  durationMonths: number;
  totalKm: number;
}): Promise<VehicleCover> {
  const config = await getAiConfiguration();
  const brandModel = `${input.brand} ${input.model}`.replace(/\s+/g, " ").trim();
  const vehicle = `${brandModel} ${input.version}`.replace(/\s+/g, " ").trim();
  const price = euro(input.monthlyGrossCents);
  const deposit = euro(input.depositGrossCents);
  const km = input.totalKm.toLocaleString("it-IT");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.imageModel,
      prompt: [
        "Crea una copertina pubblicitaria automobilistica professionale in formato orizzontale 3:2 per ECCOMI NOLEGGIO.",
        `Il veicolo deve essere una ${vehicle}${input.color ? `, colore ${input.color}` : ""}, fotorealistico, intero, tre quarti anteriore, su fondo bianco pulito con ombra naturale.`,
        "Usa una grafica premium bianca, blu navy e blu elettrico, ordinata e identica a una landing professionale di noleggio.",
        "In alto a sinistra inserisci un piccolo simbolo geometrico blu a tre fasce e, accanto, il testo esatto: ECCOMI NOLEGGIO.",
        `Inserisci in grande il testo esatto: ${brandModel.toUpperCase()}.`,
        `Inserisci in grande il prezzo esatto: ${price} €/mese.`,
        "Subito sotto al prezzo inserisci il testo esatto: IVA inclusa.",
        `Crea tre riquadri bianchi allineati con questi testi esatti: Anticipo ${deposit} € | ${input.durationMonths} mesi | ${km} km.`,
        "In basso a sinistra inserisci in piccolo il testo esatto: Immagine illustrativa.",
        "Non aggiungere altri testi, slogan, targhe leggibili, persone, watermark o loghi di terzi.",
        "Controlla con attenzione ortografia, cifre, virgole, punti e simbolo euro: tutti i testi devono essere perfettamente leggibili e corrispondere esattamente a quelli indicati.",
      ].join(" "),
      size: "1536x1024",
      quality: "medium",
      output_format: "jpeg",
      output_compression: 92,
      background: "opaque",
      n: 1,
    }),
  });

  const payload = await response.json().catch(() => ({})) as OpenAiImagePayload;
  if (!response.ok) {
    throw new Error(payload.error?.message || "Generazione della copertina ECCOMI non riuscita.");
  }
  const encoded = payload.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI non ha restituito la copertina ECCOMI.");

  return {
    bytes: base64ToBytes(encoded),
    filename: `${brandModel}-eccomi-noleggio`.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-").slice(0, 90) + ".jpg",
    mimeType: "image/jpeg",
    sourceKind: "OPENAI_BRANDED",
    sourceUrl: null,
    attribution: `Copertina illustrativa ECCOMI NOLEGGIO generata con ${config.imageModel}`,
  };
}

async function commonsCover(query: string): Promise<VehicleCover | null> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1600",
    format: "json",
    origin: "*",
  }).toString();
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "ECCOMI-NOLEGGIO/1.0" },
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => ({})) as CommonsPayload;
  const pages = Object.values(payload.query?.pages || {});
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const sourceUrl = info?.thumburl || info?.url;
    const mimeType = info?.mime || "";
    if (!sourceUrl || !ALLOWED_IMAGE_TYPES.has(mimeType)) continue;
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== "upload.wikimedia.org") continue;
    const imageResponse = await fetch(parsed, { headers: { accept: "image/*", "user-agent": "ECCOMI-NOLEGGIO/1.0" } });
    if (!imageResponse.ok) continue;
    const contentLength = Number(imageResponse.headers.get("content-length") || 0);
    if (contentLength > MAX_IMAGE_BYTES) continue;
    const bytes = await imageResponse.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) continue;
    const metadata = info?.extmetadata || {};
    const artist = plainText(metadata.Artist?.value || metadata.Credit?.value);
    const license = plainText(metadata.LicenseShortName?.value);
    const attribution = [artist, license, "Wikimedia Commons"].filter(Boolean).join(" · ");
    return {
      bytes,
      filename: safeFilename(page.title || "veicolo", mimeType),
      mimeType,
      sourceKind: "WIKIMEDIA",
      sourceUrl: info?.url || sourceUrl,
      attribution: attribution || "Wikimedia Commons",
    };
  }
  return null;
}

export async function retrieveVehicleCover(input: {
  brand: string;
  model: string;
  version: string;
  color: string;
  monthlyGrossCents?: number;
  depositGrossCents?: number;
  durationMonths?: number;
  totalKm?: number;
}): Promise<VehicleCover> {
  if (
    Number.isFinite(input.monthlyGrossCents) &&
    Number.isFinite(input.depositGrossCents) &&
    Number.isFinite(input.durationMonths) &&
    Number.isFinite(input.totalKm)
  ) {
    try {
      return await generateBrandedCover({
        brand: input.brand,
        model: input.model,
        version: input.version,
        color: input.color,
        monthlyGrossCents: input.monthlyGrossCents || 0,
        depositGrossCents: input.depositGrossCents || 0,
        durationMonths: input.durationMonths || 0,
        totalKm: input.totalKm || 0,
      });
    } catch (error) {
      console.error("ECCOMI branded cover generation failed; falling back to vehicle photo.", error);
    }
  }

  const query = [input.brand, input.model, input.version]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  const retrieved = await commonsCover(query);
  if (retrieved) return retrieved;

  const generated = await generateVehicleImage(input);
  return {
    bytes: generated.bytes,
    filename: generated.filename,
    mimeType: generated.mimeType,
    sourceKind: "OPENAI_GENERATED",
    sourceUrl: null,
    attribution: `Immagine illustrativa generata con ${generated.model}`,
  };
}
