/**
 * AvmBadge - Automated Valuation Model icon
 * Checkmark in rounded square badge
 */
export function AvmBadge({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 10l3.2 3.2L16 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.5" y="2.5" width="15" height="15" rx="3" />
    </svg>
  );
}
