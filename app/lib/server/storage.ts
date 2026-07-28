import { getRuntimeEnv } from "./runtime";

type StoredObject = {
  bytes: ArrayBuffer;
  contentType: string | null;
};

function storageConfig() {
  const runtime = getRuntimeEnv();

  const supabaseUrl = runtime.SUPABASE_URL
    ?.trim()
    .replace(/\/$/, "");

  const serviceRoleKey =
    runtime.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const bucket =
    runtime.SUPABASE_STORAGE_BUCKET?.trim() ||
    "eccomi-noleggio";

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL mancante.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY mancante.",
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  };
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function storageHeaders(
  serviceRoleKey: string,
  extra: Record<string, string> = {},
) {
  return {
    authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    ...extra,
  };
}

async function throwStorageError(
  response: Response,
  operation: string,
): Promise<never> {
  const detail = (
    await response.text().catch(() => "")
  ).slice(0, 500);

  throw new Error(
    `${operation} Supabase Storage fallita ` +
      `(${response.status})` +
      (detail ? `: ${detail}` : "."),
  );
}

export async function storagePut(
  key: string,
  value: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  } = storageConfig();

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/` +
      `${encodeURIComponent(bucket)}/` +
      encodeStoragePath(key),
    {
      method: "POST",
      headers: storageHeaders(serviceRoleKey, {
        "content-type": contentType,
        "x-upsert": "true",
      }),
      body: value,
    },
  );

  if (!response.ok) {
    await throwStorageError(response, "Upload");
  }
}

export async function storageGet(
  key: string,
): Promise<StoredObject | null> {
  const {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  } = storageConfig();

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/` +
      `${encodeURIComponent(bucket)}/` +
      encodeStoragePath(key),
    {
      method: "GET",
      headers: storageHeaders(serviceRoleKey),
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    await throwStorageError(response, "Download");
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType:
      response.headers.get("content-type"),
  };
}

export async function storageDelete(
  key: string,
): Promise<void> {
  const {
    supabaseUrl,
    serviceRoleKey,
    bucket,
  } = storageConfig();

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/` +
      `${encodeURIComponent(bucket)}/` +
      encodeStoragePath(key),
    {
      method: "DELETE",
      headers: storageHeaders(serviceRoleKey),
    },
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    await throwStorageError(
      response,
      "Eliminazione",
    );
  }
}
