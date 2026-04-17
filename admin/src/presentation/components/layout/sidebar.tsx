"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Activity,
  FileText,
  Settings,
  BookOpen,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavItem } from "./nav-item";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/documents", label: "Documentos Legales", icon: BookOpen },
  { href: "/scraping", label: "Fuentes Legales", icon: Globe },
  { href: "/chat-sessions", label: "Sesiones de Chat", icon: MessageSquare },
  { href: "/audit-logs", label: "Logs de Auditoria", icon: FileText },
  { href: "/prompts", label: "Gestion de Prompts", icon: Settings },
  { href: "/system", label: "Estado del Sistema", icon: Activity },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[rgba(43,94,167,0.08)] bg-[#0a1628] transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-[rgba(43,94,167,0.08)] px-4">
        {collapsed ? (
          <div className="mx-auto text-base font-bold text-[#e2e8f0]" style={{ fontFamily: "var(--font-heading)" }}>
            G
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a3a5c] text-xs font-bold text-white">
              GGM
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-[#e2e8f0]" style={{ fontFamily: "var(--font-heading)" }}>
                GGM Law Firm
              </p>
              <p className="text-[9px] uppercase tracking-[0.12em] text-[#475569]">
                Admin Panel
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 mt-2">
        {!collapsed && (
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#334155]">
            Menu
          </p>
        )}
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <Separator className="bg-[rgba(43,94,167,0.08)]" />
      <div className="p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl p-2 text-[#475569] transition-colors hover:bg-[rgba(43,94,167,0.08)] hover:text-[#94a3b8]"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
