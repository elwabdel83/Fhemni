export default function AppLogo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Fhemni"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="fhemni-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="26" fill="url(#fhemni-logo-bg)" />
      <path
        d="M22 38c0-9.941 8.059-18 18-18h20c9.941 0 18 8.059 18 18v10c0 9.941-8.059 18-18 18H41l-12.5 10.5c-1.6 1.35-4 .22-4-1.87V38z"
        fill="white"
      />
      <rect x="35" y="34" width="6.5" height="18" rx="3.25" fill="#f97316" />
      <rect x="45" y="27" width="6.5" height="32" rx="3.25" fill="#f97316" />
      <rect x="55" y="27" width="6.5" height="32" rx="3.25" fill="#f97316" />
      <rect x="65" y="34" width="6.5" height="18" rx="3.25" fill="#f97316" />
    </svg>
  );
}
