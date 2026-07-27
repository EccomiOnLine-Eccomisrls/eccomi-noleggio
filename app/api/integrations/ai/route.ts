import { getDb } from "../../../../db";
import { auditLogs } from "../../../../db/schema";
import { connectAiIntegration, getAiConnectionStatus } from "../../../lib/server/ai";
import { requireCeo, routeError } from "../../../lib/server/authz";

function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (new URL(origin).host !== new URL(request.url).host) {
    throw new Response(JSON.stringify({ error: "Richiesta non autorizzata." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

export async function GET(request: Request) {
  try {
    await requireCeo(request);
    return Response.json({ ai: await getAiConnectionStatus() });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requireCeo(request);
    const body = await request.json() as { apiKey?: unknown; textModel?: unknown };
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";
    const textModel = typeof body.textModel === "string" ? body.textModel : undefined;
    const ai = await connectAiIntegration({ apiKey, textModel, actorEmail: actor.email });
    await getDb().insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorEmail: actor.email,
      action: "OPENAI_CONNECTED",
      entityType: "integration",
      entityId: "openai-primary",
      payloadJson: JSON.stringify({ textModel: ai.textModel, imageModel: ai.imageModel, verifiedAt: ai.verifiedAt }),
    });
    return Response.json({ ok: true, ai });
  } catch (error) {
    return routeError(error);
  }
}
