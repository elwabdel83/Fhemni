"use client";

import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "indigo";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-teal-600 text-white shadow-[0_14px_30px_rgba(13,148,136,0.35)] active:scale-[0.98] hover:bg-teal-700",
  secondary:
    "bg-orange-500 text-white shadow-[0_14px_30px_rgba(249,115,22,0.3)] active:scale-[0.98] hover:bg-orange-600",
  ghost:
    "bg-white text-slate-800 border-2 border-slate-200 active:scale-[0.98] hover:border-teal-400",
  danger:
    "bg-rose-600 text-white shadow-[0_14px_30px_rgba(225,29,72,0.3)] active:scale-[0.98] hover:bg-rose-700",
  success:
    "bg-emerald-600 text-white shadow-[0_14px_30px_rgba(5,150,105,0.3)] active:scale-[0.98] hover:bg-emerald-700",
  indigo:
    "bg-indigo-600 text-white shadow-[0_14px_30px_rgba(79,70,229,0.3)] active:scale-[0.98] hover:bg-indigo-700",
};

export default function BigButton({
  emoji,
  label,
  subLabel,
  onClick,
  variant = "primary",
  size = "lg",
  disabled,
  type = "button",
}: {
  emoji?: string;
  label: string;
  subLabel?: string;
  onClick?: () => void;
  variant?: Variant;
  size?: "lg" | "md" | "sm";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const sizeClasses =
    size === "lg"
      ? "py-8 px-6 text-2xl gap-3"
      : size === "md"
        ? "py-5 px-5 text-xl gap-2"
        : "py-3 px-4 text-base gap-2";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full flex-col items-center justify-center rounded-[2rem] font-bold leading-tight transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 ${sizeClasses} ${VARIANT_CLASSES[variant]}`}
    >
      {emoji ? <span className={size === "lg" ? "text-6xl" : "text-4xl"}>{emoji}</span> : null}
      <span>{label}</span>
      {subLabel ? <span className="text-sm font-medium opacity-90">{subLabel}</span> : null}
    </button>
  );
}

export function IconChip({
  emoji,
  label,
  onClick,
  active,
}: {
  emoji: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border-2 px-4 py-3 text-base font-semibold transition-colors ${
        active
          ? "border-teal-600 bg-teal-50 text-teal-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  );
}
