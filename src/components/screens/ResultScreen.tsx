"use client";

import { useState } from "react";
import type { ExplanationResult } from "@/lib/types";
import type { OcrSource } from "@/lib/ocr";
import VoiceControls from "../VoiceControls";
import { Card, IconChip } from "../BigButton";
import SourceViewer from "../SourceViewer";
import { isSpeechInputSupported, useSpeechInput } from "@/lib/speechInput";

type QuickQuestion = { key: string; emoji: string; label: string };

const BASE_QUESTIONS: QuickQuestion[] = [
  { key: "ndir", emoji: "❓", label: "شنو خاصني ندير؟" },
  { key: "imta akher ajal", emoji: "📅", label: "إمتى آخر أجل؟" },
  { key: "chkon khasso ydir", emoji: "👤", label: "شكون خاصو يدير هادشي؟" },
  { key: "3lach twslt", emoji: "❔", label: "علاش توصلت بهاد الورقة؟" },
];

// Extra quick questions, tailored to the kind of document detected — a
// facture doesn't need "where do I go" and a convocation doesn't need
// "why do I have to pay", so showing the same 4 generic chips for every
// document wastes the space where a smarter suggestion could go.
const CATEGORY_QUESTIONS: Record<string, QuickQuestion[]> = {
  "Facture": [
    { key: "chhal nkhlles", emoji: "💰", label: "شحال خاصني نخلص؟" },
    { key: "fin nkhlles", emoji: "🏦", label: "فين وكيفاش نخلص؟" },
  ],
  "Document juridique": [
    { key: "fin nmchi", emoji: "📍", label: "فين خاصني نمشي؟" },
    { key: "fuqach nmchi", emoji: "🕐", label: "فوقاش خاصني نمشي؟" },
    { key: "chno njib", emoji: "📄", label: "شنو خاصني نجيب معايا؟" },
  ],
  "ANAPEC / Emploi": [
    { key: "chhal salaire", emoji: "💰", label: "شحال هو الأجر؟" },
    { key: "chhal muda", emoji: "📅", label: "شحال هي المدة؟" },
  ],
  "Travail": [
    { key: "chhal salaire", emoji: "💰", label: "شحال هو الأجر؟" },
    { key: "chhal muda", emoji: "📅", label: "شحال هي المدة؟" },
  ],
  "CNSS / Sécurité sociale": [
    { key: "chhal nkhlles", emoji: "💰", label: "شحال خاصني نخلص؟" },
    { key: "chno njib", emoji: "📄", label: "شنو خاصني نجيب معايا؟" },
  ],
  "Livraison / Colis": [
    { key: "fuqach ywsl", emoji: "🕐", label: "فوقاش غادي يجي؟" },
    { key: "fin ywsl", emoji: "📍", label: "فين غادي يتسلم؟" },
  ],
};

function getQuestionsFor(category: string): QuickQuestion[] {
  const extra = CATEGORY_QUESTIONS[category] ?? [
    { key: "fin nmchi", emoji: "📍", label: "فين خاصني نمشي؟" },
    { key: "chhal nkhlles", emoji: "💰", label: "شحال خاصني نخلص؟" },
  ];
  return [...BASE_QUESTIONS, ...extra];
}

function shareTextToWhatsApp(text: string) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://fhemni.app";
  const message = `${text}\n\n🗣️ الشرح ديال هاد الوثيقة دار بـ Fhemni: ${appUrl}`;
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

const STATUS_CONFIG: Record<
  ExplanationResult["status"],
  { emoji: string; label: string; bg: string; text: string }
> = {
  accepted: { emoji: "🟢", label: "الطلب ديالك تقبل", bg: "bg-emerald-50", text: "text-emerald-700" },
  rejected: { emoji: "🔴", label: "الطلب ديالك مرفوض", bg: "bg-red-50", text: "text-red-700" },
  attention: { emoji: "🟠", label: "كاين شي حاجة خاصها تدار", bg: "bg-amber-50", text: "text-amber-700" },
  unclear: { emoji: "❔", label: "ما قدرتش نتأكد بزاف، اقرا الشرح تحت", bg: "bg-slate-100", text: "text-slate-600" },
};

function ProblemBadge({ result }: { result: ExplanationResult }) {
  const cfg = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.unclear;
  return (
    <div className={`flex flex-col items-center gap-2 rounded-3xl p-6 ${cfg.bg}`}>
      <span className="text-5xl">{cfg.emoji}</span>
      <span className={`text-lg font-extrabold ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

function SimpleModeGrid({ result, onShare }: { result: ExplanationResult; onShare: () => void }) {
  const date = result.importantInfo.deadlines[0] ?? result.importantInfo.dates[0] ?? "—";
  const amount = result.importantInfo.amounts[0] ?? "—";
  const place = result.importantInfo.addresses[0] ?? "—";

  const tiles = [
    { emoji: "📅", label: "DATE", value: date, bg: "bg-amber-50", text: "text-amber-800" },
    { emoji: "💰", label: "ARGENT", value: amount, bg: "bg-emerald-50", text: "text-emerald-800" },
    { emoji: "📍", label: "OÙ", value: place, bg: "bg-sky-50", text: "text-sky-800" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ProblemBadge result={result} />
      <div className="grid grid-cols-1 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className={`flex items-center gap-4 rounded-3xl p-5 ${t.bg}`}>
            <span className="text-4xl">{t.emoji}</span>
            <div className="flex flex-col text-left">
              <span className={`text-sm font-bold ${t.text}`}>{t.label}</span>
              <span dir="auto" className="text-lg font-extrabold text-slate-800">
                {t.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      <VoiceControls text={result.simpleExplanation} autoPlay />
      <button
        onClick={onShare}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-4 text-lg font-extrabold text-white shadow-[0_10px_24px_rgba(37,211,102,0.35)] transition-transform active:scale-[0.98]"
      >
        <span className="text-2xl">📲</span>
        <span dir="rtl">صيفط لحد عزيز</span>
      </button>
    </div>
  );
}

export default function ResultScreen({
  result,
  simpleMode,
  onBack,
  onAddPage,
  pageCount = 1,
  sourceImage = null,
  adOffer = false,
  onWatchAd,
  onDismissAdOffer,
}: {
  result: ExplanationResult;
  simpleMode: boolean;
  onBack: () => void;
  onAddPage: () => void;
  pageCount?: number;
  sourceImage?: OcrSource | null;
  adOffer?: boolean;
  onWatchAd?: () => void;
  onDismissAdOffer?: () => void;
}) {
  const [viewingSource, setViewingSource] = useState<string | null>(null);
  const [mode, setMode] = useState<"normal" | "simple">("normal");
  const [answer, setAnswer] = useState<{ q: string; a: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<"useful" | "not_useful" | null>(null);
  const [trustBadge, setTrustBadge] = useState<{ total: number; usefulPct: number | null } | null>(null);
  const [freeQuestion, setFreeQuestion] = useState("");
  const [show10sec, setShow10sec] = useState(false);
  const [micSupported] = useState(() => isSpeechInputSupported());
  const { isListening, start, stop } = useSpeechInput("ar-MA");

  function toggleMic() {
    if (isListening) {
      stop();
      return;
    }
    start((finalChunk) => setFreeQuestion((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk)));
  }

  async function sendFeedback(useful: boolean) {
    setFeedbackGiven(useful ? "useful" : "not_useful");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: result.category, useful }),
      });
      const res = await fetch(`/api/feedback?category=${encodeURIComponent(result.category)}`);
      const data = await res.json().catch(() => null);
      if (data) setTrustBadge(data);
    } catch {
      // Best-effort only — feedback not saving shouldn't disrupt the flow.
    }
  }

  const currentText = mode === "normal" ? result.explanation : result.simpleExplanation;
  const info = result.importantInfo;
  const hasInfo =
    info.dates.length || info.deadlines.length || info.amounts.length || info.addresses.length || info.phones.length;
  const quickQuestions = getQuestionsFor(result.category);

  // The single most urgent fact, if there is one — a deadline beats a
  // generic "pay attention" disclaimer, which beats nothing. Shown as its
  // own "🚨" line so it can't get lost inside the longer explanation.
  const urgentFact =
    info.deadlines[0] ??
    (result.status === "rejected" || result.status === "attention" ? result.disclaimer ?? null : null);

  async function askQuestion(question: string) {
    setAsking(true);
    setAnswer(null);
    setFreeQuestion("");
    try {
      // Same reasoning as the server-side AI timeout: never leave the
      // person staring at a spinner that will never resolve on its own.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      let res: Response;
      try {
        res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: result.originalText, question }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await res.json();
      setAnswer({ q: question, a: data.answer ?? "…" });
    } catch {
      setAnswer({ q: question, a: "ما قدرتش نجاوب دابا، جرب مرة أخرى." });
    } finally {
      setAsking(false);
    }
  }

  async function shareApp() {
    const shareData = {
      title: "Fhemni",
      text: "ما فهمتيش شي رسالة؟ صورها ف Fhemni وغادي تشرح ليك بالدارجة.",
      url: typeof window !== "undefined" ? window.location.origin : "",
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(shareData.url);
    } catch {
      // user cancelled share, ignore
    }
  }

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-full p-1 text-2xl" aria-label="رجوع">
          ⬅️
        </button>
        <button onClick={shareApp} className="rounded-full p-1 text-2xl" aria-label="مشاركة">
          📤
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-3xl">{result.categoryEmoji}</span>
        <span dir="rtl" className="text-lg font-bold text-slate-500">{result.categoryDarija}</span>
      </div>

      {result.confidenceWarning ? (
        <p dir="rtl" className="mt-3 rounded-2xl bg-orange-50 p-3 text-center text-sm font-semibold text-orange-700">
          {result.confidenceWarning}
        </p>
      ) : null}

      {/* Voluntary, dismissible — never blocks the result itself. The
          person already has their explanation; this is just an offer. */}
      {adOffer ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-indigo-50 p-3">
          <span className="text-2xl">🎁</span>
          <p dir="rtl" className="flex-1 text-xs font-semibold text-indigo-800">
            شوف إعلان قصير (3 ثواني) وخد 3 شروحات بلا إعلانات
          </p>
          <button
            onClick={onWatchAd}
            className="shrink-0 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white"
          >
            شوف
          </button>
          <button onClick={onDismissAdOffer} aria-label="سد" className="shrink-0 text-indigo-300">
            ✕
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-5">
        {simpleMode ? (
          <SimpleModeGrid result={result} onShare={() => shareTextToWhatsApp(result.simpleExplanation)} />
        ) : (
          <>
            <ProblemBadge result={result} />

            <div className="flex justify-center gap-2">
              <IconChip emoji="🗣️" label="الشرح" active={mode === "normal"} onClick={() => setMode("normal")} />
              <IconChip
                emoji="🍼"
                label="بسيط بزاف"
                active={mode === "simple"}
                onClick={() => setMode("simple")}
              />
            </div>

            <button
              onClick={() => setShow10sec((v) => !v)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/60 py-3 text-sm font-bold text-teal-700"
            >
              <span>⚡</span>
              <span dir="rtl">{show10sec ? "سد الشرح السريع" : "شرح سريع فـ10 ثواني"}</span>
            </button>

            {show10sec && (
              <Card className="border-2 border-teal-200 bg-teal-50">
                <p dir="rtl" className="text-xl font-extrabold leading-relaxed text-teal-900">
                  {result.simpleExplanation}
                </p>
                <div className="mt-3">
                  <VoiceControls text={result.simpleExplanation} autoPlay={false} />
                </div>
              </Card>
            )}

            {urgentFact ? (
              <section>
                <SectionLabel emoji="🚨" text="أهم حاجة" />
                <Card className="border-2 border-rose-200 bg-rose-50">
                  <p dir="rtl" className="text-lg font-extrabold text-rose-800">
                    {urgentFact}
                  </p>
                </Card>
              </section>
            ) : null}

            <section>
              <SectionLabel emoji="🧠" text="شنو واقع؟" />
              <Card>
                <p dir="rtl" className="text-2xl font-bold leading-relaxed text-slate-900">
                  {currentText}
                </p>
              </Card>
              <div className="mt-3">
                <VoiceControls key={mode} text={currentText} autoPlay />
              </div>
            </section>

            <button
              onClick={() => shareTextToWhatsApp(currentText)}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-4 text-lg font-extrabold text-white shadow-[0_10px_24px_rgba(37,211,102,0.35)] transition-transform active:scale-[0.98]"
            >
              <span className="text-2xl">📲</span>
              <span dir="rtl">صيفط الشرح لحد عزيز على واتساب</span>
            </button>

            <div className="flex flex-col items-center gap-2 py-1">
              <p dir="rtl" className="text-sm font-semibold text-slate-400">
                هاد الشرح كان واضح؟
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => sendFeedback(true)}
                  disabled={feedbackGiven !== null}
                  className={`rounded-full px-4 py-1.5 text-base font-bold transition-colors disabled:opacity-60 ${
                    feedbackGiven === "useful" ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  👍
                </button>
                <button
                  onClick={() => sendFeedback(false)}
                  disabled={feedbackGiven !== null}
                  className={`rounded-full px-4 py-1.5 text-base font-bold transition-colors disabled:opacity-60 ${
                    feedbackGiven === "not_useful" ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  👎
                </button>
              </div>
              {feedbackGiven && (
                <p dir="rtl" className="text-xs font-semibold text-slate-400">
                  {trustBadge?.usefulPct !== null && trustBadge?.usefulPct !== undefined
                    ? `📊 ${trustBadge.usefulPct}% من الناس لقاو هاد النوع ديال الشرح واضح`
                    : "🙏 شكرا، هاد الرأي غادي يعاون الناس الأخرين"}
                </p>
              )}
            </div>

            {/* Actions are never hidden behind a collapse — "what do I need
                to do" is the single most important thing on this screen. */}
            <section>
              <SectionLabel emoji="✅" text="دابا دير هادشي" />
              <Card>
                <ul dir="rtl" className="flex flex-col gap-3">
                  {result.actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 text-lg font-semibold text-slate-800">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-extrabold text-white">
                        {i + 1}
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>

            {hasInfo ? (
              <section>
                <SectionLabel emoji="🔎" text="المعلومات المهمة" />
                <div className="grid grid-cols-2 gap-3">
                  {info.deadlines.map((d, i) => (
                    <InfoPill
                      key={`dl${i}`}
                      emoji="🔴"
                      label="آخر أجل"
                      value={d}
                      tone="bg-red-50 text-red-800"
                      onViewSource={sourceImage ? () => setViewingSource(d) : undefined}
                    />
                  ))}
                  {info.dates
                    .filter((d) => !info.deadlines.includes(d))
                    .map((d, i) => (
                      <InfoPill
                        key={`d${i}`}
                        emoji="📅"
                        label="تاريخ"
                        value={d}
                        tone="bg-amber-50 text-amber-800"
                        onViewSource={sourceImage ? () => setViewingSource(d) : undefined}
                      />
                    ))}
                  {info.amounts.map((a, i) => (
                    <InfoPill
                      key={`a${i}`}
                      emoji="💰"
                      label="المبلغ"
                      value={a}
                      tone="bg-emerald-50 text-emerald-800"
                      onViewSource={sourceImage ? () => setViewingSource(a) : undefined}
                    />
                  ))}
                  {info.addresses.map((a, i) => (
                    <InfoPill
                      key={`ad${i}`}
                      emoji="📍"
                      label="المكان"
                      value={a}
                      tone="bg-sky-50 text-sky-800"
                      onViewSource={sourceImage ? () => setViewingSource(a) : undefined}
                    />
                  ))}
                  {info.phones.map((p, i) => (
                    <InfoPill
                      key={`p${i}`}
                      emoji="📞"
                      label="الهاتف"
                      value={p}
                      tone="bg-violet-50 text-violet-800"
                      onViewSource={sourceImage ? () => setViewingSource(p) : undefined}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {sourceImage && viewingSource && (
              <SourceViewer source={sourceImage} value={viewingSource} onClose={() => setViewingSource(null)} />
            )}

            <div>
              <p dir="rtl" className="mb-3 text-center text-lg font-extrabold text-slate-900">
                💬 سَوّل على هاد الورقة
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = freeQuestion.trim();
                  if (q) askQuestion(q);
                }}
                className="flex items-center gap-2"
              >
                <input
                  dir="auto"
                  value={freeQuestion}
                  onChange={(e) => setFreeQuestion(e.target.value)}
                  placeholder="كتب سؤالك هنا..."
                  className="flex-1 rounded-2xl border-2 border-slate-200 px-4 py-3 text-base focus:border-teal-500 focus:outline-none"
                />
                {micSupported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-pressed={isListening}
                    aria-label="سولني بالصوت"
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition-colors ${
                      isListening ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    🎙️
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!freeQuestion.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xl text-white disabled:opacity-40"
                  aria-label="صيفط"
                >
                  ➤
                </button>
              </form>

              <p dir="rtl" className="mb-2 mt-4 text-center text-sm font-semibold text-slate-400">
                ولا اختار سؤال جاهز
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickQuestions.map((q) => (
                  <IconChip key={q.key} emoji={q.emoji} label={q.label} onClick={() => askQuestion(q.key)} />
                ))}
              </div>
              {asking ? <p className="mt-3 text-center text-sm text-slate-400">⏳ …</p> : null}
              {answer ? (
                <Card className="mt-3 bg-teal-50">
                  <p dir="rtl" className="text-lg font-semibold text-teal-900">
                    {answer.a}
                  </p>
                </Card>
              ) : null}
            </div>

            {result.disclaimer ? (
              <Card className="border-2 border-amber-300 bg-amber-50">
                <p dir="rtl" className="text-sm font-semibold text-amber-800">
                  ⚠️ {result.disclaimer}
                </p>
              </Card>
            ) : null}

            {pageCount > 1 ? (
              <p dir="rtl" className="text-center text-sm font-semibold text-slate-400">
                📄 هاد الشرح مجمع من {pageCount} صفحات
              </p>
            ) : null}

            <button onClick={onAddPage} className="text-sm font-semibold text-slate-400 underline">
              📄 الوثيقة فيها كثر من صفحة؟ زيد صفحة {pageCount > 1 ? `(${pageCount})` : ""}
            </button>
          </>
        )}
      </div>

      <button
        onClick={onBack}
        className="mt-8 rounded-3xl bg-slate-900 py-5 text-xl font-extrabold text-white transition-transform active:scale-95"
      >
        🔁 نص جديد
      </button>
    </div>
  );
}

function SectionLabel({ emoji, text }: { emoji: string; text: string }) {
  return (
    <p dir="rtl" className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-500">
      <span>{emoji}</span>
      <span>{text}</span>
    </p>
  );
}

function InfoPill({
  emoji,
  label,
  value,
  tone,
  onViewSource,
}: {
  emoji: string;
  label: string;
  value: string;
  tone: string;
  onViewSource?: () => void;
}) {
  return (
    <div className={`flex flex-col rounded-2xl p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-bold">
          {emoji} {label}
        </span>
        {onViewSource && (
          <button
            onClick={onViewSource}
            aria-label="شوف فالوثيقة"
            className="rounded-full bg-black/5 px-1.5 py-0.5 text-xs"
          >
            👁️
          </button>
        )}
      </div>
      <span dir="auto" className="mt-1 text-base font-extrabold">
        {value}
      </span>
    </div>
  );
}
