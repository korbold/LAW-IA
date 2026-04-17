import { cn } from "@/lib/utils";

type StatusType = "ACTIVE" | "SUSPENDED" | "USER" | "ADMIN" | "SUPER_ADMIN" | "UP" | "DOWN" | "DEGRADED";

const statusConfig: Record<StatusType, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  ACTIVE: { label: "Activo", dotColor: "bg-emerald-400", bgColor: "bg-emerald-400/10", textColor: "text-emerald-400" },
  SUSPENDED: { label: "Suspendido", dotColor: "bg-red-400", bgColor: "bg-red-400/10", textColor: "text-red-400" },
  USER: { label: "Usuario", dotColor: "bg-blue-400", bgColor: "bg-blue-400/10", textColor: "text-blue-400" },
  ADMIN: { label: "Admin", dotColor: "bg-blue-400", bgColor: "bg-blue-400/10", textColor: "text-blue-400" },
  SUPER_ADMIN: { label: "Super Admin", dotColor: "bg-purple-400", bgColor: "bg-purple-400/10", textColor: "text-purple-400" },
  UP: { label: "Activo", dotColor: "bg-emerald-400", bgColor: "bg-emerald-400/10", textColor: "text-emerald-400" },
  DOWN: { label: "Caido", dotColor: "bg-red-400", bgColor: "bg-red-400/10", textColor: "text-red-400" },
  DEGRADED: { label: "Degradado", dotColor: "bg-yellow-400", bgColor: "bg-yellow-400/10", textColor: "text-yellow-400" },
};

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        config.bgColor,
        config.textColor
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );
}
