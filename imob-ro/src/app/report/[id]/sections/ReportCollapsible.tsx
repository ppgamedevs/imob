import type { ReactNode } from "react";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Native details/summary — no CLS, works without client JS for expand.
 */
export default function ReportCollapsible({
  title,
  defaultOpen = false,
  children,
  className = "",
}: Props) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm ${className}`}
    >
      <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-gray-900 md:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex w-full items-center justify-between gap-2">
          <span>{title}</span>
          <span className="text-gray-400 transition-transform group-open:rotate-180">▼</span>
        </span>
      </summary>
      <div className="border-t border-gray-100 px-4 py-4 md:px-5 md:py-5">{children}</div>
    </details>
  );
}
