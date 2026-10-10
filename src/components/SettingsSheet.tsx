"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/profiles";
import { clearHistory } from "@/lib/history";

export default function SettingsSheet({
  open,
  onClose,
  simpleMode,
  onToggleSimpleMode,
  largeText,
  onToggleLargeText,
  profiles,
  activeProfileId,
  onSwitchProfile,
  onAddProfile,
  onGoInvite,
}: {
  open: boolean;
  onClose: () => void;
  simpleMode: boolean;
  onToggleSimpleMode: () => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  profiles: Profile[];
  activeProfileId: string;
  onSwitchProfile: (id: string) => void;
  onAddProfile: (name: string) => void;
  onGoInvite: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const [cleared, setCleared] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        aria-label="سد"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
      />
      <div className="relative z-10 w-full max-w-md rounded-t-[2rem] bg-white px-6 pb-8 pt-4 shadow-2xl animate-[fhemni-screen-in_0.22s_ease-out]">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />

        <p dir="rtl" className="mt-4 text-lg font-extrabold text-slate-900">
          العائلة
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onSwitchProfile(p.id)}
              className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
                p.id === activeProfileId
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span>{p.emoji}</span>
              <span dir="auto">{p.name}</span>
            </button>
          ))}
          <button
            onClick={() => {
              const name = window.prompt("سمية الفرد الجديد ديال العائلة؟");
              if (name?.trim()) onAddProfile(name.trim());
            }}
            className="flex items-center justify-center rounded-full border-2 border-dashed border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-400"
          >
            + زيد
          </button>
        </div>

        <p dir="rtl" className="mt-6 text-lg font-extrabold text-slate-900">
          القراءة
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onToggleLargeText}
            aria-pressed={largeText}
            className={`flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-colors ${
              largeText ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"
            }`}
          >
            🔠 حروف كبار
          </button>
          <button
            onClick={onToggleSimpleMode}
            aria-pressed={simpleMode}
            className={`flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-colors ${
              simpleMode ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600"
            }`}
          >
            🧩 وضع بسيط
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              onClose();
              onGoInvite();
            }}
            className="flex items-center gap-3 rounded-2xl bg-[#25D366]/10 px-4 py-3 text-right text-base font-bold text-[#1c8a4a]"
          >
            👥 <span dir="rtl">عيّط لصحابك (بلا إعلانات لمدة شهر)</span>
          </button>
          <a
            href="/observatoire"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-semibold text-slate-400"
          >
            📊 <span dir="rtl">مرصد الوثائق</span>
          </a>
        </div>

        <p dir="rtl" className="mt-6 flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <span>⚙️</span>
          <span>الخصوصية</span>
        </p>
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-slate-50 p-4">
          <p dir="rtl" className="text-sm font-semibold text-slate-600">
            🔒 التصويرة ديالك ما كنحتافظوش بيها — كتتعالج فالتيليفون ديالك وتمسح مباشرة.
          </p>
          <p dir="rtl" className="text-sm font-semibold text-slate-600">
            🧠 باش نعطيك الشرح الذكي، النص المقروء (ماشي الصورة) كيتصيفط لخدمة الذكاء الاصطناعي. إلا كانت هاد
            الميزة ماشي مفعلة، كلشي كيبقى فالتيليفون ديالك بوحدو.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm("واش متأكد؟ غادي تمسح جميع الشروحات ديال العائلة كاملة، ما يمكن الرجوع.")) {
              profiles.forEach((p) => clearHistory(p.id));
              setCleared(true);
              setTimeout(() => setCleared(false), 2500);
            }
          }}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 py-3 text-sm font-bold text-rose-600"
        >
          🗑️ <span dir="rtl">{cleared ? "تمسح كلشي ✓" : "مسح جميع الشروحات"}</span>
        </button>
      </div>
    </div>
  );
}
