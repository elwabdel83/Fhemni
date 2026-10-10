import { isAIConfigured, translateToDarijaWithAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

const LANGUAGE_LABELS: Record<string, string> = {
  auto: "automatique",
  fr: "français",
  en: "anglais",
  es: "espagnol",
  ar: "arabe littéraire",
};

export async function POST(req: Request) {
  let body: { text?: string; sourceLang?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صحيح." }, { status: 400 });
  }

  const text = (body.text ?? "").toString().trim();
  if (!text) {
    return Response.json({ error: "ما كاين والو باش نترجموه." }, { status: 400 });
  }
  if (text.length > 2000) {
    return Response.json({ error: "هاد النص طويل بزاف. جرب جملة أقصر." }, { status: 400 });
  }

  if (!isAIConfigured()) {
    return Response.json(
      { error: "🔧 ميزة الترجمة خاصها اتصال بالذكاء الاصطناعي. تكلم مع اللي دار الأبليكاسيون." },
      { status: 503 },
    );
  }

  const sourceLabel = LANGUAGE_LABELS[body.sourceLang ?? "auto"] ?? "automatique";
  const result = await translateToDarijaWithAI(text, sourceLabel);
  if (!result) {
    return Response.json({ error: "ما قدرتش نترجم دابا. عاود جرب." }, { status: 502 });
  }

  return Response.json({ originalText: text, ...result });
}
