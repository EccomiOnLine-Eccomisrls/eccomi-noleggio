type DemoDocument = {
  title: string;
  filename: string;
  description: string;
};

const DEMO_DOCUMENTS: Record<string, DemoDocument> = {
  identity: {
    title: "Documento identita",
    filename: "documento-identita-demo.pdf",
    description: "Documento dimostrativo per il collaudo dell'Area Partner.",
  },
  tax-code: {
    title: "Codice fiscale",
    filename: "codice-fiscale-demo.pdf",
    description: "Documento dimostrativo per il collaudo dell'Area Partner.",
  },
  payslip: {
    title: "Ultima busta paga",
    filename: "ultima-busta-paga-demo.pdf",
    description: "Documento dimostrativo per il collaudo dell'Area Partner.",
  },
  income: {
    title: "Documento reddituale",
    filename: "documento-reddituale-demo.pdf",
    description: "Documento dimostrativo per il collaudo dell'Area Partner.",
  },
};

function pdfEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function buildPdf(document: DemoDocument) {
  const lines = [
    "BT",
    "/F1 20 Tf",
    "72 760 Td",
    `(${pdfEscape(document.title)}) Tj`,
    "0 -34 Td",
    "/F1 11 Tf",
    `(ECCOMI NOLEGGIO - PR21 PREVIEW SICURA) Tj`,
    "0 -24 Td",
    `(${pdfEscape(document.description)}) Tj`,
    "0 -20 Td",
    "(Cliente Demo - FIAT PANDA 1.0 Hybrid) Tj",
    "0 -20 Td",
    "(Questo file non contiene dati, documenti o informazioni reali.) Tj",
    "0 -20 Td",
    "(Serve esclusivamente a verificare Apri e Scarica nella preview.) Tj",
    "ET",
  ];
  const stream = lines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const document = DEMO_DOCUMENTS[slug];
  if (!document) return new Response("Documento demo non trovato.", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(buildPdf(document), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename=\"${document.filename}\"`,
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
