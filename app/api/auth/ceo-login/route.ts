import {
  ceoSessionCookie,
  createCeoSession,
} from "../../../lib/server/ceo-session";
import { routeError } from "../../../lib/server/authz";
import { getRuntimeEnv } from "../../../lib/server/runtime";

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return;
  }

  if (new URL(origin).host !== new URL(request.url).host) {
    throw new Response(
      JSON.stringify({
        error: "Richiesta non autorizzata.",
      }),
      {
        status: 403,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);

    const runtime = getRuntimeEnv();

    const configuredEmail = runtime.CEO_EMAIL
      ?.trim()
      .toLowerCase();

    const configuredPassword =
      runtime.CEO_ACCESS_PASSWORD?.trim();

    if (!configuredEmail || !configuredPassword) {
      throw new Error(
        "Accesso CEO non configurato sul server.",
      );
    }

    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
    };

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      email !== configuredEmail ||
      password !== configuredPassword
    ) {
      throw new Response(
        JSON.stringify({
          error: "Email o password non corretti.",
        }),
        {
          status: 401,
          headers: {
            "content-type":
              "application/json; charset=utf-8",
          },
        },
      );
    }

    const session = await createCeoSession(email);

    return Response.json(
      {
        ok: true,
        actor: {
          email,
          displayName: "Salvatore Del Libano",
          role: "CEO",
        },
      },
      {
        headers: {
          "set-cookie": ceoSessionCookie(session),
        },
      },
    );
  } catch (error) {
    return routeError(error);
  }
}
