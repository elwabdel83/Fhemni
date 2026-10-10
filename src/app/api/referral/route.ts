import { db } from "@/db";
import { referralCompletions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const code = (body.code ?? "").toString().trim().slice(0, 20);
  if (!code) return Response.json({ ok: false }, { status: 400 });

  try {
    await db?.insert(referralCompletions).values({ code });
  } catch {
    // best-effort only
  }
  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim().slice(0, 20) ?? "";
  if (!code || !db) return Response.json({ count: 0 });

  try {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(referralCompletions)
      .where(eq(referralCompletions.code, code));
    return Response.json({ count: Number(rows[0]?.count ?? 0) });
  } catch {
    return Response.json({ count: 0 });
  }
}
