import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

// Anonymous, privacy-friendly usage analytics only.
// We NEVER store the content of a user's photo or pasted text here –
// only an event type + a coarse category, so we can understand product
// usage (section 38 of the spec) without keeping sensitive documents.
export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Real, aggregated "was this explanation clear?" feedback per document
// category. Never tied to the document content or to an identifiable
// person — just a category + a thumbs up/down, used to build an honest
// trust signal over time (no invented numbers).
export const explanationFeedback = pgTable("explanation_feedback", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  useful: boolean("useful").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Referral loop: each install generates a random local code (no accounts).
// When someone opens the app via a shared link and completes their first
// explanation, we record one completion for that code. The referrer's
// device then polls its own code's count to unlock a real reward.
export const referralCompletions = pgTable("referral_completions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
