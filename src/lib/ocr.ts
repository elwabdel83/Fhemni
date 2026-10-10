"use client";

import { createWorker } from "tesseract.js";
import { enhanceDocumentImageDetailed } from "./imageEnhance";

export type OcrProgress = { status: string; progress: number };
export type OcrQuality = { level: "good" | "low"; confidence: number; charCount: number };
export type OcrWord = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };
// Present only for a real photographed page (not PDFs or pasted text), and
// only when the enhancement/crop step succeeded — this is what lets the
// result screen later show "👁️ see it in the document" for a given fact.
export type OcrSource = { imageDataUrl: string; imageWidth: number; imageHeight: number; words: OcrWord[] };
export type OcrResult = { text: string; quality: OcrQuality; source: OcrSource | null };

// We keep a single worker instance alive between calls so that adding extra
// pages ("+ Ajouter une page") is fast the second time around.
let workerPromise: ReturnType<typeof createWorker> | null = null;

function getWorker(onProgress?: (p: OcrProgress) => void) {
  if (!workerPromise) {
    workerPromise = createWorker(["fra", "ara", "eng"], 1, {
      logger: (m: { status: string; progress: number }) => {
        onProgress?.({ status: m.status, progress: m.progress });
      },
    });
  }
  return workerPromise;
}

function assessQuality(text: string, confidence: number): OcrQuality {
  const charCount = text.replace(/\s/g, "").length;
  const level: OcrQuality["level"] = confidence < 55 || charCount < 12 ? "low" : "good";
  return { level, confidence, charCount };
}

/** Runs OCR and returns both the text and a quality assessment, so the
 * caller can prompt a retake instead of explaining a garbled scan. Only
 * real photos are enhanced first — PDF-rendered pages are already clean. */
export async function recognizeImageTextWithQuality(
  image: File | Blob | string,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const worker = await getWorker(onProgress);

  let input: File | Blob | string = image;
  let source: OcrSource | null = null;
  if (image instanceof File) {
    const enhanced = await enhanceDocumentImageDetailed(image);
    if (enhanced) {
      input = enhanced.blob;
      // words are filled in below, once we have the recognition result.
      source = { imageDataUrl: enhanced.dataUrl, imageWidth: enhanced.width, imageHeight: enhanced.height, words: [] };
    }
  }

  const { data } = await worker.recognize(input);
  const text = (data.text ?? "").trim();
  const confidence = typeof data.confidence === "number" ? data.confidence : 100;

  if (source) {
    // Tesseract.js exposes word-level boxes on data.words; guard defensively
    // since the exact shape has shifted across versions.
    const rawWords = (data as { words?: { text: string; bbox: OcrWord["bbox"] }[] }).words ?? [];
    source.words = rawWords
      .filter((w) => w.text && w.text.trim().length > 0 && w.bbox)
      .map((w) => ({ text: w.text, bbox: w.bbox }));
  }

  return { text, quality: assessQuality(text, confidence), source };
}

/** Back-compat helper for callers that only need the text. */
export async function recognizeImageText(
  image: File | Blob | string,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const { text } = await recognizeImageTextWithQuality(image, onProgress);
  return text;
}
