export type ImportantInfo = {
  dates: string[];
  deadlines: string[];
  amounts: string[];
  addresses: string[];
  phones: string[];
};

export type DocumentStatus = "accepted" | "rejected" | "attention" | "unclear";

export type ExplanationResult = {
  originalText: string;
  category: string;
  // Darija-only name for the document type, the one actually shown on
  // screen. `category` stays French/technical and internal (used to key
  // quick-questions and the feedback endpoint), never rendered directly.
  categoryDarija: string;
  categoryEmoji: string;
  explanation: string;
  simpleExplanation: string;
  actions: string[];
  importantInfo: ImportantInfo;
  disclaimer: string | null;
  confidenceWarning: string | null;
  usedAI: boolean;
  status: DocumentStatus;
};

export type QuickAnswer = {
  question: string;
  answer: string;
};
