import { getDb } from "../../../db";
import { partners, promotions, users } from "../../../db/schema";
import { ensurePracticeSchema } from "./practice-schema";
import { getRuntimeEnv } from "./runtime";

export async function seedSystemData(actorEmail: string, actorName: string) {
  await ensurePracticeSchema();
  const db = getDb();
  await db.insert(partners).values([
    { id: "eccomi-direct", name: "ECCOMI", legalName: "ECCOMI SRLS", status: "ACTIVE" },
    { id: "goal-rent", name: "Goal Rent SRL", legalName: "Goal Rent SRL", status: "ACTIVE" },
  ]).onConflictDoNothing();

  const ceoEmail = getRuntimeEnv().CEO_EMAIL?.trim().toLowerCase() || actorEmail;
  await db.insert(users).values({
    email: ceoEmail,
    displayName: actorName || "Salvatore Del Libano",
    role: "CEO",
    active: true,
  }).onConflictDoNothing();

  await db.insert(promotions).values([
    {
      id: "promo-kia-66678832-001",
      offerNumber: "66678832/001",
      provider: "Ayvens / ALD",
      partnerId: "eccomi-direct",
      sourceLabel: "Caricata dal CEO",
      brand: "KIA",
      model: "Picanto 1.0 GDi AMT Urban",
      version: "KIA PICANTO 1.0 GDi AMT Urban Hatchback 5-door (Euro 6E)",
      monthlyGrossCents: 35474,
      monthlyNetCents: null,
      depositGrossCents: 0,
      durationMonths: 48,
      totalKm: 120000,
      validUntil: "2026-08-09",
      delivery: "Circa 9 settimane",
      fuel: "Benzina",
      transmission: "Automatico",
      color: "Clear White",
      powerKw: "46",
      servicesJson: JSON.stringify(["RCA", "Infortuni conducente", "Tutela legale", "Manutenzione", "Veicolo sostitutivo", "4 pneumatici estivi", "Telematica"]),
      warningsJson: JSON.stringify(["Bollo auto escluso dal canone", "Offerta valida salvo venduto"]),
      confidence: "alta",
      status: "PENDING_APPROVAL",
      coverKey: "asset:/offers/kia-picanto.png",
      createdBy: ceoEmail,
    },
    {
      id: "promo-fiat-4022049326",
      offerNumber: "4022049326",
      provider: "Leasys",
      partnerId: "goal-rent",
      sourceLabel: "Partner operativo",
      brand: "FIAT",
      model: "Pandina 3 Icon Hybrid",
      version: "PANDINA 1.0 FireFly 65cv SS 6m Hybrid",
      monthlyGrossCents: 49326,
      monthlyNetCents: null,
      depositGrossCents: 0,
      durationMonths: 36,
      totalKm: 80000,
      validUntil: "2026-07-27",
      delivery: "Entro 24 settimane",
      fuel: "Ibrido benzina",
      transmission: "Manuale",
      color: "Giallo Positano",
      powerKw: "51",
      servicesJson: JSON.stringify(["RCA", "PAI conducente", "Manutenzione", "Copertura danni", "Incendio e furto", "Traino standard", "I-Care Smart"]),
      warningsJson: JSON.stringify(["Bollo auto con riaddebito periodico", "Penali e franchigie previste"]),
      confidence: "alta",
      status: "PENDING_APPROVAL",
      createdBy: ceoEmail,
    },
  ]).onConflictDoNothing();
}
