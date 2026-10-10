import { answerFollowUpWithAI } from "@/lib/ai";
import { extractImportantInfo } from "@/lib/heuristics";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

// The client sends a short stable key (e.g. "ndir") rather than the full
// Darija sentence, so we can match it reliably. Before asking the AI we
// expand it back into a real, readable question.
const QUESTION_TEXT: Record<string, string> = {
  ndir: "شنو خاصني ندير؟",
  "fin nmchi": "فين خاصني نمشي؟",
  "chhal nkhlles": "شحال خاصني نخلص؟",
  "imta akher ajal": "إمتى آخر أجل؟",
  "fin nkhlles": "فين وكيفاش نخلص؟",
  "fuqach nmchi": "فوقاش خاصني نمشي؟",
  "chno njib": "شنو خاصني نجيب معايا؟",
  "chhal salaire": "شحال هو الأجر؟",
  "chhal muda": "شحال هي المدة؟",
  "fuqach ywsl": "فوقاش غادي يجي؟",
  "fin ywsl": "فين غادي يتسلم؟",
  "chkon khasso ydir": "شكون خاصو يدير هادشي؟",
  "3lach twslt": "علاش توصلت بهاد الورقة؟",
};

function canned(question: string, text: string): string {
  const info = extractImportantInfo(text);

  // Stable quick-question keys sent by the result screen's chips — matched
  // exactly first so new categories never fall through to the wrong branch.
  switch (question) {
    case "ndir":
      return "اقرا الشرح لي فوق مزيان، فيه الحاجات اللي خاصك تدير.";
    case "fin nmchi":
    case "fin ywsl":
      return info.addresses[0]
        ? `المكان اللي تحدث عليه النص هو: ${info.addresses[0]}`
        : "ما لقيتش شي مكان واضح فالنص.";
    case "fuqach nmchi":
    case "fuqach ywsl":
    case "imta akher ajal":
      return info.deadlines[0] || info.dates[0]
        ? `التاريخ المهم هو: ${info.deadlines[0] ?? info.dates[0]}`
        : "ما لقيتش شي تاريخ واضح فالنص.";
    case "chhal nkhlles":
    case "fin nkhlles":
      return info.amounts[0]
        ? `المبلغ اللي خاصك تخلص هو: ${info.amounts[0]}`
        : "ما لقيتش شي مبلغ واضح فالنص.";
    case "chhal salaire":
      return info.amounts[0]
        ? `الأجر اللي تحدث عليه النص هو: ${info.amounts[0]}`
        : "ما لقيتش شي رقم واضح للأجر فالنص.";
    case "chhal muda":
      return info.dates[0] || info.deadlines[0]
        ? `المدة أو التاريخ المرتبط هو: ${info.dates[0] ?? info.deadlines[0]}`
        : "ما لقيتش شي مدة واضحة فالنص.";
    case "chno njib":
      return "اقرا الشرح لي فوق مزيان، غالبا كاين فيه لائحة الوثائق اللي خاصك تجيب.";
    case "chkon khasso ydir":
      return "هاد الوثيقة موجهة للشخص اللي سميتو مكتوبة فيها — اقرا الشرح لي فوق باش تتأكد واش هي ليك نتا بالضبط ولا لشي حد آخر.";
    case "3lach twslt":
      return "ما قدرتش نتأكد 100% علاش توصلت بهاد الورقة بلا الخدمة الذكية — اقرا نوع الوثيقة والشرح لي فوق، كيعطيوك فكرة.";
  }

  // Freeform fallback, for a question the person typed themselves rather
  // than a known chip key — looser substring matching.
  if (/ndir/i.test(question)) {
    return "اقرا الشرح لي فوق مزيان، فيه الحاجات اللي خاصك تدير.";
  }
  if (/nmchi|fin/i.test(question)) {
    return info.addresses[0]
      ? `المكان اللي تحدث عليه النص هو: ${info.addresses[0]}`
      : "ما لقيتش شي مكان واضح فالنص.";
  }
  if (/nkhlles|ch7al|chhal/i.test(question)) {
    return info.amounts[0]
      ? `المبلغ اللي تحدث عليه النص هو: ${info.amounts[0]}`
      : "ما لقيتش شي مبلغ واضح فالنص.";
  }
  if (/imta|akher|délai|delai|fuqach/i.test(question)) {
    return info.deadlines[0] || info.dates[0]
      ? `التاريخ المهم هو: ${info.deadlines[0] ?? info.dates[0]}`
      : "ما لقيتش شي تاريخ واضح فالنص.";
  }
  return "ما قدرتش نجاوب بالتفصيل دابا، اقرا الشرح لي فوق.";
}

export async function POST(req: Request) {
  let body: { text?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const text = (body.text ?? "").toString();
  const question = (body.question ?? "").toString();
  if (!text || !question) {
    return Response.json({ error: "missing fields" }, { status: 400 });
  }

  const readableQuestion = QUESTION_TEXT[question] ?? question;
  const aiAnswer = await answerFollowUpWithAI(text, readableQuestion);
  const answer = aiAnswer ?? canned(question, text);
  return Response.json({ answer });
}
