/**
 * SeismicRisk - Seismic risk badge icon
 * Building with warning indicator
 */
export function SeismicRisk({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 18V8l4-6 4 6 4-6v16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11h3M6 14h3M11 11h3M11 14h3" strokeLinecap="round" />
      <circle cx="15" cy="5" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
