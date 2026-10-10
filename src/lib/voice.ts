"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "loading" | "playing" | "paused" | "error";

function pickArabicVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (voices.length === 0) return null;
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("ar-ma")) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("ar")) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("fr")) ??
    voices[0]
  );
}

export function useVoicePlayer() {
  const [state, setState] = useState<VoiceState>("idle");
  const [rate, setRateState] = useState(0.85);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastTextRef = useRef<string>("");
  const modeRef = useRef<"audio" | "speech">("speech");

  useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio();
    audioRef.current.addEventListener("ended", () => setState("idle"));
    audioRef.current.addEventListener("error", () => setState("idle"));
    // Some browsers load voices asynchronously.
    window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});
    return () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, playbackRate: number) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-MA";
      utterance.rate = playbackRate;
      utterance.pitch = 1;
      const voice = pickArabicVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setState("playing");
      utterance.onend = () => setState("idle");
      utterance.onerror = () => setState("idle");
      utteranceRef.current = utterance;
      modeRef.current = "speech";
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  const speak = useCallback(
    async (text: string) => {
      if (!text) return;
      lastTextRef.current = text;
      setState("loading");

      // Mobile browsers (iOS Safari, Chrome Android — most of our users)
      // only allow speechSynthesis.speak() when it's called synchronously
      // inside the tap that triggered it. If we `await` the /api/tts fetch
      // first and only call this as a fallback afterwards, the user
      // activation from the tap has already expired and the call is
      // silently blocked — nothing plays. So we start the browser voice
      // immediately, in the same gesture, and swap to the nicer server
      // audio afterwards if it shows up in time.
      const canBrowserSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
      if (canBrowserSpeak) {
        speakWithBrowser(text, rate);
      }

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.status === 200) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          // Server audio is ready: stop the browser voice (if it already
          // started) and switch over.
          window.speechSynthesis?.cancel();
          modeRef.current = "audio";
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.playbackRate = rate;
            await audioRef.current.play();
            setState("playing");
            return;
          }
        }
      } catch {
        // Keep whatever the browser voice is already doing.
      }

      if (!canBrowserSpeak) setState("error");
    },
    [rate, speakWithBrowser],
  );

  const pause = useCallback(() => {
    if (modeRef.current === "audio") {
      audioRef.current?.pause();
    } else {
      window.speechSynthesis?.pause();
    }
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    if (modeRef.current === "audio") {
      audioRef.current?.play();
    } else {
      window.speechSynthesis?.resume();
    }
    setState("playing");
  }, []);

  const replay = useCallback(() => {
    if (modeRef.current === "audio" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setState("playing");
    } else {
      speakWithBrowser(lastTextRef.current, rate);
    }
  }, [rate, speakWithBrowser]);

  const setRate = useCallback(
    (newRate: number) => {
      setRateState(newRate);
      if (modeRef.current === "audio" && audioRef.current) {
        audioRef.current.playbackRate = newRate;
      } else if (lastTextRef.current) {
        speakWithBrowser(lastTextRef.current, newRate);
      }
    },
    [speakWithBrowser],
  );

  return { state, speak, pause, resume, replay, setRate, rate };
}
