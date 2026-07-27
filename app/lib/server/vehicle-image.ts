import { generateVehicleImage } from "./ai";

export type VehicleCover = {
  bytes: ArrayBuffer;
  filename: string;
  mimeType: string;
  sourceKind: "WIKIMEDIA" | "OPENAI_GENERATED";
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
}): Promise<VehicleCover> {
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
