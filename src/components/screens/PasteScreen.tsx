"use client";

import { useState } from "react";
import BigButton from "../BigButton";

export default function PasteScreen({
  onBack,
  onExplain,
}: {
  onBack: () => void;
  onExplain: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col bg-white px-6 py-8">
      <button onClick={onBack} className="w-fit rounded-full p-1 text-2xl" aria-label="رجوع">
        ⬅️
      </button>

      <p dir="rtl" className="mt-4 text-2xl font-extrabold text-slate-900">
        الصق النص هنا
      </p>
      <p className="text-sm text-slate-500">Colle ton message ici.</p>

      <textarea
        autoFocus
        dir="auto"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="…SMS، رسالة واتساب، ورقة إدارية"
        className="mt-5 min-h-[220px] flex-1 rounded-3xl border-2 border-slate-200 p-5 text-xl leading-relaxed transition-colors focus:border-teal-500 focus:outline-none"
      />

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={async () => {
            try {
              const clip = await navigator.clipboard.readText();
              if (clip) setText(clip);
            } catch {
              // clipboard permission denied: user can paste manually
            }
          }}
          className="w-full rounded-2xl border-2 border-slate-200 py-4 text-lg font-semibold text-slate-600 transition-colors hover:border-slate-300"
        >
          📋 لصق من الحافظة
        </button>
        <BigButton
          emoji="🧠"
          label="فهمني / EXPLIQUER"
          onClick={() => onExplain(text)}
          disabled={text.trim().length === 0}
        />
      </div>
    </div>
  );
}
