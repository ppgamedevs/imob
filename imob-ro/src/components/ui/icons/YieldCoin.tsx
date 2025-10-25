/**
 * YieldCoin - Yield/ROI coin icon
 * Stack of coins for investment returns
 */
export function YieldCoin({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="10" cy="8" r="5" />
      <ellipse cx="10" cy="14" rx="5" ry="2" />
      <path d="M5 8v6c0 1.1 2.2 2 5 2s5-.9 5-2V8" />
    </svg>
  );
}
