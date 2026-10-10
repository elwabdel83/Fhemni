import type { DocumentStatus, ExplanationResult, ImportantInfo } from "./types";

// ---------------------------------------------------------------------------
// Entity extraction (dates, amounts, phones...) shared by the AI path and the
// offline fallback path. Pure regex, no external service needed.
// ---------------------------------------------------------------------------

const MONTHS_FR = [
  "janvier",
  "février",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
  "decembre",
];

export function extractImportantInfo(text: string): ImportantInfo {
  const dates = new Set<string>();
  const deadlines = new Set<string>();
  const amounts = new Set<string>();
  const addresses = new Set<string>();
  const phones = new Set<string>();

  const dateRegexNumeric = /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g;
  const dateRegexTextual = new RegExp(
    `\\b\\d{1,2}\\s+(${MONTHS_FR.join("|")})\\s*\\d{0,4}\\b`,
    "gi",
  );

  for (const m of text.match(dateRegexNumeric) ?? []) dates.add(m);
  for (const m of text.match(dateRegexTextual) ?? []) dates.add(m.trim());

  const deadlineTriggers =
    /(avant le|jusqu'au|jusqu au|délai|delai|akher ajal|قبل|آخر أجل|dernier délai|dernier delai)[^.\n،؛]{0,40}/gi;
  for (const m of text.match(deadlineTriggers) ?? []) {
    const dateInside =
      m.match(dateRegexNumeric)?.[0] ?? m.match(dateRegexTextual)?.[0];
    deadlines.add(dateInside ? dateInside.trim() : m.trim());
  }

  const amountRegex =
    /\b\d[\d\s.,]{0,12}\s?(dh|درهم|mad|dhs|€|eur|euros?)\b/gi;
  for (const m of text.match(amountRegex) ?? []) amounts.add(m.trim());

  const phoneRegex = /(\+212|0)([\s.\-]?\d){9}/g;
  for (const m of text.match(phoneRegex) ?? []) phones.add(m.trim());

  const addressTriggers =
    /(rue|avenue|boulevard|bd|hay|quartier|résidence|residence|شارع|حي|زنقة)[^.\n،؛]{0,50}/gi;
  for (const m of text.match(addressTriggers) ?? []) addresses.add(m.trim());

  return {
    dates: Array.from(dates).slice(0, 5),
    deadlines: Array.from(deadlines).slice(0, 3),
    amounts: Array.from(amounts).slice(0, 5),
    addresses: Array.from(addresses).slice(0, 3),
    phones: Array.from(phones).slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// Category detection (kept internal, never shown as a technical label)
// ---------------------------------------------------------------------------

const CATEGORY_RULES: { key: string; emoji: string; label: string; words: RegExp }[] = [
  { key: "banque", emoji: "🏦", label: "Message bancaire", words: /(banque|compte bancaire|virement|carte bancaire|rib|بنك|حساب بنكي)/i },
  { key: "assurance", emoji: "🛡️", label: "Assurance", words: /(assurance|sinistre|police d'assurance|تأمين)/i },
  { key: "facture", emoji: "🧾", label: "Facture", words: /(facture|impayé|montant à payer|facturation|فاتورة)/i },
  { key: "securite_sociale", emoji: "🩹", label: "CNSS / Sécurité sociale", words: /(cnss|cnops|amo|assurance maladie|caisse nationale|صندوق الضمان|كناسا)/i },
  { key: "emploi", emoji: "👔", label: "ANAPEC / Emploi", words: /(anapec|offre d'emploi|entretien d'embauche|recrutement|أنابيك|توظيف)/i },
  { key: "etat_civil", emoji: "🪪", label: "État civil", words: /(acte de naissance|carte d'identité|cin\b|passeport|état civil|الحالة المدنية|بطاقة التعريف|عقد الازدياد)/i },
  { key: "impots", emoji: "💸", label: "Impôts / DGI", words: /(impôts?|dgi|taxe|redevance|الضريبة|الضرائب)/i },
  { key: "administration", emoji: "🏛️", label: "Administration", words: /(dossier|administration|commune|préfecture|wilaya|autorité|إدارة|عمالة|مقاطعة)/i },
  { key: "ecole", emoji: "🏫", label: "École", words: /(école|scolaire|inscription|professeur|classe|مدرسة|تمدرس)/i },
  { key: "travail", emoji: "💼", label: "Travail", words: /(contrat de travail|employeur|salaire|démission|عمل|أجر)/i },
  { key: "livraison", emoji: "📦", label: "Livraison / Colis", words: /(colis|livraison|livreur|expédition|طرد|توصيل)/i },
  { key: "immobilier", emoji: "🏠", label: "Immobilier", words: /(loyer|bail|propriétaire|locataire|kra|كراء)/i },
  { key: "sante", emoji: "🩺", label: "Santé", words: /(ordonnance|médecin|hôpital|pharmacie|dawa|médicament|طبيب|دواء)/i },
  { key: "whatsapp", emoji: "💬", label: "Message WhatsApp / SMS", words: /(salam|kifach|whatsapp|😊|❤️|👍)/i },
  { key: "juridique", emoji: "⚖️", label: "Document juridique", words: /(tribunal|avocat|jugement|convocation|محكمة|محامي)/i },
  { key: "publicite", emoji: "📢", label: "Publicité", words: /(promo|offre spéciale|réduction|gratuit pour vous|عرض خاص)/i },
];

export function detectCategory(text: string): { key: string; emoji: string; label: string } {
  for (const rule of CATEGORY_RULES) {
    if (rule.words.test(text)) {
      return { key: rule.key, emoji: rule.emoji, label: rule.label };
    }
  }
  return { key: "general", emoji: "📄", label: "Information générale" };
}

// What the person actually reads on screen: a short, authentically-Darija
// name for the document type, never the French/technical label above
// (which only exists internally, to key the quick-questions and the
// feedback endpoint). Keyed by category key, not by the AI's free-text
// category string, so it's always reliable regardless of AI provider.
const CATEGORY_LABEL_DARIJA: Record<string, string> = {
  banque: "رسالة ديال البنك",
  assurance: "التأمين",
  facture: "فاكتورة / خلاص",
  securite_sociale: "الضمان الاجتماعي (CNSS)",
  emploi: "خدمة / أنابيك",
  etat_civil: "الحالة المدنية",
  impots: "الضرائب",
  administration: "وثيقة إدارية",
  ecole: "المدرسة",
  travail: "عقد الخدمة",
  livraison: "طرد / توصيل",
  immobilier: "الكراء / السكن",
  sante: "الصحة",
  whatsapp: "رسالة",
  juridique: "وثيقة ديال المحكمة",
  publicite: "عرض / بوبليسيتي",
  general: "وثيقة",
};

export function categoryLabelDarija(categoryKey: string): string {
  return CATEGORY_LABEL_DARIJA[categoryKey] ?? CATEGORY_LABEL_DARIJA.general;
}

export function needsSafetyDisclaimer(categoryKey: string): string | null {
  if (categoryKey === "sante") {
    return "هاد الشرح عام. ما ناخدوش قرار على دواء أو تشخيص. سولو الطبيب أو الفارماسيان قبل ما تدير أي حاجة.";
  }
  if (
    categoryKey === "juridique" ||
    categoryKey === "administration" ||
    categoryKey === "impots" ||
    categoryKey === "etat_civil"
  ) {
    return "هاد الشرح عام باش يفهمك الوثيقة. إلا كان عندك شك، تواصل مع الإدارة أو مع متخصص قبل ما تتخذ قرار مهم.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Offline / no-API-key fallback explainer.
// It never invents facts: it only rephrases patterns it can safely detect,
// and is honest with the user when it can't fully understand the text.
// ---------------------------------------------------------------------------

type Rule = { test: RegExp; darija: string; status?: DocumentStatus };

const PHRASE_RULES: Rule[] = [
  { test: /rejeté|refusé|مرفوض|رفض/i, darija: "الطلب ديالك ما تقبلش.", status: "rejected" },
  {
    test: /pièces? justificatives?.{0,20}manquante|وثائق ناقصة|ناقصين/i,
    darija: "كاينين شي وراق ناقصين فالملف ديالك.",
    status: "attention",
  },
  {
    test: /en cours de traitement|قيد المعالجة|كيتعالج/i,
    darija: "الطلب ديالك مازال كيتعالج، صبر شوية.",
    status: "attention",
  },
  { test: /colis|livraison|livré|طرد|توصيل/i, darija: "كايتكلم على شي طرد اللي غادي يوصلك." },
  { test: /facture|montant à payer|فاتورة/i, darija: "كاين شي مبلغ خاصك تخلصو.", status: "attention" },
  { test: /convocation|convoqu|استدعاء/i, darija: "خاصك تمشي لشي مكان فتاريخ معين.", status: "attention" },
  {
    // Softened on purpose: a single matched keyword is not enough to
    // confidently tell someone their request was approved — false
    // reassurance is worse than honest uncertainty here.
    test: /accepté|approuvé|مقبول|تمت الموافقة/i,
    darija: "🔎 لقيت كلمة كتدل على القبول فالوثيقة، ولكن ماقدرتش نتأكد من السياق كامل بلا الشرح الذكي.",
    status: "accepted",
  },
  { test: /cnss|cnops|caisse nationale|صندوق الضمان|كناسا/i, darija: "كايتكلم على الضمان الاجتماعي ديالك (CNSS)." },
  { test: /anapec|offre d'emploi|entretien d'embauche|أنابيك|توظيف/i, darija: "كايتكلم على شي فرصة ديال الخدمة." },
];

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "…";
}

export function heuristicExplain(rawText: string): ExplanationResult {
  const text = rawText.trim();
  const info = extractImportantInfo(text);
  const category = detectCategory(text);

  const matchedRules = PHRASE_RULES.filter((r) => r.test.test(text));
  const matched = matchedRules.map((r) => r.darija);

  let explanation: string;
  let confidenceWarning: string | null = null;

  if (!text || text.length < 3) {
    explanation = "ما قدرتش نقرا شي حاجة واضحة. جرب صور الورقة مرة أخرى بضوء أكثر.";
    confidenceWarning = "🟠 ما بانليش النص مزيان.";
  } else if (matched.length > 0) {
    explanation = matched.join(" ");
  } else {
    explanation =
      "قريت النص، ولكن باش نشرحو ليك بالتفصيل بالدارجة خاصني نتصل بالخدمة الذكية اللي مازال ما تفعلاتش هنا. هادو هوما الكلمات اللي لقيت فالوثيقة: " +
      truncate(text, 220);
    confidenceWarning = "🟠 الشرح ديالي بسيط هنا، ما فعلاتش بعد الخدمة الذكية الكاملة.";
  }

  const simpleExplanation =
    matched.length > 0
      ? matched[0]
      : "هادي وثيقة، اقرا معايا الكلمات المهمة تحت.";

  const actions: string[] = [];
  if (info.deadlines.length > 0) actions.push(`خاصك تدير هاد الحاجة قبل: ${info.deadlines[0]}`);
  if (/pièces? justificatives?|وثائق|وراق/i.test(text)) actions.push("جمع الوراق اللي ناقصين وعاود قدم الملف.");
  if (/payer|paiement|facture|خلص|فاتورة/i.test(text)) actions.push("خاصك تخلص المبلغ المطلوب.");
  if (actions.length === 0) actions.push("اقرا الشرح مزيان، وإلا كان عندك شك تواصل مع اللي صيفط ليك الوثيقة.");

  // Honest status: prefer caution over false reassurance. "unclear" is a
  // legitimate, deliberately chosen outcome — not a bug — when nothing
  // concrete enough was detected.
  const statuses = matchedRules.map((r) => r.status).filter((s): s is DocumentStatus => Boolean(s));
  let status: DocumentStatus;
  if (statuses.includes("rejected")) status = "rejected";
  else if (statuses.includes("attention") || info.deadlines.length > 0) status = "attention";
  else if (statuses.includes("accepted")) status = "accepted";
  else status = "unclear";

  return {
    originalText: text,
    category: category.label,
    categoryDarija: categoryLabelDarija(category.key),
    categoryEmoji: category.emoji,
    explanation,
    simpleExplanation,
    actions,
    importantInfo: info,
    disclaimer: needsSafetyDisclaimer(category.key),
    confidenceWarning,
    usedAI: false,
    status,
  };
}
