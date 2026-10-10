import { db } from "@/db";
import { usageEvents, explanationFeedback } from "@/db/schema";
import { sql, desc, isNotNull } from "drizzle-orm";
import AppLogo from "@/components/AppLogo";

export const dynamic = "force-dynamic";

const MIN_VOTES_TO_SHOW = 5;

type Row = { category: string; count: number; usefulPct: number | null };

async function getObservatoireData(): Promise<Row[]> {
  if (!db) return [];

  try {
    const volumeRows = await db
      .select({ category: usageEvents.category, count: sql<number>`count(*)` })
      .from(usageEvents)
      .where(isNotNull(usageEvents.category))
      .groupBy(usageEvents.category)
      .orderBy(desc(sql`count(*)`))
      .limit(12);

    const feedbackRows = await db
      .select({
        category: explanationFeedback.category,
        total: sql<number>`count(*)`,
        useful: sql<number>`count(*) filter (where ${explanationFeedback.useful} = true)`,
      })
      .from(explanationFeedback)
      .groupBy(explanationFeedback.category);

    const feedbackByCategory = new Map(
      feedbackRows.map((r) => [
        r.category,
        Number(r.total) >= MIN_VOTES_TO_SHOW ? Math.round((Number(r.useful) / Number(r.total)) * 100) : null,
      ]),
    );

    return volumeRows
      .filter((r): r is { category: string; count: number } => r.category !== null)
      .map((r) => ({
        category: r.category,
        count: Number(r.count),
        usefulPct: feedbackByCategory.get(r.category) ?? null,
      }));
  } catch {
    return [];
  }
}

export default async function ObservatoirePage() {
  const rows = await getObservatoireData();
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div dir="rtl" className="min-h-dvh bg-gradient-to-b from-teal-50 via-white to-white px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-3">
          <AppLogo size={44} />
          <div>
            <p className="text-2xl font-extrabold text-slate-900">مرصد الوثائق ديال Fhemni</p>
            <p dir="ltr" className="text-sm font-medium text-slate-400">
              Observatoire public — quels documents bloquent le plus les gens
            </p>
          </div>
        </div>

        <p className="mt-6 text-base leading-relaxed text-slate-600">
          هاد الصفحة كتبين، بشكل مجهول وجماعي، شنو هي الوثائق اللي كثر الناس كيصورو وكيفاش كيلقاوها واضحة. ما
          كنحتفظوش بحتى وثيقة ولا بحتى معلومة شخصية.
        </p>

        {rows.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-700">🌱 المرصد مازال كيبدا</p>
            <p dir="ltr" className="mt-2 text-sm text-slate-400">
              Pas encore assez de données pour afficher des tendances fiables — revenez bientôt.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {rows.map((r) => (
              <div key={r.category} className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold text-slate-900">{r.category}</span>
                  {r.usefulPct !== null && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        r.usefulPct >= 70
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.usefulPct}% لقاوها واضحة
                    </span>
                  )}
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${(r.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p dir="ltr" className="mt-10 text-center text-xs text-slate-300">
          Fhemni · données anonymisées et agrégées uniquement
        </p>
      </div>
    </div>
  );
}
