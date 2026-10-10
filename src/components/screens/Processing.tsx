"use client";

export default function Processing({
  message,
  progress,
}: {
  message: string;
  progress?: number | null;
}) {
  const hasProgress = typeof progress === "number" && progress > 0;

  return (
    <div className="fhemni-screen flex min-h-dvh flex-col items-center justify-center gap-7 bg-gradient-to-b from-teal-50 to-white px-6 text-center">
      <div className="text-8xl animate-pulse">🧠</div>
      <p dir="rtl" className="max-w-xs text-2xl font-bold text-slate-800">
        {message}
      </p>

      {hasProgress ? (
        <div className="w-full max-w-xs">
          <div className="h-3 w-full overflow-hidden rounded-full bg-teal-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round((progress as number) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.3s]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.15s]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-teal-600" />
        </div>
      )}
    </div>
  );
}
