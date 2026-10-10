"use client";

import { useState } from "react";
import BigButton from "../BigButton";
import { useVoicePlayer } from "@/lib/voice";

const SLIDES = [
  { emoji: "📷", text: "صور الورقة." },
  { emoji: "🧠", text: "احنا كنفهموها." },
  { emoji: "🔊", text: "كنشرحوها ليك بالدارجة." },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const { state, speak } = useVoicePlayer();

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-teal-50 to-white px-6 py-12 text-center">
      <div />
      <div className="flex flex-col items-center gap-8">
        <div className="text-[7rem] leading-none animate-[bounce_2.5s_ease-in-out_infinite]">
          {SLIDES[index].emoji}
        </div>
        <p dir="rtl" className="text-3xl font-extrabold text-slate-900">
          {SLIDES[index].text}
        </p>
        <button
          onClick={() => speak(SLIDES[index].text)}
          aria-label="استمع"
          className="flex items-center gap-2 rounded-full border-2 border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-700 transition-colors active:scale-95"
        >
          {state === "loading" || state === "playing" ? "🔊 …" : "🔊 استمع"}
        </button>
        <div className="flex gap-2">
          {SLIDES.map((s, i) => (
            <span
              key={s.emoji}
              className={`h-3 w-3 rounded-full ${i === index ? "bg-teal-600" : "bg-teal-200"}`}
            />
          ))}
        </div>
      </div>
      <div className="w-full max-w-sm">
        {isLast ? (
          <BigButton emoji="✅" label="بدأ / Commencer" onClick={onDone} />
        ) : (
          <BigButton
            emoji="➡️"
            label="اللي بعدها"
            variant="ghost"
            onClick={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
          />
        )}
        {!isLast && (
          <button
            onClick={onDone}
            className="mt-4 w-full text-sm font-semibold text-slate-400 underline-offset-2 hover:underline"
          >
            تخطى
          </button>
        )}
      </div>
    </div>
  );
}
