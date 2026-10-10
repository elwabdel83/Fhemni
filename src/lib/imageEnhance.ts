"use client";

const MAX_DIMENSION = 2000;

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Cheap approximate blur: draw the image very small, then scale it back up.
 * The browser's own image smoothing does the blurring for us — much faster
 * than a real box/Gaussian blur loop in JS for a multi-megapixel photo. */
function cheapBlur(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(source.width / factor));
  small.height = Math.max(1, Math.round(source.height / factor));
  const sctx = small.getContext("2d")!;
  sctx.drawImage(source, 0, 0, small.width, small.height);

  const blurred = document.createElement("canvas");
  blurred.width = source.width;
  blurred.height = source.height;
  const bctx = blurred.getContext("2d")!;
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, blurred.width, blurred.height);
  return blurred;
}

/**
 * Finds the bounding box of the document's paper within the (already
 * grayscale + contrast-stretched) canvas, using a brightness heuristic:
 * the page is assumed to be the brightest, largest region in the frame
 * (paper on a darker desk/background). This is a deliberately lightweight
 * stand-in for true perspective/skew correction — a real "straighten a
 * tilted photo" fix needs corner detection and a homography warp (e.g.
 * via OpenCV.js), which is a heavy dependency this PWA intentionally
 * avoids. What this does handle well is the common case of too much
 * background around the page. Returns null when nothing confidently
 * paper-shaped is found, so the caller can just keep the full photo.
 */
function detectDocumentBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  const { data } = ctx.getImageData(0, 0, width, height);
  const BRIGHT_THRESHOLD = 150;
  const colBright = new Uint32Array(width);
  const rowBright = new Uint32Array(height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4] > BRIGHT_THRESHOLD) {
        colBright[x]++;
        rowBright[y]++;
      }
    }
  }

  const colThresh = height * 0.12;
  const rowThresh = width * 0.12;
  let left = 0;
  let right = width - 1;
  let top = 0;
  let bottom = height - 1;
  while (left < width && colBright[left] < colThresh) left++;
  while (right > left && colBright[right] < colThresh) right--;
  while (top < height && rowBright[top] < rowThresh) top++;
  while (bottom > top && rowBright[bottom] < rowThresh) bottom--;

  const w = right - left;
  const h = bottom - top;
  // Bail out if the detected region is implausibly small (detection
  // likely failed — e.g. a dark page, or a photo with no real margin)
  // rather than risk cropping into the actual text.
  if (w < width * 0.3 || h < height * 0.3) return null;

  const marginX = Math.round(w * 0.015);
  const marginY = Math.round(h * 0.015);
  return {
    x: Math.max(0, left - marginX),
    y: Math.max(0, top - marginY),
    w: Math.min(width - Math.max(0, left - marginX), w + 2 * marginX),
    h: Math.min(height - Math.max(0, top - marginY), h + 2 * marginY),
  };
}

export type EnhancedImage = { blob: Blob; dataUrl: string; width: number; height: number };

/**
 * Prepares a photographed document for OCR:
 *  1. Downscales to a sane max resolution (faster OCR, same accuracy).
 *  2. Flattens uneven lighting/shadows (divide by a blurred version of the
 *     grayscale image — a standard, cheap "shadow removal" trick).
 *  3. Auto-stretches contrast so faint text becomes readable.
 *  4. Auto-crops to the detected page bounds (see detectDocumentBounds).
 * Falls back to returning the original file untouched if anything goes
 * wrong — enhancement should never be the reason a scan fails.
 */
export async function enhanceDocumentImageDetailed(file: File | Blob): Promise<EnhancedImage | null> {
  try {
    const img = await loadImageFromBlob(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // Grayscale in place.
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);

    // Shadow flattening: divide the grayscale image by a heavily blurred
    // copy of itself, which approximates the lighting gradient.
    const blurred = cheapBlur(canvas, 20);
    const blurCtx = blurred.getContext("2d")!;
    const blurData = blurCtx.getImageData(0, 0, width, height).data;

    let min = 255;
    let max = 0;
    const flattened = new Float32Array(width * height);
    for (let p = 0, i = 0; i < data.length; i += 4, p++) {
      const bg = blurData[i] || 1;
      const v = Math.min(255, (data[i] / bg) * 200);
      flattened[p] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    // Auto-contrast stretch to use the full 0-255 range.
    const range = Math.max(1, max - min);
    for (let p = 0, i = 0; i < data.length; i += 4, p++) {
      const v = Math.max(0, Math.min(255, ((flattened[p] - min) / range) * 255));
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);

    // Auto-crop to the detected page bounds, if confident.
    const bounds = detectDocumentBounds(ctx, width, height);
    let finalCanvas = canvas;
    if (bounds) {
      const cropped = document.createElement("canvas");
      cropped.width = bounds.w;
      cropped.height = bounds.h;
      const cropCtx = cropped.getContext("2d");
      if (cropCtx) {
        cropCtx.drawImage(canvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);
        finalCanvas = cropped;
      }
    }

    const blob: Blob | null = await new Promise((resolve) => finalCanvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return null;
    const dataUrl = finalCanvas.toDataURL("image/jpeg", 0.85);
    return { blob, dataUrl, width: finalCanvas.width, height: finalCanvas.height };
  } catch {
    return null;
  }
}

/** Back-compat helper for callers that only need the processed blob. */
export async function enhanceDocumentImage(file: File | Blob): Promise<Blob> {
  const detailed = await enhanceDocumentImageDetailed(file);
  return detailed?.blob ?? file;
}
