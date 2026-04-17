import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: number;
  delay?: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className="animate-fade-up group relative overflow-hidden rounded-2xl border border-[rgba(43,94,167,0.1)] bg-[#0f1d32] p-6 transition-all duration-300 hover:border-[rgba(43,94,167,0.2)] hover:shadow-lg hover:shadow-[rgba(43,94,167,0.06)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(43,94,167,0.03)] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]">
            {title}
          </p>
          <p
            className="text-3xl font-bold tracking-tight text-[#e2e8f0]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {value}
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(43,94,167,0.15)] bg-[rgba(43,94,167,0.08)] p-2.5">
          <Icon className="h-5 w-5 text-[#3b82f6]" />
        </div>
      </div>

      {(description || trend !== undefined) && (
        <div className="relative mt-4 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-semibold",
                trend >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
          {description && (
            <span className="text-[#475569]">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
