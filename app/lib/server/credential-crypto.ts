import { getRuntimeEnv } from "./runtime";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PURPOSES = {
  shopify: encoder.encode("ECCOMI_NOLEGGIO_SHOPIFY_CREDENTIALS_V1"),
  openai: encoder.encode("ECCOMI_NOLEGGIO_OPENAI_CREDENTIALS_V1"),
} as const;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey() {
  const configured = getRuntimeEnv().SHOPIFY_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!configured) throw new Error("Protezione delle credenziali non ancora predisposta.");
  const raw = base64UrlToBytes(configured);
  if (raw.byteLength !== 32) throw new Error("Configurazione di sicurezza delle credenziali non valida.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptForPurpose(value: string, purpose: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: purpose },
    await encryptionKey(),
    encoder.encode(value),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptForPurpose(value: string, purpose: Uint8Array) {
  const [version, ivValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !ciphertextValue) throw new Error("Credenziale archiviata in formato non valido.");
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(ivValue), additionalData: purpose },
      await encryptionKey(),
      base64UrlToBytes(ciphertextValue),
    );
    return decoder.decode(decrypted);
  } catch {
    throw new Error("Impossibile leggere in sicurezza la credenziale.");
  }
}

export function encryptCredential(value: string) {
  return encryptForPurpose(value, PURPOSES.shopify);
}

export function decryptCredential(value: string) {
  return decryptForPurpose(value, PURPOSES.shopify);
}

export function encryptOpenAiCredential(value: string) {
  return encryptForPurpose(value, PURPOSES.openai);
}

export function decryptOpenAiCredential(value: string) {
  return decryptForPurpose(value, PURPOSES.openai);
}
