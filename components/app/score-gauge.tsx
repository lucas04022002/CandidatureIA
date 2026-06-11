"use client";

import { cn } from "@/lib/cn";

interface ScoreGaugeProps {
  value: number;
  size?: number;
  thickness?: number;
  className?: string;
}

function scoreColor(value: number) {
  if (value >= 85) return "var(--good)";
  if (value >= 72) return "var(--mid)";
  return "var(--low)";
}

export function ScoreGauge({
  value,
  size = 56,
  thickness = 6,
  className,
}: ScoreGaugeProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  const strokeColor = scoreColor(safeValue);
  const radius = Math.max(1, (size - thickness - 2) / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeValue / 100);
  const center = size / 2;
  const innerSize = Math.max(18, size - thickness * 2 - Math.max(6, Math.round(size * 0.12)));
  const fontSize = Math.max(10, Math.min(18, Math.round(size * 0.25)));

  return (
    <div
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      aria-label={`Score ${safeValue} sur 100`}
    >
      <svg
        className="-rotate-90 absolute inset-0 overflow-visible"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--border) 88%, transparent)"
          strokeWidth={thickness}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          vectorEffect="non-scaling-stroke"
          style={{
            transition:
              "stroke-dashoffset 0.8s cubic-bezier(.22,.8,.25,1), stroke 0.25s ease-out",
            filter: `drop-shadow(0 0 ${Math.max(6, Math.round(size * 0.18))}px color-mix(in srgb, ${strokeColor} 22%, transparent))`,
          }}
        />
      </svg>
      <div
        className="grid place-items-center rounded-full border border-white/6 bg-[var(--card)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ width: innerSize, height: innerSize }}
      >
        <span
          className="font-mono font-semibold tracking-[-0.02em]"
          style={{ color: strokeColor, fontFeatureSettings: '"tnum" 1', fontSize }}
        >
          {safeValue}
        </span>
      </div>
    </div>
  );
}
