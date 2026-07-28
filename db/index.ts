import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL mancante");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        databaseUrl.includes("localhost") ||
        databaseUrl.includes("127.0.0.1")
          ? false
          : {
              rejectUnauthorized: false,
            },
      max: 5,
    });
  }

  if (!db) {
    db = drizzle(pool, { schema });
  }

  return db;
}
