"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearHistory,
  getHistory,
  getSaveHistoryPreference,
  removeHistoryItem,
  setSaveHistoryPreference,
  toggleFavorite,
  type HistoryItem,
} from "@/lib/history";
import { Card } from "../BigButton";

export default function HistoryScreen({
  onBack,
  onOpen,
  onCompare,
  profileId,
}: {
  onBack: () => void;
  onOpen: (item: HistoryItem) => void;
  onCompare: (a: HistoryItem, b: HistoryItem) => void;
  profileId: string;
}) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [save, setSave] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    // One-time load from localStorage after mount (client-only API).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getHistory(profileId));
    setSave(getSaveHistoryPreference());
  }, [profileId]);

  function refresh() {
    setItems(getHistory(profileId));
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.result.categoryDarija ?? i.category));
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const label = i.result.categoryDarija ?? i.category;
      if (categoryFilter && label !== categoryFilter) return false;
      if (favoritesOnly && !i.favorite) return false;
      if (q && !i.simpleExplanation.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, categoryFilter, favoritesOnly]);

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-full p-1 text-2xl" aria-label="رجوع">
          ⬅️
        </button>
        <p dir="rtl" className="text-xl font-extrabold text-slate-900">
          آخر الشروحات ديالي
        </p>
        {items.length >= 2 ? (
          <button
            onClick={() => {
              setCompareMode((v) => !v);
              setSelected([]);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              compareMode ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            ⚖️ قارن
          </button>
        ) : (
          <span className="w-6" />
        )}
      </div>

      {compareMode && (
        <p dir="rtl" className="mt-3 text-center text-xs font-semibold text-slate-500">
          اختر وثيقتين باش نقارن بينهم ({selected.length}/2)
        </p>
      )}

      {items.length > 0 && (
        <>
          <div className="relative mt-5">
            <input
              dir="rtl"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔎 قلب على شرح قديم..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                favoritesOnly ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              ⭐ المفضلة
            </button>
            <button
              onClick={() => setCategoryFilter(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                categoryFilter === null ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter((prev) => (prev === c ? null : c))}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  categoryFilter === c ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      <Card className="mt-5 flex items-center justify-between">
        <p dir="rtl" className="text-sm font-semibold text-slate-600">
          احتفظ بالشروحات ديالي فهاد الهاتف
        </p>
        <button
          onClick={() => {
            const next = !save;
            setSave(next);
            setSaveHistoryPreference(next);
          }}
          className={`h-8 w-14 rounded-full transition-colors ${save ? "bg-teal-600" : "bg-slate-300"}`}
        >
          <span
            className={`block h-6 w-6 translate-y-1 rounded-full bg-white transition-transform ${
              save ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </Card>

      <div className="mt-6 flex flex-1 flex-col gap-3 overflow-y-auto">
        {items.length === 0 ? (
          <p className="mt-16 text-center text-slate-400">ماكاين حتى شرح دابا.</p>
        ) : filteredItems.length === 0 ? (
          <p className="mt-16 text-center text-slate-400">ما لقيتش شي حاجة بهاد البحث.</p>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!compareMode) {
                    onOpen(item);
                    return;
                  }
                  setSelected((prev) =>
                    isSelected ? prev.filter((id) => id !== item.id) : prev.length < 2 ? [...prev, item.id] : prev,
                  );
                }}
                className={`flex items-center justify-between gap-3 rounded-3xl border-2 p-4 text-left transition-colors active:scale-[0.98] ${
                  isSelected ? "border-teal-500 bg-teal-50" : "border-slate-100 hover:border-teal-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {compareMode && (
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        isSelected ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  )}
                  <span className="text-3xl">{item.categoryEmoji}</span>
                  <div className="flex flex-col">
                    <span dir="rtl" className="text-sm font-bold text-slate-500">
                      {item.result.categoryDarija ?? item.category}
                    </span>
                    <span dir="rtl" className="max-w-[180px] truncate text-base font-semibold text-slate-800">
                      {item.simpleExplanation}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>
                {!compareMode && (
                  <div className="flex items-center gap-2">
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                        refresh();
                      }}
                      className={`text-xl ${item.favorite ? "text-amber-400" : "text-slate-200"}`}
                    >
                      {item.favorite ? "⭐" : "☆"}
                    </span>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryItem(item.id);
                        refresh();
                      }}
                      className="text-xl text-slate-300"
                    >
                      🗑️
                    </span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {compareMode && selected.length === 2 ? (
        <button
          onClick={() => {
            const a = items.find((i) => i.id === selected[0]);
            const b = items.find((i) => i.id === selected[1]);
            if (a && b) onCompare(a, b);
          }}
          className="mt-4 rounded-2xl bg-teal-600 py-3 text-center text-base font-extrabold text-white"
        >
          ⚖️ قارن بين الوثيقتين
        </button>
      ) : items.length > 0 ? (
        <button
          onClick={() => {
            clearHistory(profileId);
            setItems([]);
          }}
          className="mt-4 text-sm font-semibold text-rose-500 underline"
        >
          مسح كلشي
        </button>
      ) : null}
    </div>
  );
}
