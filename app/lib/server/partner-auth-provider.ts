import { getRuntimeEnv } from "./runtime";

type SupabaseAuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
type GenerateLinkResponse = SupabaseAuthUser & { hashed_token?: string; msg?: string; message?: string; error_description?: string };
type PasswordTokenResponse = { access_token?: string; refresh_token?: string; user?: SupabaseAuthUser; msg?: string; message?: string; error_description?: string };

function authConfig() {
  const runtime = getRuntimeEnv();
  const url = runtime.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceKey = runtime.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) throw new Error("Supabase Auth non configurato sul server.");
  return { url, serviceKey };
}
function authHeaders(serviceKey: string, bearer = serviceKey) { return { apikey: serviceKey, authorization: `Bearer ${bearer}`, "content-type": "application/json" }; }
function responseMessage(payload: Record<string, unknown>, fallback: string) {
  for (const key of ["message", "msg", "error_description", "error"]) { const value = payload[key]; if (typeof value === "string" && value.trim()) return value.trim(); }
  return fallback;
}

async function requestActivationToken(type: "invite" | "recovery", input: { email: string; displayName: string; partnerId: string }) {
  const { url, serviceKey } = authConfig();
  const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST", headers: authHeaders(serviceKey),
    body: JSON.stringify({ type, email: input.email, data: { display_name: input.displayName, eccomi_partner_id: input.partnerId, eccomi_role: "PARTNER_ADMIN" } }),
  });
  const payload = await response.json().catch(() => ({})) as GenerateLinkResponse;
  return { response, payload };
}

export async function generatePartnerActivationToken(input: { email: string; displayName: string; partnerId: string; existingAccount?: boolean }) {
  let type: "invite" | "recovery" = input.existingAccount ? "recovery" : "invite";
  let result = await requestActivationToken(type, input);
  if ((!result.response.ok || !result.payload.hashed_token) && type === "invite") {
    const message = responseMessage(result.payload as Record<string, unknown>, "");
    if (/already|registered|exists|exist/i.test(message)) {
      type = "recovery";
      result = await requestActivationToken(type, input);
    }
  }
  if (!result.response.ok || !result.payload.hashed_token) throw new Error(responseMessage(result.payload as Record<string, unknown>, "Supabase non ha generato il token di attivazione."));
  return { tokenHash: result.payload.hashed_token, type };
}

export async function verifyPartnerActivationToken(tokenHash: string, type: "invite" | "recovery") {
  const { url, serviceKey } = authConfig();
  const response = await fetch(`${url}/auth/v1/verify`, { method: "POST", headers: authHeaders(serviceKey), body: JSON.stringify({ token_hash: tokenHash, type }) });
  const payload = await response.json().catch(() => ({})) as PasswordTokenResponse;
  if (!response.ok || !payload.access_token || !payload.user?.email) throw new Error(responseMessage(payload as Record<string, unknown>, "Link di attivazione non valido o scaduto."));
  return { accessToken: payload.access_token, user: payload.user };
}

export async function authenticatePartnerPassword(email: string, password: string) {
  const { url, serviceKey } = authConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: authHeaders(serviceKey), body: JSON.stringify({ email, password }) });
  const payload = await response.json().catch(() => ({})) as PasswordTokenResponse;
  if (!response.ok || !payload.access_token || !payload.user?.email) throw new Error(responseMessage(payload as Record<string, unknown>, "Email o password non corretti."));
  return { accessToken: payload.access_token, user: payload.user };
}

export async function setSupabasePassword(accessToken: string, password: string) {
  const { url, serviceKey } = authConfig();
  const response = await fetch(`${url}/auth/v1/user`, { method: "PUT", headers: authHeaders(serviceKey, accessToken), body: JSON.stringify({ password }) });
  const payload = await response.json().catch(() => ({})) as SupabaseAuthUser & Record<string, unknown>;
  if (!response.ok || !payload.email) throw new Error(responseMessage(payload, "Impostazione password non riuscita."));
  return payload;
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[character] || character); }

export async function sendPartnerActivationEmail(input: { email: string; displayName: string; partnerName: string; activationUrl: string; resend?: boolean }) {
  const runtime = getRuntimeEnv(); const resendKey = runtime.RESEND_API_KEY?.trim(); const from = runtime.ECCOMI_FROM_EMAIL?.trim();
  if (!resendKey || !from) throw new Error("Resend non configurato sul server.");
  const subject = input.resend ? `Nuovo link di accesso ECCOMI NOLEGGIO · ${input.partnerName}` : `Attiva il tuo accesso ECCOMI NOLEGGIO · ${input.partnerName}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#10253e;line-height:1.55;max-width:680px;margin:auto"><div style="padding:22px 24px;background:#075392;color:#fff;border-radius:16px 16px 0 0"><strong style="font-size:22px">ECCOMI NOLEGGIO</strong><br><span style="opacity:.9">Area Partner</span></div><div style="padding:26px 24px;border:1px solid #dce6f1;border-top:0;border-radius:0 0 16px 16px"><h2 style="margin-top:0">${input.resend ? "Imposta una nuova password" : "Il tuo accesso è pronto"}</h2><p>Ciao ${escapeHtml(input.displayName)},</p><p>ECCOMI ti ha abilitato come <strong>Partner Admin</strong> per <strong>${escapeHtml(input.partnerName)}</strong>.</p><p>Usa il pulsante per verificare il link e scegliere la tua password personale.</p><p style="margin:26px 0"><a href="${escapeHtml(input.activationUrl)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#1478bd;color:#fff;text-decoration:none;font-weight:bold">Attiva Area Partner</a></p><p style="font-size:13px;color:#66768a">Il link è personale e monouso. Se scade, ECCOMI può reinviarlo dal Centro Accessi.</p></div></div>`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [input.email], subject, html }) });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) throw new Error(payload.message || "Invio email Resend non riuscito.");
  return { id: payload.id || null };
}
