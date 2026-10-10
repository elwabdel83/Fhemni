"use client";

import { useState } from "react";
import BigButton, { IconChip } from "../BigButton";
import { isSpeechInputSupported, useSpeechInput } from "@/lib/speechInput";

const LANGUAGES: { key: string; label: string; flag: string; recogLang: string }[] = [
  { key: "auto", label: "تلقائي", flag: "🌐", recogLang: "fr-FR" },
  { key: "fr", label: "Français", flag: "🇫🇷", recogLang: "fr-FR" },
  { key: "en", label: "English", flag: "🇬🇧", recogLang: "en-US" },
  { key: "es", label: "Español", flag: "🇪🇸", recogLang: "es-ES" },
  { key: "ar", label: "عربية", flag: "🇸🇦", recogLang: "ar-SA" },
];

export default function TranslateScreen({
  onBack,
  onTranslate,
}: {
  onBack: () => void;
  onTranslate: (text: string, sourceLang: string) => void;
}) {
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [text, setText] = useState("");
  const [speechSupported] = useState(() => isSpeechInputSupported());
  const { isListening, interimText, start, stop } = useSpeechInput(lang.recogLang);

  function toggleMic() {
    if (isListening) {
      stop();
      return;
    }
    start((finalChunk) => {
      setText((prev) => (prev ? `${prev.trim()} ${finalChunk}` : finalChunk).trim());
    });
  }

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col bg-gradient-to-b from-indigo-50 via-white to-white px-6 py-8">
      <button onClick={onBack} className="w-fit rounded-full p-1 text-2xl" aria-label="رجوع">
        ⬅️
      </button>

      <p dir="rtl" className="mt-4 text-2xl font-extrabold text-slate-900">
        ترجم بالصوت للدارجة
      </p>
      <p className="text-sm text-slate-500">Parle dans ta langue, on te le dit en Darija.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <IconChip
            key={l.key}
            emoji={l.flag}
            label={l.label}
            active={lang.key === l.key}
            onClick={() => setLang(l)}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        {speechSupported ? (
          <>
            <button
              onClick={toggleMic}
              aria-pressed={isListening}
              className={`flex h-32 w-32 items-center justify-center rounded-full text-5xl shadow-lg transition-all duration-200 ${
                isListening
                  ? "scale-110 bg-rose-500 text-white shadow-rose-300 animate-pulse"
                  : "bg-indigo-600 text-white shadow-indigo-300 active:scale-95"
              }`}
            >
              {isListening ? "⏹️" : "🎙️"}
            </button>
            <p dir="rtl" className="text-center text-base font-semibold text-slate-500">
              {isListening ? "…كنسمع ليك، دوز" : "دوز على الميكرو وهدر"}
            </p>
            {interimText && (
              <p dir="auto" className="max-w-xs text-center text-lg text-slate-400 italic">
                {interimText}
              </p>
            )}
          </>
        ) : (
          <p dir="rtl" className="max-w-xs text-center text-sm text-slate-400">
            🎙️ الميكرو ماخدامش فهاد المتصفح. اكتب النص تحت.
          </p>
        )}

        <textarea
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…النص غادي يبان هنا، ولا كتب هنا مباشرة"
          className="min-h-[120px] w-full max-w-sm rounded-3xl border-2 border-slate-200 p-4 text-lg leading-relaxed transition-colors focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <BigButton
        emoji="🗣️"
        label="ترجم للدارجة"
        onClick={() => onTranslate(text, lang.key)}
        disabled={text.trim().length === 0}
        variant="indigo"
      />
    </div>
  );
}
