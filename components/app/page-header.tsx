import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="label-xs">Workspace</p>
        <h1 className="mt-2 text-[27px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground-dim)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
