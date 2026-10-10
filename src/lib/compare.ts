import type { ExplanationResult, DocumentStatus } from "./types";

export const STATUS_DARIJA: Record<DocumentStatus, string> = {
  accepted: "مقبول",
  rejected: "مرفوض",
  attention: "خاصك تنتبه",
  unclear: "ماشي واضح بزاف",
};

function diffList(emoji: string, label: string, before: string[], after: string[]): string | null {
  const b = before.join(" / ") || "—";
  const a = after.join(" / ") || "—";
  if (b === a) return null;
  return `${emoji} ${label}: كان ${b}، دابا صار ${a}.`;
}

/**
 * Pure, deterministic, offline comparison between two explanations of what
 * are presumably two versions of the same kind of document (e.g. an older
 * and a newer CNSS letter). No AI involved on purpose — this only needs to
 * be a reliable diff of what we already extracted, not a new interpretation.
 */
export function compareExplanations(before: ExplanationResult, after: ExplanationResult): string[] {
  const lines: string[] = [];

  if (before.status !== after.status) {
    lines.push(`🔄 الحالة بدلت: كانت "${STATUS_DARIJA[before.status]}"، دابا صارت "${STATUS_DARIJA[after.status]}".`);
  }

  const amounts = diffList("💰", "المبلغ", before.importantInfo.amounts, after.importantInfo.amounts);
  if (amounts) lines.push(amounts);

  const deadlines = diffList("🔴", "آخر أجل", before.importantInfo.deadlines, after.importantInfo.deadlines);
  if (deadlines) lines.push(deadlines);

  const dates = diffList("📅", "التاريخ", before.importantInfo.dates, after.importantInfo.dates);
  if (dates) lines.push(dates);

  const addresses = diffList("📍", "المكان", before.importantInfo.addresses, after.importantInfo.addresses);
  if (addresses) lines.push(addresses);

  if (lines.length === 0) {
    lines.push("👀 ما لقيتش شي تبديل واضح بين الوثيقتين — كيبانو متقاربين.");
  }

  return lines;
}
