import React from "react";

export default function Sparkline({
  values,
  width = 120,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (!values || values.length === 0) return <div className="text-sm text-muted-foreground">—</div>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");
  const last = values[values.length - 1];
  const color = last >= values[0] ? "#10B981" : "#EF4444"; // green up, red down

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline fill="none" stroke={color} strokeWidth={2} points={points} />
    </svg>
  );
}
