/**
 * TtsBolt - Time to Sell lightning bolt icon
 * Fast/rapid indicator for quick sales
 */
export function TtsBolt({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M11 1L3 11h5l-1 8 8-10h-5l1-8z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
