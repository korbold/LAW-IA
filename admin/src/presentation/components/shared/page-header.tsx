import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between animate-fade-up">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-[#e8e4df]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[#5a5650] mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
