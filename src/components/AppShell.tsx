"use client";

import { useEffect, useRef, useState } from "react";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import PasteScreen from "./screens/PasteScreen";
import Processing from "./screens/Processing";
import ResultScreen from "./screens/ResultScreen";
import HistoryScreen from "./screens/HistoryScreen";
import CompareScreen from "./screens/CompareScreen";
import AdInterstitial from "./screens/AdInterstitial";
import TranslateScreen from "./screens/TranslateScreen";
import TranslateResultScreen, { type TranslationResult } from "./screens/TranslateResultScreen";
import InviteScreen from "./screens/InviteScreen";
import BigButton from "./BigButton";
import { recognizeImageTextWithQuality, type OcrSource } from "@/lib/ocr";
import QualityWarning from "./screens/QualityWarning";
import { extractTextFromPdf } from "@/lib/pdf";
import { heuristicExplain } from "@/lib/heuristics";
import {
  addToHistory,
  addAdFreeCredits,
  bumpUsageCountAndShouldShowAd,
  consumeAdFreeCreditIfAny,
  hasSeenOnboarding,
  markOnboardingSeen,
  type HistoryItem,
} from "@/lib/history";
import {
  getProfiles,
  getActiveProfileId,
  setActiveProfileId,
  addProfile,
  type Profile,
} from "@/lib/profiles";
import {
  capturePendingReferral,
  fetchReferralCount,
  getOwnReferralCode,
  isAdsFreeUnlocked,
  reportReferralCompletionIfPending,
} from "@/lib/referral";
import type { ExplanationResult } from "@/lib/types";

type Screen =
  | "home"
  | "paste"
  | "processing"
  | "result"
  | "history"
  | "error"
  | "translate"
  | "translateResult"
  | "invite"
  | "quality"
  | "compare";

const SIMPLE_MODE_KEY = "fhemni_simple_mode_v1";
const LARGE_TEXT_KEY = "fhemni_large_text_v1";

// Belt-and-braces: the server already times out its own AI calls, but if
// anything upstream (a slow host, a dropped connection) ever leaves a
// request hanging, the person should see a clear error within a bounded
// time instead of a spinner that never resolves.
const CLIENT_FETCH_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function AppShell({ initialText }: { initialText?: string }) {
  const [mounted, setMounted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // "showAd" = actually watching the short voluntary ad (full screen).
  // "adOfferPending" = the small dismissible "watch an ad, bank 3 ad-free
  // explanations" offer shown on the result screen — never blocks it.
  const [showAd, setShowAd] = useState(false);
  const [adOfferPending, setAdOfferPending] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([{ id: "default", name: "أنا", emoji: "🙂" }]);
  const [activeProfileId, setActiveProfileIdState] = useState("default");
  const [adsFree, setAdsFree] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  // Only ever set for a single-page photo scan — with several pages or a
  // PDF/pasted source there's no one image to point back to, so the
  // "see it in the document" feature on the result screen stays hidden.
  const [sourceImage, setSourceImage] = useState<OcrSource | null>(null);
  const [compareItems, setCompareItems] = useState<{ a: HistoryItem; b: HistoryItem } | null>(null);

  const pendingLowQualityRef = useRef<{ text: string; append: boolean; source: OcrSource | null } | null>(null);
  const pageTextsRef = useRef<string[]>([]);
  const addPageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Reading localStorage/onboarding state must happen after hydration
    // (client-only APIs), so this one-time mount effect intentionally sets
    // several pieces of state together.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const seen = hasSeenOnboarding();
    setShowOnboarding(!seen);
    setSimpleMode(window.localStorage.getItem(SIMPLE_MODE_KEY) === "1");
    const savedLargeText = window.localStorage.getItem(LARGE_TEXT_KEY) === "1";
    setLargeText(savedLargeText);
    document.documentElement.classList.toggle("fhemni-large-text", savedLargeText);
    setProfiles(getProfiles());
    setActiveProfileIdState(getActiveProfileId());
    capturePendingReferral();
    const ownCode = getOwnReferralCode();
    fetchReferralCount(ownCode).then((n) => setAdsFree(isAdsFreeUnlocked(n)));
    if (initialText && seen) {
      pageTextsRef.current = [initialText];
      setPageCount(1);
      void explainCombined("text");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSimpleMode() {
    setSimpleMode((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIMPLE_MODE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function toggleLargeText() {
    setLargeText((prev) => {
      const next = !prev;
      window.localStorage.setItem(LARGE_TEXT_KEY, next ? "1" : "0");
      document.documentElement.classList.toggle("fhemni-large-text", next);
      return next;
    });
  }

  function switchProfile(id: string) {
    setActiveProfileId(id);
    setActiveProfileIdState(id);
  }

  function handleAddProfile(name: string) {
    const p = addProfile(name);
    setProfiles(getProfiles());
    switchProfile(p.id);
  }

  function goHome() {
    pageTextsRef.current = [];
    setPageCount(1);
    setSourceImage(null);
    setResult(null);
    setAdOfferPending(false);
    setScreen("home");
  }

  function showFriendlyError(message: string) {
    setErrorMessage(message);
    setScreen("error");
  }

  function finishExplain(data: ExplanationResult) {
    addToHistory(data, activeProfileId);
    void reportReferralCompletionIfPending();
    // Trust-first ad model: the result is never blocked behind an ad.
    // Every so often we just offer a voluntary, dismissible trade — watch
    // a short ad, bank a few ad-free explanations — shown as a small card
    // on the result screen itself, not a forced interstitial.
    const dueForOffer = !adsFree && bumpUsageCountAndShouldShowAd(4);
    const usedCredit = dueForOffer && consumeAdFreeCreditIfAny();
    setAdOfferPending(dueForOffer && !usedCredit);
    setResult(data);
    setScreen("result");
  }

  async function explainCombined(source: "photo" | "text" | "pdf") {
    const combined = pageTextsRef.current.join("\n\n---\n\n").trim();
    if (!combined) {
      showFriendlyError("ما لقيتش شي نص فالصورة. جرب تصور مرة أخرى بضو أكثر.");
      return;
    }
    setProcessingMessage("🧠 داب كنشرح ليك...");
    setProcessingProgress(null);
    setScreen("processing");

    // No internet at all: skip the network call entirely and use the local,
    // offline explanation engine — Fhemni should still be useful with a weak
    // or absent signal, not just show an error.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      finishExplain(heuristicExplain(combined));
      return;
    }

    try {
      const res = await fetchWithTimeout("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combined, source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showFriendlyError(data?.error ?? "ما قدرتش نفهم هاد النص دابا. جرب مرة أخرى.");
        return;
      }
      const data: ExplanationResult = await res.json();
      finishExplain(data);
    } catch {
      // Network request failed mid-flight (weak signal dropped) — fall back
      // to the offline engine rather than leaving the person stuck.
      finishExplain(heuristicExplain(combined));
    }
  }

  async function runOcr(file: File, append: boolean) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setProcessingMessage(isPdf ? "📄 كنقرا PDF..." : "📷 كنقرا الورقة...");
    setProcessingProgress(0.02);
    setScreen("processing");
    try {
      let text: string;
      if (isPdf) {
        text = await extractTextFromPdf(file, (p) => {
          setProcessingMessage(`📄 كنقرا PDF... ${Math.round(p.progress * 100)}%`);
          setProcessingProgress(p.progress);
        });
      } else {
        const result = await recognizeImageTextWithQuality(file, (p) => {
          if (p.status === "recognizing text") {
            setProcessingMessage(`📷 كنقرا الورقة... ${Math.round(p.progress * 100)}%`);
            setProcessingProgress(p.progress);
          }
        });
        text = result.text;
        if (result.quality.level === "low" && text.trim().length > 0) {
          pendingLowQualityRef.current = { text, append, source: result.source };
          setScreen("quality");
          return;
        }
        // A fresh single photo gets its source image kept for citations;
        // anything appended to a multi-page doc makes the mapping
        // ambiguous, so we drop it instead of showing the wrong page.
        setSourceImage(append ? null : result.source);
      }
      if (!text.trim()) {
        showFriendlyError(
          isPdf
            ? "ما لقيتش نص فهاد PDF. جرب ملف آخر."
            : "هاد الصورة ما بانتش مزيان. جرب صورها مرة أخرى بضو أكثر.",
        );
        return;
      }
      if (isPdf) setSourceImage(null);
      if (append) pageTextsRef.current = [...pageTextsRef.current, text];
      else pageTextsRef.current = [text];
      setPageCount(pageTextsRef.current.length);
      await explainCombined(isPdf ? "pdf" : "photo");
    } catch {
      showFriendlyError(
        isPdf
          ? "ما قدرتش نقرا هاد PDF. جرب ملف آخر."
          : "هاد الصورة ما بانتش مزيان. جرب صورها مرة أخرى بضو أكثر.",
      );
    }
  }

  async function continueWithLowQuality() {
    const pending = pendingLowQualityRef.current;
    if (!pending) {
      goHome();
      return;
    }
    if (pending.append) pageTextsRef.current = [...pageTextsRef.current, pending.text];
    else pageTextsRef.current = [pending.text];
    setPageCount(pageTextsRef.current.length);
    setSourceImage(pending.append ? null : pending.source);
    pendingLowQualityRef.current = null;
    await explainCombined("photo");
  }

  function retakePhoto() {
    pendingLowQualityRef.current = null;
    goHome();
  }

  function handleNewPhoto(file: File) {
    pageTextsRef.current = [];
    setPageCount(0);
    void runOcr(file, false);
  }

  function handleAddPage() {
    addPageInputRef.current?.click();
  }

  function handlePasteExplain(text: string) {
    pageTextsRef.current = [text];
    setPageCount(1);
    setSourceImage(null);
    void explainCombined("text");
  }

  async function handleTranslate(text: string, sourceLang: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setProcessingMessage("🗣️ داب كنترجم ليك...");
    setProcessingProgress(null);
    setScreen("processing");

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showFriendlyError("🔌 الأنترنيت ماكاينش. عاود جرب ملي تكون كونيكتي.");
      return;
    }

    try {
      const res = await fetchWithTimeout("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, sourceLang }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.darija) {
        showFriendlyError(data?.error ?? "ما قدرتش نترجم دابا. عاود جرب.");
        return;
      }
      setTranslationResult({
        originalText: data.originalText ?? trimmed,
        darija: data.darija,
        darijaLatin: data.darijaLatin ?? "",
      });
      setScreen("translateResult");
    } catch {
      showFriendlyError("ما قدرتش نتصل. تأكد من الأنترنيت وعاود جرب.");
    }
  }

  function handleCompare(a: HistoryItem, b: HistoryItem) {
    setCompareItems({ a, b });
    setScreen("compare");
  }

  function openHistoryItem(item: HistoryItem) {
    setResult(item.result);
    setPageCount(1);
    // History never persists the source photo (privacy: we don't keep
    // document images around), so citations aren't available for it.
    setSourceImage(null);
    setScreen("result");
  }

  if (!mounted) {
    return <div className="min-h-dvh bg-white" />;
  }

  if (showOnboarding) {
    return (
      <Onboarding
        onDone={() => {
          markOnboardingSeen();
          setShowOnboarding(false);
          if (initialText) {
            pageTextsRef.current = [initialText];
            setPageCount(1);
            void explainCombined("text");
          }
        }}
      />
    );
  }

  return (
    <>
      <input
        ref={addPageInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void runOcr(file, true);
          e.target.value = "";
        }}
      />

      {screen === "home" && (
        <Home
          onPickPhoto={handleNewPhoto}
          onGoPaste={() => setScreen("paste")}
          onGoTranslate={() => setScreen("translate")}
          onGoHistory={() => setScreen("history")}
          onGoInvite={() => setScreen("invite")}
          simpleMode={simpleMode}
          onToggleSimpleMode={toggleSimpleMode}
          largeText={largeText}
          onToggleLargeText={toggleLargeText}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSwitchProfile={switchProfile}
          onAddProfile={handleAddProfile}
        />
      )}

      {screen === "quality" && (
        <QualityWarning onRetake={retakePhoto} onContinueAnyway={continueWithLowQuality} />
      )}

      {screen === "invite" && <InviteScreen onBack={goHome} />}

      {screen === "paste" && <PasteScreen onBack={goHome} onExplain={handlePasteExplain} />}

      {screen === "translate" && <TranslateScreen onBack={goHome} onTranslate={handleTranslate} />}

      {screen === "translateResult" && translationResult && (
        <TranslateResultScreen result={translationResult} onBack={() => setScreen("translate")} />
      )}

      {screen === "processing" && <Processing message={processingMessage} progress={processingProgress} />}

      {screen === "result" && result && (
        <ResultScreen
          result={result}
          simpleMode={simpleMode}
          onBack={goHome}
          onAddPage={handleAddPage}
          pageCount={pageCount}
          sourceImage={pageCount > 1 ? null : sourceImage}
          adOffer={adOfferPending}
          onWatchAd={() => setShowAd(true)}
          onDismissAdOffer={() => setAdOfferPending(false)}
        />
      )}

      {screen === "history" && (
        <HistoryScreen
          onBack={goHome}
          onOpen={openHistoryItem}
          onCompare={handleCompare}
          profileId={activeProfileId}
        />
      )}

      {screen === "compare" && compareItems && (
        <CompareScreen itemA={compareItems.a} itemB={compareItems.b} onBack={() => setScreen("history")} />
      )}

      {screen === "error" && (
        <div className="fhemni-screen flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6 text-center">
          <span className="text-7xl">😕</span>
          <p dir="rtl" className="max-w-xs text-xl font-bold text-slate-800">
            {errorMessage}
          </p>
          <div className="w-full max-w-xs">
            <BigButton emoji="⬅️" label="رجوع" onClick={goHome} variant="ghost" />
          </div>
        </div>
      )}

      {showAd && (
        <AdInterstitial
          onContinue={() => {
            setShowAd(false);
            addAdFreeCredits(3);
            setAdOfferPending(false);
          }}
        />
      )}
    </>
  );
}
