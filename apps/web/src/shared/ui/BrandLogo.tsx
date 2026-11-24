import { cn } from "@/shared/lib/cn";

export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="9" fill="#2563EB" />
        <path
          d="M9 19V13M13.5 22V10M18 20V12M22.5 17V15"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {!compact ? (
        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          LinguaCraft
        </span>
      ) : null}
    </span>
  );
}
