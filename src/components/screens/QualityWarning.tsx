"use client";

import BigButton from "../BigButton";

export default function QualityWarning({
  onRetake,
  onContinueAnyway,
}: {
  onRetake: () => void;
  onContinueAnyway: () => void;
}) {
  return (
    <div className="fhemni-screen flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-amber-50 to-white px-6 text-center">
      <span className="text-7xl">📷</span>
      <p dir="rtl" className="max-w-xs text-2xl font-extrabold text-slate-900">
        الصورة ما واضحةش بزاف
      </p>

      <div dir="rtl" className="flex w-full max-w-xs flex-col gap-2 rounded-3xl bg-white p-5 text-right shadow-sm">
        <p className="text-base font-semibold text-slate-600">💡 حط الورقة فوق سطح واضح</p>
        <p className="text-base font-semibold text-slate-600">💡 ضوي مزيان</p>
        <p className="text-base font-semibold text-slate-600">💡 خلي الورقة كاملة فالكاميرا</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <BigButton emoji="🔄" label="أعد التصوير" onClick={onRetake} variant="primary" />
        <button
          onClick={onContinueAnyway}
          className="text-sm font-semibold text-slate-400 underline-offset-2 hover:underline"
        >
          كمل رغم ذلك
        </button>
      </div>
    </div>
  );
}
