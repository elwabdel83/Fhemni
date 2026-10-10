import { db } from "@/db";
import { usageEvents } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = (body?.eventType ?? "unknown").toString().slice(0, 60);
    const category = body?.category ? body.category.toString().slice(0, 60) : null;
    await db?.insert(usageEvents).values({ eventType, category });
  } catch {
    // Never break the UX because of analytics.
  }
  return Response.json({ ok: true });
}
