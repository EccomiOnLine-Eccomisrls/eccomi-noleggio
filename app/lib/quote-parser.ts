export type QuoteDraft = {
  provider: string;
  offerNumber: string;
  offerDate: string;
  validFrom: string;
  validUntil: string;
  brand: string;
  model: string;
  version: string;
  monthlyGross: string;
  monthlyNet: string;
  depositGross: string;
  durationMonths: string;
  totalKm: string;
  delivery: string;
  fuel: string;
  transmission: string;
  color: string;
  powerKw: string;
  partner: string;
  services: string[];
  warnings: string[];
  confidence: "alta" | "media" | "bassa";
};

const clean = (value: string | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim();

const capture = (text: string, expression: RegExp, group = 1) =>
  clean(text.match(expression)?.[group]);

const normalizeKm = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("it-IT") : "";
};

const normalizeMoney = (value: string) =>
  /^\d+\.\d{2}$/.test(value) ? value.replace(".", ",") : value;

const serviceList = (text: string) => {
  const services: string[] = [];
  const add = (label: string, expression: RegExp) => {
    if (expression.test(text) && !services.includes(label)) services.push(label);
  };

  add("Manutenzione ordinaria e straordinaria", /Manutenzione Ordinaria e Straordinaria|manutenzione programmata/i);
  add("RCA", /\bRCA\b/i);
  add("Infortuni conducente", /Infortuni del Conducente|\bPAI\b/i);
  add("Tutela legale", /Tutela legale/i);
  add("Copertura danni", /Copertura Danni|Danni al veicolo/i);
  add("Incendio e furto", /Incendio e Furto|furto parziale/i);
  add("Veicolo sostitutivo", /Veicolo Sostitutivo/i);
  add("Pneumatici", /PNEUMATICI INCLUSI/i);
  add("Assistenza stradale", /Traino Standard|soccorso stradale/i);
  add("Telematica", /I-Care Smart|sistemi di localizzazione/i);

  return services;
};

function parseLeasys(text: string): QuoteDraft {
  const validity = text.match(
    /Offerta Valida\s+dal\s+al\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i,
  );
  const prices = text.match(
    /Canone Totale\s+€\s*([\d\s.,]+?)\s+€\s*([\d\s.,]+?)\s+Durata/i,
  );
  const deposits = text.match(
    /Anticipo\s+€\s*([\d\s.,]+?)\s+€\s*([\d\s.,]+?)\s+km totali/i,
  );

  const draft: QuoteDraft = {
    provider: "Leasys",
    offerNumber: capture(text, /OFFERTA N\.\s*(\d{7,})/i),
    offerDate: capture(text, /OFFERTA N\.\s*\d{7,}\s*(\d{2}\/\d{2}\/\d{4})/i),
    validFrom: clean(validity?.[1]),
    validUntil: clean(validity?.[2]),
    brand: capture(text, /Marca\s+([A-ZÀ-ÖØ-Ý0-9-]+)\s+Quota Canone Veicolo/i),
    model: capture(text, /Modello\s+(.+?)\s+Quota Canone Servizi/i),
    version: capture(text, /Versione\s+(.+?)\s+Canone Totale/i),
    monthlyGross: clean(prices?.[2]),
    monthlyNet: clean(prices?.[1]),
    depositGross: clean(deposits?.[2]),
    durationMonths: capture(text, /Durata\s+(\d{1,3})\s+Anticipo/i),
    totalKm: normalizeKm(capture(text, /km totali\s+([\d\s]+?)\s+Franchigia km/i)),
    delivery: capture(text, /Prevista consegna:\s*(.+?)\s+Servizi Inclusi/i),
    fuel: capture(text, /Motorizzazione\s+(.+?)\s+Totale Accessori/i),
    transmission: capture(text, /Cambio\s+([A-Z]{3,})\s+Carrozzeria/i),
    color: capture(text, /Colore\s+(.+?)\s+Listino/i).replace(/^\d+\s+/, ""),
    powerKw: capture(text, /Potenza \(kW\)\s+(\d+(?:[.,]\d+)?)/i),
    partner: /\bGOAL RENT SRL\b/i.test(text) ? "GOAL RENT SRL" : "",
    services: serviceList(text),
    warnings: [
      "Il documento non costituisce offerta contrattuale ed è soggetto a valutazione del noleggiatore.",
      "Bollo auto con riaddebito periodico.",
    ],
    confidence: "alta",
  };

  const required = [draft.offerNumber, draft.validUntil, draft.model, draft.monthlyGross, draft.durationMonths, draft.totalKm];
  if (required.filter(Boolean).length < required.length - 1) draft.confidence = "media";
  return draft;
}

function parseAld(text: string): QuoteDraft {
  const vehicle = capture(
    text,
    /(KIA\s+PICANTO\s+.+?Hatchback\s+5-door)\s+\(Euro/i,
  );
  const duration = capture(
    text,
    /Durata\s+mesi\*\s+KM totali[\s\S]{0,220}?(\d{2})\s+B\b/i,
  );
  const kmSection = text.match(/KM totali([\s\S]{0,1800})/i)?.[1] ?? "";
  const kmCandidates = [...kmSection.matchAll(/\b(\d{5,6})\b/g)]
    .map((match) => Number(match[1]))
    .filter((value) => value >= 10_000 && value <= 500_000);
  const km = kmCandidates.length ? String(Math.max(...kmCandidates)) : "";

  const draft: QuoteDraft = {
    provider: "Ayvens / ALD",
    offerNumber: capture(text, /\b(\d{8}\/\d{3})\b/),
    offerDate: capture(text, /\b(\d{2}\/\d{2}\/\d{4})\s+\d{8}\b/),
    validFrom: "",
    validUntil: capture(text, /(\d{2}\/\d{2}\/\d{4})\s+Salvo Venduto/i),
    brand: vehicle ? vehicle.split(" ")[0] : "KIA",
    model: vehicle ? vehicle.replace(/^KIA\s+/i, "").replace(/\s+Hatchback\s+5-door$/i, "") : "",
    version: vehicle,
    monthlyGross: normalizeMoney(capture(text, /Canone mensile I\.V\.A\. inclusa\s+€\s*([\d.,]+)/i)),
    monthlyNet: "",
    depositGross: capture(text, /Anticipo \(iva inclusa\) €[\s\S]{0,45}?\b(0)\b/i),
    durationMonths: duration,
    totalKm: normalizeKm(km),
    delivery: capture(text, /Prevista consegna\s*:\s*(\d+\s+Settimane.+?)\s+Totale optional/i),
    fuel: capture(text, /Motorizzazione:\s*(.+?)\s+Veicolo:/i),
    transmission: capture(text, /Transmission:\s*([A-Z]{3,})/i),
    color: capture(text, /COLORE ESTERNO:\s*(.+?)\s+COLORE INTERNI/i),
    powerKw: capture(text, /Kw:\s*(\d+(?:[.,]\d+)?)/i),
    partner: "",
    services: serviceList(text),
    warnings: [
      "Offerta valida salvo venduto.",
      "Bollo auto e relativo costo di gestione non inclusi nel canone.",
    ],
    confidence: "alta",
  };

  const required = [draft.offerNumber, draft.validUntil, draft.model, draft.monthlyGross, draft.durationMonths, draft.totalKm];
  if (required.filter(Boolean).length < required.length - 1) draft.confidence = "media";
  return draft;
}

export function parseQuoteText(rawText: string): QuoteDraft {
  const text = clean(rawText);
  if (/PROPOSTA LEASYS|Leasys Italia/i.test(text)) return parseLeasys(text);
  if (/ALD Automotive|4VANTAGE/i.test(text)) return parseAld(text);

  return {
    provider: "Formato da verificare",
    offerNumber: "",
    offerDate: "",
    validFrom: "",
    validUntil: "",
    brand: "",
    model: "",
    version: "",
    monthlyGross: "",
    monthlyNet: "",
    depositGross: "",
    durationMonths: "",
    totalKm: "",
    delivery: "",
    fuel: "",
    transmission: "",
    color: "",
    powerKw: "",
    partner: "",
    services: [],
    warnings: ["Formato non ancora configurato: i dati devono essere controllati manualmente."],
    confidence: "bassa",
  };
}

export async function extractQuoteFromPdf(file: File): Promise<QuoteDraft> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const source = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: source }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" "),
    );
  }

  return parseQuoteText(pages.join(" "));
}
