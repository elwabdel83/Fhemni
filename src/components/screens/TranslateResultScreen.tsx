"use client";

import { useState } from "react";
import VoiceControls from "../VoiceControls";
import BigButton, { Card } from "../BigButton";

export type TranslationResult = {
  originalText: string;
  darija: string;
  darijaLatin: string;
};

export default function TranslateResultScreen({
  result,
  onBack,
}: {
  result: TranslationResult;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyDarija() {
    try {
      await navigator.clipboard.writeText(result.darija);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission denied: silently ignore
    }
  }

  function shareToWhatsApp() {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://fhemni.app";
    const message = `${result.darija}\n\n🗣️ ترجم بـ Fhemni: ${appUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col bg-white px-6 py-8">
      <button onClick={onBack} className="w-fit rounded-full p-1 text-2xl" aria-label="رجوع">
        ⬅️
      </button>

      <Card className="mt-5 border-2 border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">النص الأصلي</p>
        <p dir="auto" className="mt-1 text-base text-slate-600">
          {result.originalText}
        </p>
      </Card>

      <div className="mt-4 flex-1 rounded-3xl bg-gradient-to-br from-indigo-50 to-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">بالدارجة</p>
        <p dir="rtl" className="mt-2 text-3xl font-extrabold leading-snug text-slate-900">
          {result.darija}
        </p>
        {result.darijaLatin && (
          <p dir="auto" className="mt-3 text-lg font-medium italic text-slate-400">
            {result.darijaLatin}
          </p>
        )}

        <button
          onClick={copyDarija}
          className="mt-4 text-sm font-semibold text-indigo-500 transition-colors hover:text-indigo-700"
        >
          {copied ? "✅ تنسخات" : "📋 نسخ"}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <VoiceControls text={result.darija} autoPlay={true} />
        <button
          onClick={shareToWhatsApp}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-4 text-lg font-extrabold text-white shadow-[0_10px_24px_rgba(37,211,102,0.35)] transition-transform active:scale-[0.98]"
        >
          <span className="text-2xl">📲</span>
          <span dir="rtl">صيفط على واتساب</span>
        </button>
      </div>

      <div className="mt-4">
        <BigButton emoji="🎙️" label="ترجم جملة أخرى" onClick={onBack} variant="ghost" size="md" />
      </div>
    </div>
  );
}
