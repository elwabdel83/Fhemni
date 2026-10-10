import { categoryLabelDarija, detectCategory, extractImportantInfo, needsSafetyDisclaimer } from "./heuristics";
import type { DocumentStatus, ExplanationResult } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

// Serverless hosts (Vercel's Hobby plan in particular) kill a function
// after a fixed wall-clock budget — around 10s by default. Without our own
// timeout, a single slow/hanging call to an AI provider eats that whole
// budget, the platform kills the function with no clean response, and the
// person's browser is left spinning with nothing to show for it. Every
// outbound AI call below is wrapped in this so it fails fast and visibly
// instead, well before the platform would kill it.
const AI_FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Google renames and retires Gemini model aliases frequently. We try them
// in order and use the first one that actually responds, instead of
// hardcoding a single name that can silently start 404ing after an update.
const GEMINI_MODEL_CANDIDATES = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];

async function callGemini(geminiKey: string, body: object): Promise<unknown | null> {
  for (const model of GEMINI_MODEL_CANDIDATES) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        // Visible in the terminal running `npm run dev` / server logs —
        // the fastest way to see *why* a translation failed.
        const errText = await res.text().catch(() => "");
        console.error(`[Fhemni] Gemini (${model}) responded ${res.status}: ${errText.slice(0, 300)}`);
        continue; // try the next candidate model
      }
      return await res.json();
    } catch (err) {
      console.error(`[Fhemni] Gemini (${model}) request failed:`, err);
    }
  }
  return null;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

/**
 * Calls whichever AI provider is configured (OpenAI first if both are set)
 * and returns the parsed JSON response. Centralizes the provider-specific
 * request/response shape so callers don't need to care which one is active.
 */
async function callLLMJson(systemPrompt: string, userContent: string): Promise<unknown | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetchWithTimeout(OPENAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[Fhemni] OpenAI responded ${res.status}: ${errText.slice(0, 300)}`);
        return null;
      }
      const data = await res.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      return content ? JSON.parse(content) : null;
    } catch (err) {
      console.error("[Fhemni] OpenAI request failed:", err);
      return null;
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const data = await callGemini(geminiKey, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    });
    const content = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      ?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch (err) {
      console.error("[Fhemni] Gemini returned non-JSON content:", err, content.slice(0, 300));
      return null;
    }
  }

  return null;
}

/** Same provider selection as callLLMJson, but for a plain text answer
 * (no JSON) — used for quick follow-up questions. */
async function callLLMText(systemPrompt: string, userContent: string): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetchWithTimeout(OPENAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[Fhemni] OpenAI responded ${res.status}: ${errText.slice(0, 300)}`);
        return null;
      }
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      console.error("[Fhemni] OpenAI request failed:", err);
      return null;
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const data = await callGemini(geminiKey, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.4 },
    });
    const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      ?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() ?? null;
  }

  return null;
}

const SYSTEM_PROMPT = `Tu es un assistant marocain très bienveillant. Un utilisateur qui a du mal à lire le
français ou l'arabe littéraire te donne un texte (lettre, SMS, WhatsApp, facture, contrat...).
Ta mission : lui expliquer CE QUE ÇA VEUT DIRE, en Darija marocaine NATURELLE, écrite en
caractères ARABES (pas de translittération latine), comme on parle vraiment dans la rue au
Maroc. Ne traduis jamais mot à mot : donne le sens réel, de façon simple, chaleureuse, brève.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, avec exactement ces clés :
{
  "category": "courte étiquette en français, ex: Lettre administrative",
  "categoryEmoji": "un seul emoji représentatif",
  "explanation": "explication en darija (arabe), 2-4 phrases, naturelle",
  "simpleExplanation": "version encore plus courte et simple en darija (arabe), 1 phrase",
  "actions": ["liste de 1 à 4 actions concrètes à faire, en darija (arabe), phrases courtes"],
  "dates": ["dates importantes trouvées dans le texte, telles quelles"],
  "deadlines": ["dates limites / délais importants, telles quelles"],
  "amounts": ["montants d'argent trouvés, tels quels"],
  "addresses": ["adresses ou lieux importants trouvés"],
  "phones": ["numéros de téléphone trouvés"],
  "isSensitive": true/false (true si document médical, juridique, ou administratif important nécessitant prudence),
  "status": "accepted" | "rejected" | "attention" | "unclear" — le statut réel de la situation décrite : "accepted" seulement si le texte confirme clairement une acceptation/approbation, "rejected" si clairement refusé, "attention" s'il y a une action ou un délai important à respecter, "unclear" si tu n'es pas sûr à 100% — préfère TOUJOURS "unclear" à une fausse certitude, surtout pour "accepted",
  "confidenceWarning": "si le texte fourni semble incomplet, coupé ou peu clair, une courte phrase en darija (arabe) qui le dit gentiment, sinon null"
}
Ne mets jamais de diagnostic médical ni de conseil juridique définitif. Reste factuel sur ce que dit le document.`;

type AIJson = {
  category?: string;
  categoryEmoji?: string;
  explanation?: string;
  simpleExplanation?: string;
  actions?: string[];
  dates?: string[];
  deadlines?: string[];
  amounts?: string[];
  addresses?: string[];
  phones?: string[];
  isSensitive?: boolean;
  status?: string;
  confidenceWarning?: string | null;
};

const VALID_STATUSES: DocumentStatus[] = ["accepted", "rejected", "attention", "unclear"];

export async function explainWithAI(rawText: string): Promise<ExplanationResult | null> {
  const parsed = (await callLLMJson(
    SYSTEM_PROMPT,
    `Voici le texte à expliquer :\n"""${rawText.slice(0, 6000)}"""`,
  )) as AIJson | null;
  if (!parsed) return null;

  try {
    // Belt-and-braces: also run our own regex extraction and merge, in case
    // the model missed an entity.
    const localInfo = extractImportantInfo(rawText);
    const fallbackCategory = detectCategory(rawText);

    const categoryKey = parsed.isSensitive ? detectCategory(rawText).key : fallbackCategory.key;

    const merge = (a?: string[], b?: string[]) =>
      Array.from(new Set([...(a ?? []), ...(b ?? [])])).slice(0, 5);

    return {
      originalText: rawText,
      category: parsed.category?.trim() || fallbackCategory.label,
      categoryDarija: categoryLabelDarija(categoryKey),
      categoryEmoji: parsed.categoryEmoji?.trim() || fallbackCategory.emoji,
      explanation: parsed.explanation?.trim() || "ما قدرتش نشرح هاد النص دابا.",
      simpleExplanation: parsed.simpleExplanation?.trim() || parsed.explanation?.trim() || "",
      actions: parsed.actions?.length ? parsed.actions : ["اقرا الشرح مزيان."],
      importantInfo: {
        dates: merge(parsed.dates, localInfo.dates),
        deadlines: merge(parsed.deadlines, localInfo.deadlines),
        amounts: merge(parsed.amounts, localInfo.amounts),
        addresses: merge(parsed.addresses, localInfo.addresses),
        phones: merge(parsed.phones, localInfo.phones),
      },
      disclaimer: parsed.isSensitive
        ? (needsSafetyDisclaimer(categoryKey) ?? needsSafetyDisclaimer("administration"))
        : needsSafetyDisclaimer(categoryKey),
      confidenceWarning: parsed.confidenceWarning ?? null,
      usedAI: true,
      status: VALID_STATUSES.includes(parsed.status as DocumentStatus)
        ? (parsed.status as DocumentStatus)
        : "unclear",
    };
  } catch {
    return null;
  }
}

export async function translateToDarijaWithAI(
  text: string,
  sourceLanguageLabel: string,
): Promise<{ darija: string; darijaLatin: string } | null> {
  const systemPrompt = `Tu es un traducteur marocain. On te donne une phrase dite à l'oral (langue source : ${sourceLanguageLabel}, ou détecte-la toi-même si "automatique"). Traduis-la en Darija marocaine NATURELLE, celle qu'on parle vraiment dans la rue, jamais une traduction mot à mot ni de l'arabe littéraire. Reste fidèle au sens et au ton (poli, familier, urgent...).
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, avec exactement ces clés :
{
  "darija": "la traduction en darija, écrite en caractères ARABES",
  "darijaLatin": "la même traduction transcrite en arabizi (lettres latines, chiffres pour les sons arabes comme 3, 7, 9), pour quelqu'un qui lit mal l'arabe"
}`;

  const parsed = (await callLLMJson(systemPrompt, text.slice(0, 2000))) as {
    darija?: string;
    darijaLatin?: string;
  } | null;
  if (!parsed?.darija) return null;
  return { darija: parsed.darija.trim(), darijaLatin: parsed.darijaLatin?.trim() ?? "" };
}

export async function ttsWithAI(text: string): Promise<ArrayBuffer | null> {
  // Text-to-speech stays OpenAI-only for now — Gemini's audio models use a
  // different API shape. When only a free Gemini key is configured, the
  // client already falls back to the browser's built-in speech synthesis,
  // so audio playback still works either way.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "alloy",
        input: text.slice(0, 4000),
        response_format: "mp3",
        speed: 0.95,
      }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function answerFollowUpWithAI(
  originalText: string,
  question: string,
): Promise<string | null> {
  const systemPrompt =
    "Tu réponds en Darija marocaine (en caractères arabes), en 1 à 3 phrases courtes, simples et chaleureuses, à une question sur un document. Ne mets pas de JSON, juste la phrase. " +
    "Réponds UNIQUEMENT à partir de ce qui est explicitement dans le document. N'invente jamais une information absente. Si le document ne permet pas de répondre avec certitude, dis-le clairement en darija (par exemple : \"ما كايناش معلومات كافية فالوثيقة باش نتأكد\") plutôt que de deviner.";
  const userContent = `Voici le document :\n"""${originalText.slice(0, 4000)}"""\n\nQuestion : ${question}`;
  return callLLMText(systemPrompt, userContent);
}
