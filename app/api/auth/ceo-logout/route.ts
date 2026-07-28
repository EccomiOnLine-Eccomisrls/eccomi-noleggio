import { clearCeoSessionCookie } from "../../../lib/server/ceo-session";
import { routeError } from "../../../lib/server/authz";

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

    return Response.json(
      {
        ok: true,
      },
      {
        headers: {
          "set-cookie": clearCeoSessionCookie(),
        },
      },
    );
  } catch (error) {
    return routeError(error);
  }
}
