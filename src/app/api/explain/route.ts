import { db } from "@/db";
import { usageEvents } from "@/db/schema";
import { explainWithAI } from "@/lib/ai";
import { heuristicExplain } from "@/lib/heuristics";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function POST(req: Request) {
  let body: { text?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "هاد الطلب ما بانش مزيان." },
      { status: 400 },
    );
  }

  const text = (body.text ?? "").toString().trim();
  if (!text) {
    return Response.json(
      { error: "ما لقيتش شي نص. صور الورقة مرة أخرى وإلا الصق النص." },
      { status: 400 },
    );
  }

  let result = await explainWithAI(text);
  if (!result) {
    result = heuristicExplain(text);
  }

  // Best-effort, privacy-friendly analytics: never await-block the user, and
  // never store the document content itself. Silently skipped if no
  // database is configured.
  db?.insert(usageEvents)
    .values({ eventType: `explain_${body.source ?? "unknown"}`, category: result.category })
    .catch(() => {});

  return Response.json(result);
}
