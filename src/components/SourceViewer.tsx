"use client";

import { useMemo } from "react";
import type { OcrSource, OcrWord } from "@/lib/ocr";

/**
 * Finds the smallest run of consecutive OCR words whose concatenated text
 * contains the target value (loosely, ignoring spacing/punctuation
 * differences between Tesseract's word splitting and our regex-extracted
 * value). Returns the bounding box around that run, or null if nothing
 * close enough is found — the matching is best-effort, not exact, since
 * OCR text and extracted entities rarely line up character-for-character.
 */
function findWordsBBox(words: OcrWord[], target: string): OcrWord["bbox"] | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const needle = normalize(target);
  if (!needle) return null;

  for (let start = 0; start < words.length; start++) {
    let acc = "";
    for (let end = start; end < words.length && end < start + 8; end++) {
      acc += normalize(words[end].text);
      if (acc.length > needle.length + 6) break;
      if (acc.includes(needle) || (needle.length > 4 && needle.includes(acc) && acc.length > 3)) {
        const slice = words.slice(start, end + 1);
        return {
          x0: Math.min(...slice.map((w) => w.bbox.x0)),
          y0: Math.min(...slice.map((w) => w.bbox.y0)),
          x1: Math.max(...slice.map((w) => w.bbox.x1)),
          y1: Math.max(...slice.map((w) => w.bbox.y1)),
        };
      }
    }
  }
  return null;
}

export default function SourceViewer({
  source,
  value,
  onClose,
}: {
  source: OcrSource;
  value: string;
  onClose: () => void;
}) {
  const bbox = useMemo(() => findWordsBBox(source.words, value), [source, value]);
  const found = bbox !== null;
  const boxStyle = found
    ? {
        left: `${(bbox!.x0 / source.imageWidth) * 100}%`,
        top: `${(bbox!.y0 / source.imageHeight) * 100}%`,
        width: `${((bbox!.x1 - bbox!.x0) / source.imageWidth) * 100}%`,
        height: `${((bbox!.y1 - bbox!.y0) / source.imageHeight) * 100}%`,
      }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="self-end rounded-full bg-white/10 p-2 text-xl text-white"
        aria-label="سد"
      >
        ✕
      </button>
      <div className="relative m-auto max-h-[75vh] w-full max-w-md overflow-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL, never a remote image */}
        <img src={source.imageDataUrl} alt="الوثيقة" className="w-full rounded-2xl" />
        {found && (
          <div
            className="absolute rounded-md border-[3px] border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.35)]"
            style={boxStyle}
          />
        )}
      </div>
      <p dir="rtl" className="mx-auto mt-3 max-w-xs text-center text-sm font-semibold text-white/80">
        {found
          ? "هادي هي البقعة فالوثيقة اللي منها جبنا هاد المعلومة."
          : "ما قدرتش نلقى بالضبط فين كاينة هاد المعلومة فالصورة، ولكن هادي هي الوثيقة الأصلية."}
      </p>
    </div>
  );
}
