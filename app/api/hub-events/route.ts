import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { hubEvents } from "../../../db/schema";
import { requireCeo, routeError } from "../../lib/server/authz";

export async function GET(request: Request) {
  try {
    await requireCeo(request);
    const events = await getDb()
      .select()
      .from(hubEvents)
      .orderBy(desc(hubEvents.createdAt))
      .limit(500);
    return Response.json({ events });
  } catch (error) {
    return routeError(error);
  }
}
