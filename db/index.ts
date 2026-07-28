import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL mancante");
  }

  if (!client) {
    client = postgres(databaseUrl, {
      prepare: false,
    });
  }

  if (!db) {
    db = drizzle(client, { schema });
  }

  return db;
}