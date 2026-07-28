type R2HttpMetadata = { contentType?: string };

type R2ObjectBodyLike = {
  body: ReadableStream;
  httpMetadata?: R2HttpMetadata;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type R2BucketLike = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: R2HttpMetadata; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
};

type FetcherLike = { fetch(request: Request): Promise<Response> };

export type EccomiRuntimeEnv = {
  DB: unknown;
  BUCKET: R2BucketLike;
  ASSETS: FetcherLike;
  CEO_EMAIL?: string;
  SHOPIFY_SHOP_DOMAIN?: string;
  SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
  SHOPIFY_ONLINE_STORE_PUBLICATION_ID?: string;
  SHOPIFY_CREDENTIALS_ENCRYPTION_KEY?: string;
  SHOPIFY_PUBLISHING_ENABLED?: string;
  SHOPIFY_API_VERSION?: string;
  SHOPIFY_NOLEGGIO_TEMPLATE_SUFFIX?: string;
  SHOPIFY_NOLEGGIO_COLLECTION_HANDLE?: string;
  PUBLIC_REQUEST_BASE_URL?: string;
  PUBLIC_SHOWROOM_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TEXT_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  CRON_SECRET?: string;
  HUB_READ_SECRET?: string;
};

const runtimeGlobal = globalThis as typeof globalThis & { __ECCOMI_RUNTIME_ENV__?: EccomiRuntimeEnv };

export function installRuntimeEnv(value: unknown) {
  runtimeGlobal.__ECCOMI_RUNTIME_ENV__ = value as EccomiRuntimeEnv;
}

export function getRuntimeEnv(): EccomiRuntimeEnv {
  const installedRuntime = runtimeGlobal.__ECCOMI_RUNTIME_ENV__;

  if (installedRuntime) {
    return installedRuntime;
  }

  if (typeof process !== "undefined" && process.env) {
    return process.env as EccomiRuntimeEnv;
  }

  throw new Error("Ambiente ECCOMI NOLEGGIO non disponibile.");
}
