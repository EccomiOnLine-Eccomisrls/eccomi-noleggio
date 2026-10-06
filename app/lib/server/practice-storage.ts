import { getRuntimeEnv } from "./runtime";
import {
  PRACTICE_DOCUMENT_ALLOWED_MIME_TYPES,
  PRACTICE_DOCUMENT_MAX_BYTES,
  practiceDocumentExtensionForMime,
} from "./practice-document-upload";

const DEFAULT_BUCKET = "noleggio-documenti";

function normalizeSupabaseUrl(value: string | undefined) {
  const raw = value?.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (!parsed.hostname.endsWith(".supabase.co")) return "";
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return "";
    }
  }

  if (/^(postgres|postgresql):\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const match = parsed.hostname.match(/^db\.([a-z0-9-]+)\.supabase\.co$/i);
      return match ? `https://${match[1]}.supabase.co` : "";
    } catch {
      return "";
    }
  }

  if (/^[a-z0-9-]{8,}$/i.test(raw)) return `https://${raw}.supabase.co`;
  return "";
}

function storageConfig() {
  const env = getRuntimeEnv();
  const url = normalizeSupabaseUrl(env.SUPABASE_URL);
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^['"]|['"]$/g, "");
  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;

  if (!url) {
    throw new Error("SUPABASE_URL non valida: inserisci l’URL progetto nel formato https://xxxxx.supabase.co.");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurata per l’archivio documentale.");
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

async function storageFetch(url: string, init: RequestInit, context: string) {
  try {
    return await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "errore di rete";
    throw new Error(`${context}: ${detail}`);
  }
}

async function ensureBucket() {
  const { url, serviceRoleKey, bucket } = storageConfig();
  const bucketUrl =
    `${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`;
  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };
  const desiredMimeTypes = [
    ...PRACTICE_DOCUMENT_ALLOWED_MIME_TYPES,
  ];

  const response = await storageFetch(
    bucketUrl,
    { headers },
    "Verifica archivio documentale non riuscita",
  );

  if (response.status === 404) {
    const create = await storageFetch(
      `${url}/storage/v1/bucket`,
      {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: bucket,
          name: bucket,
          public: false,
          file_size_limit: PRACTICE_DOCUMENT_MAX_BYTES,
          allowed_mime_types: desiredMimeTypes,
        }),
      },
      "Creazione archivio documentale non riuscita",
    );

    if (!create.ok && create.status !== 409) {
      const detail =
        await create.text().catch(() => "");
      throw new Error(
        `Impossibile predisporre l’archivio documentale${detail ? `: ${detail.slice(0, 180)}` : "."}`,
      );
    }

    return;
  }

  if (!response.ok) {
    const detail =
      await response.text().catch(() => "");
    throw new Error(
      `Impossibile verificare l’archivio documentale${detail ? `: ${detail.slice(0, 180)}` : "."}`,
    );
  }

  const current = await response.json() as {
    public?: boolean;
    file_size_limit?: number | null;
    allowed_mime_types?: string[] | null;
  };

  const currentMimeTypes =
    Array.isArray(current.allowed_mime_types)
      ? [...current.allowed_mime_types].sort()
      : [];
  const expectedMimeTypes =
    [...desiredMimeTypes].sort();

  const mimePolicyMatches =
    currentMimeTypes.length === expectedMimeTypes.length
    && currentMimeTypes.every(
      (value, index) =>
        value === expectedMimeTypes[index],
    );

  const needsHardening =
    current.public !== false
    || current.file_size_limit
      !== PRACTICE_DOCUMENT_MAX_BYTES
    || !mimePolicyMatches;

  if (!needsHardening) {
    return;
  }

  const update = await storageFetch(
    bucketUrl,
    {
      method: "PUT",
      headers: {
        ...headers,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: false,
        file_size_limit: PRACTICE_DOCUMENT_MAX_BYTES,
        allowed_mime_types: desiredMimeTypes,
      }),
    },
    "Aggiornamento sicurezza archivio documentale non riuscito",
  );

  if (!update.ok) {
    const detail =
      await update.text().catch(() => "");
    throw new Error(
      `Impossibile applicare i vincoli di sicurezza all’archivio documentale${detail ? `: ${detail.slice(0, 180)}` : "."}`,
    );
  }
}

export async function uploadPracticeDocument(input: {
  practiceCode: string;
  documentType: string;
  file: File;
}) {
  await ensureBucket();
  const { url, serviceRoleKey, bucket } = storageConfig();
  const extension =
    practiceDocumentExtensionForMime(
      input.file.type,
    );
  const objectKey = `${safePart(input.practiceCode)}/${safePart(input.documentType)}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;

  const response = await storageFetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": input.file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: await input.file.arrayBuffer(),
  }, `Caricamento non riuscito per ${input.file.name}`);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Caricamento non riuscito per ${input.file.name}${detail ? `: ${detail.slice(0, 180)}` : "."}`);
  }

  return {
    bucket,
    objectKey,
    originalName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    sizeBytes: input.file.size,
  };
}


export function practiceDocumentObjectKey(input: {
  practiceCode: string;
  documentType: string;
  uploadId: string;
  originalName: string;
  mimeType: string;
}) {
  const extension =
    practiceDocumentExtensionForMime(
      input.mimeType,
    );

  return `${safePart(input.practiceCode)}/${safePart(input.documentType)}/${safePart(input.uploadId)}.${extension}`;
}

export async function createPracticeDocumentSignedUpload(input: {
  practiceCode: string;
  documentType: string;
  uploadId: string;
  originalName: string;
  mimeType: string;
}) {
  await ensureBucket();

  const { url, serviceRoleKey, bucket } = storageConfig();
  const objectKey = practiceDocumentObjectKey(input);
  const signUrl =
    `${url}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/`
    + objectKey.split("/").map(encodeURIComponent).join("/");

  const response = await storageFetch(
    signUrl,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        "x-upsert": "false",
      },
      body: "{}",
    },
    "Generazione URL firmata di upload non riuscita",
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Impossibile predisporre il caricamento diretto${detail ? `: ${detail.slice(0, 180)}` : "."}`,
    );
  }

  const payload = await response.json() as {
    url?: string;
    signedUrl?: string;
    signedURL?: string;
  };

  const signedPath =
    payload.signedUrl
    || payload.signedURL
    || payload.url;

  if (!signedPath) {
    throw new Error(
      "URL firmata di upload non disponibile.",
    );
  }

  const signedUrl = signedPath.startsWith("http")
    ? signedPath
    : `${url}/storage/v1${signedPath.startsWith("/") ? signedPath : `/${signedPath}`}`;

  return {
    bucket,
    objectKey,
    signedUrl,
  };
}

export async function getPracticeDocumentObjectInfo(
  objectKey: string,
) {
  const { url, serviceRoleKey, bucket } = storageConfig();
  const infoUrl =
    `${url}/storage/v1/object/info/${encodeURIComponent(bucket)}/`
    + objectKey.split("/").map(encodeURIComponent).join("/");

  const response = await storageFetch(
    infoUrl,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
    "Verifica documento caricato non riuscita",
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Impossibile verificare il documento caricato${detail ? `: ${detail.slice(0, 180)}` : "."}`,
    );
  }

  const payload = await response.json() as {
    size?: number;
    mimetype?: string;
    mimeType?: string;
    metadata?: {
      size?: number;
      mimetype?: string;
      mimeType?: string;
      contentType?: string;
    };
  };

  const sizeBytes =
    typeof payload.size === "number"
      ? payload.size
      : typeof payload.metadata?.size === "number"
        ? payload.metadata.size
        : null;

  const mimeType =
    payload.mimetype
    || payload.mimeType
    || payload.metadata?.mimetype
    || payload.metadata?.mimeType
    || payload.metadata?.contentType
    || null;

  return {
    bucket,
    objectKey,
    sizeBytes,
    mimeType,
  };
}

export async function createPracticeDocumentSignedUrl(objectKey: string, expiresIn = 900) {
  const { url, serviceRoleKey, bucket } = storageConfig();
  const response = await storageFetch(
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
    "Generazione collegamento protetto non riuscita",
  );
  if (!response.ok) throw new Error("Impossibile generare il collegamento protetto al documento.");
  const payload = await response.json() as { signedURL?: string; signedUrl?: string };
  const signedPath = payload.signedURL || payload.signedUrl;
  if (!signedPath) throw new Error("Collegamento protetto non disponibile.");
  return signedPath.startsWith("http") ? signedPath : `${url}/storage/v1${signedPath}`;
}
