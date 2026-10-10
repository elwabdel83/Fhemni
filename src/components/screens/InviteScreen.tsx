"use client";

import { useEffect, useState } from "react";
import BigButton from "../BigButton";
import {
  fetchReferralCount,
  getOwnReferralCode,
  REFERRAL_UNLOCK_THRESHOLD,
} from "@/lib/referral";

export default function InviteScreen({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const c = getOwnReferralCode();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(c);
    fetchReferralCount(c).then((n) => setCount(n));
  }, []);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://fhemni.app";
  const link = `${appUrl}/?ref=${code}`;

  function shareInvite() {
    const message = `صاحبي، هاد الأبليكاسيون كتشرح ليك أي ورقة أو رسالة بالدارجة، بالصوت. جربها: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  const unlocked = (count ?? 0) >= REFERRAL_UNLOCK_THRESHOLD;
  const progress = Math.min(count ?? 0, REFERRAL_UNLOCK_THRESHOLD);

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col bg-gradient-to-b from-[#e9fbf1] via-white to-white px-6 py-8">
      <button onClick={onBack} className="w-fit rounded-full p-1 text-2xl" aria-label="رجوع">
        ⬅️
      </button>

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <span className="text-6xl">👥</span>
        <p dir="rtl" className="text-2xl font-extrabold text-slate-900">
          عيّط لصحابك ولعائلتك
        </p>
        <p dir="rtl" className="max-w-xs text-base font-medium text-slate-500">
          عيّط لـ {REFERRAL_UNLOCK_THRESHOLD} د الناس، وحيد الإعلانات غادي توقف عندك لمدة شهر.
        </p>
      </div>

      <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p dir="rtl" className="text-sm font-bold text-slate-500">
            التقدم ديالك
          </p>
          <p className="text-sm font-bold text-slate-500">
            {count === null ? "…" : `${progress}/${REFERRAL_UNLOCK_THRESHOLD}`}
          </p>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#25D366] transition-[width] duration-500"
            style={{ width: `${(progress / REFERRAL_UNLOCK_THRESHOLD) * 100}%` }}
          />
        </div>
        {unlocked && (
          <p dir="rtl" className="mt-3 text-center text-sm font-extrabold text-emerald-600">
            🎉 مبروك! حليتي الإعلانات لمدة شهر
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <BigButton
          emoji="📲"
          label="صيفط الدعوة على واتساب"
          onClick={shareInvite}
          variant="success"
        />
        <p className="text-center text-xs text-slate-400">
          {count === null ? "…" : `${count} ${count === 1 ? "صاحب استعمل" : "صحاب استعملو"} الرابط ديالك`}
        </p>
      </div>
    </div>
  );
}
