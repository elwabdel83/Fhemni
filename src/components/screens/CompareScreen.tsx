"use client";

import type { HistoryItem } from "@/lib/history";
import { STATUS_DARIJA, compareExplanations } from "@/lib/compare";
import type { DocumentStatus } from "@/lib/types";
import { Card } from "../BigButton";

const STATUS_TONE: Record<DocumentStatus, string> = {
  accepted: "bg-emerald-50 text-emerald-800",
  rejected: "bg-rose-50 text-rose-800",
  attention: "bg-amber-50 text-amber-800",
  unclear: "bg-slate-100 text-slate-600",
};

function DocCard({ item, tag }: { item: HistoryItem; tag: string }) {
  const r = item.result;
  return (
    <Card className="flex-1">
      <p dir="rtl" className="mb-1 text-xs font-bold text-slate-400">
        {tag} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{r.categoryEmoji}</span>
        <span dir="rtl" className="text-sm font-extrabold text-slate-800">
          {r.categoryDarija}
        </span>
      </div>
      <span
        className={`mt-2 inline-block w-fit rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[r.status]}`}
      >
        {STATUS_DARIJA[r.status]}
      </span>
      <p dir="rtl" className="mt-2 line-clamp-3 text-sm font-medium text-slate-600">
        {r.simpleExplanation}
      </p>
    </Card>
  );
}

export default function CompareScreen({
  itemA,
  itemB,
  onBack,
}: {
  itemA: HistoryItem;
  itemB: HistoryItem;
  onBack: () => void;
}) {
  // Older first ("before"), newer second ("after") — regardless of the
  // order the person tapped them in, since that's what makes the diff
  // sentences ("كان... دابا صار...") read naturally.
  const [before, after] = itemA.createdAt <= itemB.createdAt ? [itemA, itemB] : [itemB, itemA];
  const diffLines = compareExplanations(before.result, after.result);

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-full p-1 text-2xl" aria-label="رجوع">
          ⬅️
        </button>
        <p dir="rtl" className="text-xl font-extrabold text-slate-900">
          قارن بين وثيقتين
        </p>
        <span className="w-6" />
      </div>

      <div className="mt-6 flex gap-3">
        <DocCard item={before} tag="⏮️ قبل" />
        <DocCard item={after} tag="⏭️ دابا" />
      </div>

      <div className="mt-6">
        <p dir="rtl" className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-500">
          <span>⚖️</span>
          <span>شنو بدل؟</span>
        </p>
        <Card className="flex flex-col gap-3">
          {diffLines.map((line, i) => (
            <p key={i} dir="rtl" className="text-sm font-semibold text-slate-700">
              {line}
            </p>
          ))}
        </Card>
      </div>

      <p dir="rtl" className="mt-4 text-center text-xs font-medium text-slate-400">
        هادي مقارنة آلية بين المعلومات اللي استخرجنا، ماشي تحليل ذكي جديد.
      </p>
    </div>
  );
}
