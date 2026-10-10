"use client";

import { useRef, useState } from "react";
import BigButton from "../BigButton";
import AppLogo from "../AppLogo";
import SettingsSheet from "../SettingsSheet";
import type { Profile } from "@/lib/profiles";
import { isSpeechInputSupported, useSpeechInput } from "@/lib/speechInput";

export default function Home({
  onPickPhoto,
  onGoPaste,
  onGoTranslate,
  onGoHistory,
  onGoInvite,
  simpleMode,
  onToggleSimpleMode,
  largeText,
  onToggleLargeText,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onAddProfile,
}: {
  onPickPhoto: (file: File) => void;
  onGoPaste: () => void;
  onGoTranslate: () => void;
  onGoHistory: () => void;
  onGoInvite: () => void;
  simpleMode: boolean;
  onToggleSimpleMode: () => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  profiles: Profile[];
  activeProfileId: string;
  onSwitchProfile: (id: string) => void;
  onAddProfile: (name: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speechSupported] = useState(() => isSpeechInputSupported());
  const [voiceHint, setVoiceHint] = useState("");
  const { isListening, start, stop } = useSpeechInput("ar-MA");

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  function handleVoiceCommand(transcript: string) {
    const t = transcript.trim();
    if (/صور|صوّر|photo|sowar|صورة/i.test(t)) {
      setVoiceHint("📷 …");
      fileInputRef.current?.click();
    } else if (/لصق|الصق|نص|paste/i.test(t)) {
      setVoiceHint("📋 …");
      onGoPaste();
    } else if (/ترجم|traduire|traduction/i.test(t)) {
      setVoiceHint("🎙️ …");
      onGoTranslate();
    } else if (/تاريخ|سابق|شروحات|history/i.test(t)) {
      setVoiceHint("🔊 …");
      onGoHistory();
    } else {
      setVoiceHint('ما فهمتش. قول "صور" ولا "لصق" ولا "ترجم".');
      setTimeout(() => setVoiceHint(""), 2500);
    }
  }

  function toggleVoiceCommand() {
    if (isListening) {
      stop();
      return;
    }
    setVoiceHint("");
    start((finalChunk) => handleVoiceCommand(finalChunk));
  }

  return (
    <div className="fhemni-screen relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-teal-50 via-white to-white px-6 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-teal-100/60 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-24 h-56 w-56 rounded-full bg-orange-50 blur-2xl"
      />

      {/* Header: brand + a single entry point to everything secondary
          (accessibility, family profiles, invite, observatoire). Keeping
          the home screen itself to 3 clear actions is the whole point. */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AppLogo size={40} />
          <span className="text-2xl font-extrabold tracking-tight text-teal-900">Fhemni</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold text-slate-600 transition-colors hover:border-slate-300"
        >
          <span dir="auto">{activeProfile?.name}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-base">
            {activeProfile?.emoji}
          </span>
        </button>
      </div>

      <div className="relative mt-8 flex flex-1 flex-col items-center justify-center gap-9 text-center">
        <div>
          <p dir="rtl" className="text-4xl font-extrabold leading-tight text-slate-900">
            ما فهمتيش شي ورقة؟
          </p>
          <p dir="rtl" className="mt-2.5 text-lg font-medium text-slate-500">
            صوّرها وأنا نشرحها ليك بالدارجة.
          </p>
        </div>

        {/* One dominant action: taking a photo is the whole point of the app,
            so it gets the only large, high-contrast button on the screen.
            Paste and voice-translate are real but secondary, so they sit
            together as a smaller, lower-contrast row underneath instead of
            competing with the camera for attention. */}
        <div className="flex w-full max-w-sm flex-col gap-3">
          <BigButton
            emoji="📷"
            label="صوّر و فهمني"
            onClick={() => fileInputRef.current?.click()}
            variant="primary"
            size="lg"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPickPhoto(file);
              e.target.value = "";
            }}
          />

          <div className="flex gap-3">
            <button
              onClick={onGoPaste}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition-colors active:scale-[0.98] hover:border-slate-300"
            >
              <span className="text-xl">📋</span>
              <span dir="rtl">لصق نص</span>
            </button>
            <button
              onClick={onGoTranslate}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition-colors active:scale-[0.98] hover:border-indigo-200"
            >
              <span className="text-xl">🎙️</span>
              <span dir="rtl">ترجم بالصوت</span>
            </button>
          </div>
        </div>

        <p className="flex max-w-xs items-center justify-center gap-2 text-sm font-medium text-slate-400">
          <span aria-hidden>🔒</span>
          <span dir="rtl">التصويرة كتتعالج بأمان، وما كنحتافظوش بيها.</span>
        </p>
        <p className="flex max-w-xs items-center justify-center gap-2 text-xs font-medium text-slate-400">
          <span dir="rtl">📡 بلا أنترنت: القراءة الأساسية خدامة، ولكن الشرح الذكي كيحتاج النت.</span>
        </p>
      </div>

      <button
        onClick={onGoHistory}
        className="relative mx-auto mt-2 flex items-center gap-2 rounded-full px-4 py-3 text-base font-semibold text-slate-500 transition-colors hover:text-teal-700"
      >
        🔊 آخر الشروحات ديالي
      </button>

      {speechSupported && (
        <>
          <button
            onClick={toggleVoiceCommand}
            aria-pressed={isListening}
            aria-label="قول لي شنو باغي"
            className={`fixed bottom-6 right-6 z-10 flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-xl transition-all duration-200 ${
              isListening
                ? "scale-110 bg-rose-500 text-white animate-pulse"
                : "bg-white text-teal-600 border-2 border-teal-200 active:scale-95"
            }`}
          >
            {isListening ? "⏹️" : "🎙️"}
          </button>
          {voiceHint && (
            <p
              dir="rtl"
              className="fixed bottom-24 right-6 z-10 max-w-[220px] rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg"
            >
              {voiceHint}
            </p>
          )}
        </>
      )}

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        simpleMode={simpleMode}
        onToggleSimpleMode={onToggleSimpleMode}
        largeText={largeText}
        onToggleLargeText={onToggleLargeText}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSwitchProfile={onSwitchProfile}
        onAddProfile={onAddProfile}
        onGoInvite={onGoInvite}
      />
    </div>
  );
}
