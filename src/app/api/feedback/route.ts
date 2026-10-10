import { db } from "@/db";
import { explanationFeedback } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Below this many votes for a category, we don't show a trust percentage —
// a badge built on 2 votes would be misleading, not reassuring.
const MIN_VOTES_TO_SHOW = 5;

export async function POST(req: Request) {
  let body: { category?: string; useful?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const category = (body.category ?? "").toString().slice(0, 60);
  if (!category || typeof body.useful !== "boolean") {
    return Response.json({ ok: false }, { status: 400 });
  }

  try {
    await db?.insert(explanationFeedback).values({ category, useful: body.useful });
  } catch {
    // Best-effort only: never break the UX because feedback couldn't save.
  }

  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const category = new URL(req.url).searchParams.get("category")?.slice(0, 60) ?? "";
  if (!category || !db) {
    return Response.json({ total: 0, usefulPct: null });
  }

  try {
    const rows = await db
      .select({
        total: sql<number>`count(*)`,
        useful: sql<number>`count(*) filter (where ${explanationFeedback.useful} = true)`,
      })
      .from(explanationFeedback)
      .where(eq(explanationFeedback.category, category));

    const total = Number(rows[0]?.total ?? 0);
    const useful = Number(rows[0]?.useful ?? 0);
    if (total < MIN_VOTES_TO_SHOW) {
      return Response.json({ total, usefulPct: null });
    }
    return Response.json({ total, usefulPct: Math.round((useful / total) * 100) });
  } catch {
    return Response.json({ total: 0, usefulPct: null });
  }
}
