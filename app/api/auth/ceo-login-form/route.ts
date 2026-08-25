import { POST as loginWithJson } from "../ceo-login/route";
import { publicUrl } from "../../../lib/server/public-url";

function safeReturnTo(value: FormDataEntryValue | null) {
  const target = typeof value === "string" ? value : "/ceo";
  return target === "/ceo" || target.startsWith("/ceo?")
    ? target
    : "/ceo";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safeReturnTo(form.get("returnTo"));
  const headers = new Headers();
  const origin = request.headers.get("origin");

  headers.set("content-type", "application/json");
  if (origin) headers.set("origin", origin);

  const loginResponse = await loginWithJson(
    new Request(new URL("/api/auth/ceo-login", request.url), {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      }),
    }),
  );

  if (!loginResponse.ok) {
    const payload = (await loginResponse.json().catch(() => ({}))) as {
      error?: string;
    };
    const target = publicUrl(request, "/ceo");
    target.searchParams.set("loginError", payload.error || "Accesso non riuscito.");
    return Response.redirect(target, 303);
  }

  const responseHeaders = new Headers();
  const sessionCookie = loginResponse.headers.get("set-cookie");
  if (sessionCookie) responseHeaders.set("set-cookie", sessionCookie);

  return new Response(null, {
    status: 303,
    headers: {
      ...Object.fromEntries(responseHeaders.entries()),
      location: publicUrl(request, returnTo).toString(),
    },
  });
}
