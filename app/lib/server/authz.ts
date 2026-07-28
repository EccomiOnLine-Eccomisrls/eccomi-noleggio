import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { readCeoSession } from "./ceo-session";
import { getRuntimeEnv } from "./runtime";

export type Actor = {
  email: string;
  displayName: string;
  role: "CEO" | "PARTNER";
  partnerId: string | null;
};

export async function getActorForIdentity(
  emailValue: string,
  displayName: string,
): Promise<Actor | null> {
  const runtime = getRuntimeEnv();
  const email = emailValue.trim().toLowerCase();

  if (!email) {
    return null;
  }

  const configuredCeo = runtime.CEO_EMAIL?.trim().toLowerCase();

  if (configuredCeo && email === configuredCeo) {
    return {
      email,
      displayName: displayName || "Salvatore Del Libano",
      role: "CEO",
      partnerId: null,
    };
  }

  const [record] = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.active, true)))
    .limit(1);

  if (
    !record ||
    (record.role !== "CEO" && record.role !== "PARTNER")
  ) {
    return null;
  }

  return {
    email: record.email,
    displayName: record.displayName,
    role: record.role,
    partnerId: record.partnerId,
  };
}

function headerName(request: Request): string | null {
  const encoded = request.headers.get(
    "oai-authenticated-user-full-name",
  );

  const encoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );

  if (
    !encoded ||
    encoding !== "percent-encoded-utf-8"
  ) {
    return null;
  }

  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function isLocalRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname;

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "terminal.local"
  );
}

export async function getActor(
  request: Request,
): Promise<Actor | null> {
  const runtime = getRuntimeEnv();

  const headerEmail = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();

  const sessionEmail = await readCeoSession(request);

  const localEmail = isLocalRequest(request)
    ? runtime.CEO_EMAIL || "ceo@eccomi.local"
    : "";

  const email =
    headerEmail ||
    sessionEmail ||
    localEmail;

  if (!email) {
    return null;
  }

  if (
    !headerEmail &&
    !sessionEmail &&
    isLocalRequest(request) &&
    !runtime.CEO_EMAIL
  ) {
    return {
      email,
      displayName:
        headerName(request) ||
        "Salvatore Del Libano",
      role: "CEO",
      partnerId: null,
    };
  }

  return getActorForIdentity(
    email,
    headerName(request) ||
      (sessionEmail
        ? "Salvatore Del Libano"
        : "Utente ECCOMI"),
  );
}

export async function requireActor(
  request: Request,
): Promise<Actor> {
  const actor = await getActor(request);

  if (!actor) {
    throw new Response(
      JSON.stringify({
        error: "Accesso non autorizzato.",
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

  return actor;
}

export async function requireCeo(
  request: Request,
): Promise<Actor> {
  const actor = await requireActor(request);

  if (actor.role !== "CEO") {
    throw new Response(
      JSON.stringify({
        error: "Azione riservata al CEO.",
      }),
      {
        status: 403,
        headers: {
          "content-type":
            "application/json; charset=utf-8",
        },
      },
    );
  }

  return actor;
}

export function routeError(
  error: unknown,
): Response {
  if (error instanceof Response) {
    return error;
  }

  const message =
    error instanceof Error
      ? error.message
      : "Errore inatteso.";

  return Response.json(
    {
      error: message,
    },
    {
      status: 500,
    },
  );
}