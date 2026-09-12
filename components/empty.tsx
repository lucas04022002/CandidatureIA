import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyProps {
  text: string;
  action?: ReactNode;
  className?: string;
}

export function Empty({ text, action, className }: EmptyProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-tile border border-line bg-white px-6 py-10 text-center", className)}>
      <p className="font-body text-[15px] text-grey">{text}</p>
      {action}
    </div>
  );
}
