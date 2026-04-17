"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
}

export function NavItem({ href, label, icon: Icon, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
        isActive
          ? "bg-[#2b5ea7]/15 text-[#60a5fa] border border-[#2b5ea7]/20"
          : "text-[#64748b] hover:bg-[rgba(43,94,167,0.06)] hover:text-[#94a3b8] border border-transparent"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive ? "text-[#3b82f6]" : "text-[#475569] group-hover:text-[#64748b]"
        )}
      />
      {!collapsed && <span>{label}</span>}
      {isActive && !collapsed && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3b82f6] pulse-brand" />
      )}
    </Link>
  );
}
