"use client";

import { useEffect, useRef } from "react";
import { useVoicePlayer } from "@/lib/voice";

export default function VoiceControls({
  text,
  autoPlay,
}: {
  text: string;
  autoPlay: boolean;
}) {
  const { state, speak, pause, resume, replay, setRate, rate } = useVoicePlayer();
  const autoPlayedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!autoPlay) return;
    if (!text) return;
    if (autoPlayedFor.current === text) return;
    autoPlayedFor.current = text;
    speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);

  return (
    <div className="flex flex-col items-center gap-3">
      {state === "idle" || state === "error" ? (
        <button
          onClick={() => speak(text)}
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-teal-600 py-6 text-2xl font-extrabold text-white shadow-[0_14px_30px_rgba(13,148,136,0.35)] active:scale-[0.98]"
        >
          🔊 سمع / ÉCOUTER
        </button>
      ) : state === "loading" ? (
        <div className="flex w-full items-center justify-center gap-3 rounded-3xl bg-teal-100 py-6 text-xl font-bold text-teal-700">
          ⏳ …
        </div>
      ) : (
        <div className="flex w-full items-center justify-center gap-3">
          {state === "playing" ? (
            <button
              onClick={pause}
              className="flex flex-1 flex-col items-center rounded-2xl bg-slate-800 py-5 text-3xl text-white active:scale-95"
            >
              ⏸️
            </button>
          ) : (
            <button
              onClick={resume}
              className="flex flex-1 flex-col items-center rounded-2xl bg-teal-600 py-5 text-3xl text-white active:scale-95"
            >
              ▶️
            </button>
          )}
          <button
            onClick={replay}
            className="flex flex-1 flex-col items-center rounded-2xl bg-orange-500 py-5 text-3xl text-white active:scale-95"
          >
            🔁
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
        <button
          onClick={() => setRate(Math.max(0.5, rate - 0.15))}
          className="rounded-full border-2 border-slate-200 px-3 py-2 text-xl"
        >
          🐢
        </button>
        <span>{rate.toFixed(2)}x</span>
        <button
          onClick={() => setRate(Math.min(1.4, rate + 0.15))}
          className="rounded-full border-2 border-slate-200 px-3 py-2 text-xl"
        >
          🐇
        </button>
      </div>
    </div>
  );
}
