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
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.status === 200) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
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
        // fall through to browser voice
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speakWithBrowser(text, rate);
      } else {
        setState("error");
      }
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
