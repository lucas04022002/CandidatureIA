import type { CSSProperties } from "react";

interface IconProps {
  className?: string;
  size?: number;
  style?: CSSProperties;
}

function baseProps(size = 18, className?: string, style?: CSSProperties) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
  };
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h2" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M6 10a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17S6 16 6 10" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ColumnsIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="16" rx="1.5" />
      <rect x="17" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <path d="M12 21s6-4.35 6-11a6 6 0 1 0-12 0c0 6.65 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...baseProps(props.size, props.className, props.style)}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </svg>
  );
}
