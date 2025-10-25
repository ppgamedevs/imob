/**
 * Metro - Metro/subway station icon
 * M symbol in circle for metro proximity
 */
export function Metro({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="10" cy="10" r="7.5" />
      <path d="M6 12l4-6 4 6M6 14h8" strokeLinecap="round" />
    </svg>
  );
}
