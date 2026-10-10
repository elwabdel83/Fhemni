"use client";

import { useEffect, useState } from "react";
import BigButton from "../BigButton";
import AppLogo from "../AppLogo";

const WAIT_SECONDS = 3;

export default function AdInterstitial({ onContinue }: { onContinue: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const canContinue = secondsLeft <= 0;

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-teal-800 to-teal-900 px-6 py-10 text-center text-white">
      <span className="self-start rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/70">
        🎯 إعلان
      </span>
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <AppLogo size={72} />
        <p dir="rtl" className="max-w-xs text-lg font-semibold text-white/90">
          🎁 بغيتي تعاون Fhemni يبقى مجاني. شكرا ليك!
        </p>
      </div>
      <div className="w-full max-w-sm">
        <BigButton
          emoji={canContinue ? "🎁" : undefined}
          label={canContinue ? "خد 3 شروحات بلا إعلانات" : `شوي باقي... (${secondsLeft})`}
          onClick={onContinue}
          disabled={!canContinue}
          variant="success"
        />
      </div>
    </div>
  );
}
