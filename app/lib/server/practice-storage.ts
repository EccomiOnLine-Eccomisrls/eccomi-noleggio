import { getRuntimeEnv } from "./runtime";

const DEFAULT_BUCKET = "noleggio-documenti";

function storageConfig() {
  const env = getRuntimeEnv();
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
  if (!url || !serviceRoleKey) {
    throw new Error("Archivio documentale protetto non configurato.");
  }
  return { url, serviceRoleKey, bucket };
}

function safePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "file";
}

async function ensureBucket() {
  const { url, serviceRoleKey, bucket } = storageConfig();
  const response = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (response.ok) return;
  if (response.status !== 404) {
    throw new Error("Impossibile verificare l’archivio documentale.");
  }
  const create = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 10_485_760 }),
  });
  if (!create.ok && create.status !== 409) {
    throw new Error("Impossibile predisporre l’archivio documentale.");
  }
}

export async function uploadPracticeDocument(input: {
  practiceCode: string;
  documentType: string;
  file: File;
}) {
  await ensureBucket();
  const { url, serviceRoleKey, bucket } = storageConfig();
  const extension = safePart(input.file.name.split(".").pop() || "bin");
  const objectKey = `${safePart(input.practiceCode)}/${safePart(input.documentType)}/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${objectKey.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": input.file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: await input.file.arrayBuffer(),
    },
  );
  if (!response.ok) {
    throw new Error(`Caricamento non riuscito per ${input.file.name}.`);
  }
  return {
    bucket,
    objectKey,
    originalName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size,
  };
}

export async function createPracticeDocumentSignedUrl(objectKey: string, expiresIn = 900) {
  const { url, serviceRoleKey, bucket } = storageConfig();
  const response = await fetch(
    `${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectKey.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    },
  );
  if (!response.ok) throw new Error("Impossibile generare il collegamento protetto al documento.");
  const payload = await response.json() as { signedURL?: string; signedUrl?: string };
  const signedPath = payload.signedURL || payload.signedUrl;
  if (!signedPath) throw new Error("Collegamento protetto non disponibile.");
  return signedPath.startsWith("http") ? signedPath : `${url}/storage/v1${signedPath}`;
}
