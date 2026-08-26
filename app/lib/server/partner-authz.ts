import { isPartnerNoleggioRole } from "../permissions";
import { requireActor, type Actor } from "./authz";

export type PartnerActor = Actor & { partnerId: string };

export async function requirePartnerActor(request: Request): Promise<PartnerActor> {
  const actor = await requireActor(request);
  if (!isPartnerNoleggioRole(actor.role) || !actor.partnerId) {
    throw new Response(JSON.stringify({ error: "Area riservata agli account Partner." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return actor as PartnerActor;
}

export function assertPartnerScope(actor: PartnerActor, entityPartnerId: string | null | undefined) {
  if (!entityPartnerId || actor.partnerId !== entityPartnerId) {
    throw new Response(JSON.stringify({ error: "Risorsa non autorizzata per questo Partner." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
