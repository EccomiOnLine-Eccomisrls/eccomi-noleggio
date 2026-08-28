import { getDb } from "../../../db";
import { partners, users } from "../../../db/schema";
import { ensurePracticeSchema } from "./practice-schema";
import { getRuntimeEnv } from "./runtime";

export async function seedSystemData(actorEmail: string, actorName: string) {
  await ensurePracticeSchema();
  const db = getDb();

  // Production bootstrap must only guarantee protected system identities.
  // Commercial partners and promotions are business data managed explicitly
  // by the CEO and must never be recreated after deletion.
  await db.insert(partners).values({
    id: "eccomi-direct",
    name: "ECCOMI",
    legalName: "ECCOMI SRLS",
    status: "ACTIVE",
  }).onConflictDoNothing();

  const ceoEmail = getRuntimeEnv().CEO_EMAIL?.trim().toLowerCase() || actorEmail;
  await db.insert(users).values({
    email: ceoEmail,
    displayName: actorName || "Salvatore Del Libano",
    role: "CEO",
    active: true,
  }).onConflictDoNothing();
}
