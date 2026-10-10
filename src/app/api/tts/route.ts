import { ttsWithAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const text = (body.text ?? "").toString().trim();
  if (!text) return new Response(null, { status: 400 });

  const audio = await ttsWithAI(text);
  if (!audio) {
    // No server voice available: the client will fall back to the
    // browser's built-in speech synthesis automatically.
    return new Response(null, { status: 204 });
  }

  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
